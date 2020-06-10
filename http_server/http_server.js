const express = require('express');
const path = require('path');

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
        process.on('message', msg => {
            let callback = this.callbacks[msg.id];
            if (callback) {
                callback(msg);
            }
        });
    }
    
    setupExpress() {
        this.app.get('/clustertest', this.clusterTest.bind(this));
    
        this.app.use(express.static('public'));
    }
    
    clusterTest(req, res) {
        let id = Math.random();
        this.callbacks[id] = (msg) => {
            res.send(msg.string);
        };
        process.send({id: id, string: 'Hello'});
    }
};

module.exports = HttpServer;