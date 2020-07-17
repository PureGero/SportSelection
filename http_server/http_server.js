const cookieParser = require('cookie-parser');
const express = require('express');
const formData = require("express-form-data");
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const login = require('./login.js');

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class HttpServer {
    constructor(config) {
        this.app = express();
        this.callbacks = {};
        this.cookies = {};
        this.periods = {};
        this.groups = {};
        
        this.setupDatabaseConnection();
        this.setupExpress();
        
        let httpPort = config.http.port;
        let httpsPort = config.https.port;
        
        let httpServer = http.createServer(!config.http.upgradeToHttps ? this.app : (req, res) => {
            let host = req.headers.host;
            
            if (!host) {
                return res.end();
            }
            
            // Remove port
            if (host.indexOf(':') >= 0) {
                host = host.substr(0, host.indexOf(':'));
            }
            
            // Add port
            if (httpsPort != 443) {
                host = host + ':' + httpsPort;
            }
            
            res.writeHead(307, {'Location': 'https://' + host + req.url});
            res.end();
        });

        httpServer.listen(httpPort, err => {
            if (err) {
                throw err;
            }
        
            console.log(`Express http server listening on port ${httpPort} as worker ${process.pid}`);
        });
        
        try {
            let privateKey  = fs.readFileSync(config.https.privateKey, 'utf8');
            let certificate = fs.readFileSync(config.https.certificate, 'utf8');

            let credentials = {key: privateKey, cert: certificate};
        
            let httpsServer = https.createServer(credentials, this.app);
        
            httpsServer.listen(httpsPort, err => {
                if (err) {
                    throw err;
                }
        
                console.log(`Express https server listening on port ${httpsPort} as worker ${process.pid}`);
            });
        } catch (err) {}
    }
    
    setupDatabaseConnection() {
        process.on('message', json => {
            if (json.action == 'setcookie') {
                this.cookies[json.key] = json.value;
            } else if (json.action == 'setperiods') {
                this.periods = json.value;
            } else if (json.action == 'setgroups') {
                this.groups = json.value;
            } else if (json.action == 'setselection') {
                this.periods[json.periodid].sports[json.sportid].users.push(json.user);
                this.periods[json.periodid].selections[json.user] = json.sportid;
            } else if (json.action == 'removeselection') {
                let users = this.periods[json.periodid].sports[json.sportid].users;
                let index = users.indexOf(json.user);
                
                if (~index) {
                    users.splice(users.indexOf(json.user), 1);
                } else {
                    console.error('Database/Http Server desync, could not remove ' + json.user + ' from sport periodid=' + json.periodid + ',sportid=' + json.sportid + ' as they are not already added');
                }
                
                delete this.periods[json.periodid].selections[json.user];
            }
        
            if (json.__id) {
                let callback = this.callbacks[json.__id];
                if (callback) {
                    callback(json);
                }
                delete this.callbacks[json.__id];
            }
        });
    }
    
    setupExpress() {
        this.app.use(express.urlencoded({extended: true}));
        this.app.use(cookieParser());
        this.app.use(formData.parse());
    
        this.app.get('/clustertest', this.clusterTest.bind(this));
        this.app.get('/listsports', this.listsports.bind(this));
        this.app.get('/serverinfo', this.serverinfo.bind(this));
        
        this.app.post('/listsports', this.listsports.bind(this));
        this.app.post('/login', this.login.bind(this));
    
        this.app.use(express.static('public'));
    }
    
    messageDatabase(json, callback) {
        if (callback) {
            json.__id = Math.random();
            this.callbacks[json.__id] = callback;
        }
        
        process.send(json);
    }
    
    clusterTest(req, res) {
        this.messageDatabase({action: 'clustertest', string: 'Hello'}, json => {
            res.send(json.string);
        });
    }
    
    serverinfo(req, res) {
        let username = this.cookies[req.cookies.biscuit];
        res.send({server_pid: process.pid, biscuit: req.cookies.biscuit, username: username, groups: this.groups[username]});
    }
    
    login(req, res) {
        if (!req.query.json) {
            // Not a javascript call, non-javascript isn't supported here
            return res.redirect('/');
        }
        
        let username = req.body.username;
        let password = req.body.password;
        
        if (!username || !password) {
            res.send({success: false, error: 'Please specify a username and password'});
        }
        
        login(username, password, (username, error) => {
            if (username) {
                let key = uuidv4();
                this.cookies[key] = username;
                this.messageDatabase({action: 'setcookie', key: key, value: username});
                res.cookie('biscuit', key, {maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: 'Strict'});
            }
            
            res.send({success: !!username, error: error});
        });
    }
    
    listsports(req, res) {
        let username = this.cookies[req.cookies.biscuit];
        
        if (!username) {
            return res.send({error: 'You are not logged in'});
        }
        
        if (req.body.periodid && req.body.sportid) {
            // They're trying to enroll!
            let period = this.periods[req.body.periodid];
            let sport = period.sports[req.body.sportid];
            
            if (sport.users.length < sport.maxusers && this.isAllowedInSport(username, sport) && this.isPeriodOpen(period)) {
                return this.messageDatabase({
                    action: 'selectsport',
                    username: username,
                    periodid: req.body.periodid,
                    sportid: req.body.sportid
                }, json => {
                    if (json.success) {
                        res.send({
                            selected: true,
                            period: {
                                periodid: period.periodid,
                                name: period.name,
                                description: period.description,
                                selected_name: sport.name
                            }
                        });
                    } else {
                        this.listSportsOrPeriods(req, res, username);
                    }
                });
            }
        }
        
        this.listSportsOrPeriods(req, res, username);
    }
        
    listSportsOrPeriods(req, res, username) {
        let now = Date.now();
        let period;
        
        if (!req.body.periodid) {
            let future_period = null;
            let open_periods = [];
            
            this.periods.forEach(period => {
                if (period.sports.some(sport => this.isAllowedInSport(username, sport))) {
                    if (period.closes < now) {
                        // Closed
                    } else if (period.opens < now) {
                        open_periods.push(period);
                    } else if (!future_period || period.opens < future_period.opens) {
                        future_period = period;
                    }
                }
            });
            
            if (open_periods.length == 1) {
                period = open_periods[0];
            } else if (open_periods.length == 0 && future_period) {
                return res.send({opens: future_period.opens});
            } else if (open_periods.length == 0) {
                return res.send({});
            } else {
                let periodlist = [];
                
                open_periods.forEach(period => {
                    periodlist.push({
                        periodid: period.periodid,
                        name: period.name,
                        description: period.description,
                        selected: period.selections[username]
                    });
                });
                
                return res.send({periodlist: periodlist});
            }
        } else {
            period = this.periods[req.body.periodid];
        }
        
        let sportlist = [];
        let selected = period.selections[username];
        
        period.sports.forEach((sport, sportid) => {
            if (this.isAllowedInSport(username, sport)) {
                this.addSportToList(sportlist, sport, sportid, selected == sportid);
            }
        });
        
        res.send({
            sportlist: sportlist,
            period: {
                periodid: period.periodid,
                name: period.name,
                description: period.description,
                selected_name: period.selections[username] ? period.sports[period.selections[username]].name : null
            }
        });
    }
    
    isPeriodOpen(period) {
        let now = Date.now();
        return period.opens < now && now < period.closes;
    }
    
    isAllowedInSport(username, sport) {
        let mygroups = this.groups[username];
        
        return ~sport.allowed.indexOf(username) || (mygroups && mygroups.some(group => {
            return ~sport.allowed.indexOf(group);
        }));
    }
    
    addSportToList(sportlist, sport, sportid, selected) {
        sportlist.push({
            sportid: sportid,
            name: sport.name,
            description: sport.description,
            remaining: sport.maxusers - sport.users.length,
            selected: selected
        });
    }
};

module.exports = HttpServer;