const cookieParser = require('cookie-parser');
const express = require('express');
const path = require('path');

const login = require('./login.js');

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class HttpServer {
    constructor(port) {
        this.app = express();
        this.callbacks = {};
        this.cookies = {};
        
        this.setupDatabaseConnection();
        this.setupExpress();
        
        this.app.listen(port, () => {
            console.log(`Express server listening on port ${port} and worker ${process.pid}`);
        });
    }
    
    setupDatabaseConnection() {
        process.on('message', json => {
            if (json.action == 'setcookie') {
                this.cookies[json.key] = json.value;
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
    
        this.app.get('/clustertest', this.clusterTest.bind(this));
        this.app.get('/serverinfo', this.serverinfo.bind(this));
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
        res.send({server_id: process.pid, biscuit: req.cookies.biscuit, username: this.cookies[req.cookies.biscuit]});
    }
    
    login(req, res) {
        let username = req.body.username;
        
        login(username, req.body.password, (success, error) => {
            if (success === true) {
                let key = uuidv4();
                this.cookies[key] = username;
                this.messageDatabase({action: 'setcookie', key: key, value: username});
                res.cookie('biscuit', key, {maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: 'Strict'});
            }
        
            res.send({success: success, error: error});
        });
    }
};

module.exports = HttpServer;