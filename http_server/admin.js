const login = require('./login.js');

class Admin {
    constructor(http_server, ws, req) {
        this.http_server = http_server;
        this.ws = ws;
        this.req = req;
        
        this.ws.on('message', (data) => {
            let json = JSON.parse(data);
            
            if (json.action == 'login') {
                this.login(json.username, json.password);
            }
            
            if (this.username) {
                // Logged in
                
                if (json.action == 'periodlist') {
                    this.sendPeriodList();
                } else if (json.action == 'sportlist') {
                    this.sendSportList(json.periodid);
                } else if (json.action == 'sportinfo') {
                    this.sendSportInfo(json.periodid, json.sportid);
                }
            }
        });
    }
    
    send(json) {
        this.ws.send(JSON.stringify(json));
    }
    
    login(username, password) {
        login.loginAdmin(username, password, (username, error) => {
            if (error) {
                this.send({action: 'login', error: error});
            } else {
                this.username = username;
                this.send({action: 'login', username: username});
                this.sendGroups();
            }
        });
    }
    
    sendGroups() {
        let json = {action: 'groups', groups: []};
        
        for (let user in this.http_server.groups) {
            this.http_server.groups[user].forEach(group => {
                if (!~json.groups.indexOf(group)) {
                    json.groups.push(group);
                }
            });
        }
        
        json.groups.sort();
        
        this.send(json);
    }
    
    sendPeriodList() {
        let json = {action: 'periodlist', periodlist: []};
        
        this.http_server.periods.forEach((period, index) => {
            json.periodlist.push({
                periodid: index,
                name: period.name,
                opens: period.opens,
                closes: period.closes
            });
        });
        
        this.send(json);
    }
    
    sendSportList(periodid) {
        let period = this.http_server.periods[periodid];
        
        let json = {action: 'sportlist', sportlist: [], period: {
            periodid: period.periodid,
            name: period.name,
            description: period.description,
            opens: period.opens,
            closes: period.closes
        }};
        
        period.sports.forEach((sport, index) => {
            json.sportlist.push({
                sportid: index,
                name: sport.name,
                maxusers: sport.maxusers,
                users: sport.users.length
            });
        });
        
        this.send(json);
    }
    
    sendSportInfo(periodid, sportid) {
        let period = this.http_server.periods[periodid];
        let sport = period.sports[sportid];
        
        let json = {action: 'sportinfo', period: {
            periodid: period.periodid
        }, sport: {
            sportid: sport.sportid,
            name: sport.name,
            description: sport.description,
            maxusers: sport.maxusers,
            allowed: sport.allowed,
            users: sport.users
        }};
        
        this.send(json);
    }
}

module.exports = (http_server) => {
    return (ws, req) => new Admin(http_server, ws, req);
}