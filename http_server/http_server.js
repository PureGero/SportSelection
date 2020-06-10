const express = require('express');
const path = require('path');

const login = require('./login.js');

class HttpServer {
    constructor(port) {
        this.app = express();
        this.callbacks = {};
        
        this.setupDatabaseConnection();
        this.setupExpress();
        
        this.app.listen(port, () => {
            console.log(`Express server listening on port ${port} and worker ${process.pid}`);
        });
    }
    
    setupDatabaseConnection() {
        process.on('message', json => {
            let callback = this.callbacks[json.__id];
            if (callback) {
                callback(json);
            }
        });
    }
    
    setupExpress() {
        this.app.use(express.urlencoded({extended: true}));
    
        this.app.get('/clustertest', this.clusterTest.bind(this));
        this.app.post('/login', this.login.bind(this));
    
        this.app.use(express.static('public'));
    }
    
    messageDatabase(json, callback) {
        json.__id = Math.random();
        this.callbacks[json.__id] = callback;
        process.send(json);
    }
    
    clusterTest(req, res) {
        this.messageDatabase({string: 'Hello'}, json => {
            res.send(json.string);
        });
    }
    
    login(req, res) {
        login(req.body.username, req.body.password, (success, error) => {
            res.send({success: success, error: error});
        });
    }
};

module.exports = HttpServer;