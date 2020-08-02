const fs = require('fs');

fs.mkdir('data', err => {
    // Errors will get throw when saving if the directory failed to make
});

let DEFAULT_PERIOD = {
    name: 'Unnamed selection period',
    description: '',
    opens: 0,
    closes: 0,
    sports: [],
    selections: {}
};

let DEFAULT_SPORT = {
    name: 'Unnamed sport',
    description: '',
    maxusers: 0,
    allowed: [],
    users: []
};

class DatabaseServer {
    constructor(workers) {
        this.needsSaving = true;
        this.cookies = {};
        this.workers = workers;
        this.periods = [];
        this.groups = {};
        
        this.workers.forEach(worker => this.registerWorker(worker));
        
        this.loadPeriods();
        this.loadGroups();

        console.log(`Database server on master ${process.pid}`);
        
        setInterval(this.writeToDisk.bind(this), 1000);
    }
    
    loadPeriods() {
        fs.readFile('data/periods.json', (err, data) => {
            if (err) {
                return console.error(err);
            }
            
            this.periods = JSON.parse(data);
            
            this.periods.forEach((period, periodid) => {
                period.periodid = periodid;
                
                for (let key in DEFAULT_PERIOD) {
                    if (!period[key]) {
                        period[key] = this.clone(DEFAULT_PERIOD[key]);
                    }
                }
                
                period.sports.forEach((sport, sportid) => {
                    sport.sportid = sportid;

                    for (let key in DEFAULT_SPORT) {
                        if (!sport[key]) {
                            sport[key] = this.clone(DEFAULT_SPORT[key]);
                        }
                    }
                
                    sport.users.forEach(user => {
                        period.selections[user] = sportid;
                    });
                });
            });
            
            this.broadcastMessage({action: 'setperiods', value: this.periods});
            
            console.log('Loaded periods');
        });
    }
    
    loadGroups() {
        fs.readFile('data/groups.json', (err, data) => {
            if (err) {
                return console.error(err);
            }
            
            this.groups = JSON.parse(data);
        
            this.broadcastMessage({action: 'setgroups', value: this.groups});
            
            console.log('Loaded groups');
        });
    }
    
    writeToDisk() {
        if (this.needsSaving) {
            this.needsSaving = false;
            
            fs.writeFile('data/periods.json', JSON.stringify(this.periods), err => {
                if (err) {
                    throw err;
                }
            });
            
            fs.writeFile('data/groups.json', JSON.stringify(this.groups), err => {
                if (err) {
                    throw err;
                }
            });
        }
    }
    
    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    registerWorker(worker) {
        worker.on('message', json => {
            if (json.action == 'setcookie') {
                this.cookies[json.key] = json.value;
                this.workers.forEach(otherWorker => otherWorker != worker ? otherWorker.send(json) : null);
            } else if (json.action == 'clustertest') {
                json.string = json.string.split('').reverse().join('');
                worker.send(json);
            } else if (json.action == 'selectsport') {
                json.success = this.addUserToSport(json.periodid, json.sportid, json.username);
                worker.send(json);
            } else if (json.action == 'createperiod') {
                json.periodid = this.createPeriod(json.name, json.description, json.opens, json.closes);
                worker.send(json);
            } else if (json.action == 'createsport') {
                json.sportid = this.createSport(json.periodid, json.name, json.description, json.maxusers, json.allowed);
                worker.send(json);
            } else if (json.action == 'updateperiod') {
                this.updatePeriod(json.periodid, json.name, json.description, json.opens, json.closes);
                worker.send(json);
            } else if (json.action == 'updatesport') {
                this.updateSport(json.periodid, json.sportid, json.name, json.description, json.maxusers, json.allowed);
                worker.send(json);
            }
        });
    }
    
    broadcastMessage(json) {
        this.workers.forEach(worker => worker.send(json));
    }

    createPeriod(name, description, opens, closes) {
        let period = this.clone(DEFAULT_PERIOD);

        period.name = name;
        period.description = description;
        period.opens = opens;
        period.closes = closes;

        period.periodid = this.periods.push(period) - 1;
        
        this.needsSaving = true;

        this.broadcastMessage({action: 'addperiod', value: period});

        return period.periodid;
    }

    createSport(periodid, name, description, maxusers, allowed) {
        let sport = this.clone(DEFAULT_SPORT);

        sport.name = name;
        sport.description = description;
        sport.maxusers = maxusers;
        sport.allowed = allowed;

        sport.sportid = this.periods[periodid].sports.push(sport) - 1;
        
        this.needsSaving = true;

        this.broadcastMessage({action: 'addsport', periodid: periodid, value: sport});

        return sport.sportid;
    }

    updatePeriod(periodid, name, description, opens, closes) {
        let period = this.periods[periodid];

        period.name = name;
        period.description = description;
        period.opens = opens;
        period.closes = closes;
        
        this.needsSaving = true;

        this.broadcastMessage({action: 'addperiod', value: period});
    }

    updateSport(periodid, sportid, name, description, maxusers, allowed) {
        let sport = this.periods[periodid].sports[sportid];

        sport.name = name;
        sport.description = description;
        sport.maxusers = maxusers;
        sport.allowed = allowed;
        
        this.needsSaving = true;

        this.broadcastMessage({action: 'addsport', periodid: periodid, value: sport});
    }
    
    addUserToSport(periodid, sportid, username) {
        let period = this.periods[periodid];
        
        let sport = period.sports[sportid];
        
        if (sport.users.length >= sport.maxusers) {
            return false;
        }
        
        if (username in period.selections) {
            let removeFromSport = period.sports[period.selections[username]];
            
            if (removeFromSport) {
                let index = removeFromSport.users.indexOf(username);
                
                if (~index) {
                    removeFromSport.users.splice(index, 1);
                    
                    this.broadcastMessage({action: 'removeselection', periodid: periodid, sportid: period.selections[username], user: username});
                }
            }
        }
        
        sport.users.push(username);
        period.selections[username] = sportid;
        
        console.log(`${username} has selected ${period.name}: ${sport.name}`);
        
        this.needsSaving = true;
        
        this.broadcastMessage({action: 'setselection', periodid: periodid, sportid: sportid, user: username});
        
        return true;
    }
};

module.exports = DatabaseServer;