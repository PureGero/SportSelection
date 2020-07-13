const fs = require('fs');

fs.mkdir('data', err => {
    // Errors will get throw when saving if the directory failed to make
});

let DEFAULT_PERIOD = {
    name: 'Unnamed selection period',
    description: 'A selection period',
    opens: 0,
    closes: 0,
    sports: [],
    selections: {}
};

let DEFAULT_SPORT = {
    name: 'Unnamed sport',
    description: 'A sport',
    maxusers: 0,
    allowed: [],
    users: []
};

class DatabaseServer {
    constructor(workers) {
        this.needsSaving = true;
        this.cookies = {};
        this.workers = workers;
        this.periods = [
            {
                name: '2020 Junior Sport Selection',
                opens: 1594652644139,
                closes: 1594706431268,
                sports: [
                    {
                        name: 'Ball Games',
                        description: 'Play a variety of ball-based sports',
                        maxusers: 5,
                        allowed: ['testgroup'],
                        users: []
                    },
                    {
                        name: 'Tennis',
                        description: 'Play casual tennis on the Cavendish Road SHS tennis courts',
                        maxusers: 3,
                        allowed: ['testgroup'],
                        users: []
                    },
                ],
                selections: {},
            },
            {
                name: '2020 Senior Sport Selection',
                opens: 1594652644139,
                closes: 1594706431268,
                sports: [
                    {
                        name: 'Ball Games',
                        description: 'Play a variety of ball-based sports',
                        maxusers: 5,
                        allowed: ['testgroup'],
                        users: []
                    },
                    {
                        name: 'Tennis',
                        description: 'Play casual tennis on the Cavendish Road SHS tennis courts',
                        maxusers: 3,
                        allowed: ['testgroup'],
                        users: []
                    },
                ],
                selections: {},
            },
        ];
        this.groups = {
            'test': ['testgroup'],
            'test2': ['testgroup'],
            'testadmin': ['admin'],
        };
        
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
            }
        });
    }
    
    broadcastMessage(json) {
        this.workers.forEach(worker => worker.send(json));
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
        
        this.needsSaving = true;
        
        this.broadcastMessage({action: 'setselection', periodid: periodid, sportid: sportid, user: username});
        
        return true;
    }
};

module.exports = DatabaseServer;