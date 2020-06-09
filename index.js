const express = require('express');
const os = require('os');
const cluster = require('cluster');
const path = require('path');

const PORT = 3000;

const clusterWorkerSize = os.cpus().length;

if (cluster.isMaster) {
    for (let i = 0; i < clusterWorkerSize; i++) {
        let worker = cluster.fork();
        
        worker.on('message', msg => {
            msg.string = msg.string.split('').reverse().join('');
            worker.send(msg);
        });
    }

    cluster.on('exit', worker => {
        console.log('Worker ', worker.id, ' has exited.');
    })
    
    // TODO Insert database server here
    console.log(`Database server on master ${process.pid}`);
    
} else {
    const app = express();
    
    let callbacks = {};
    
    process.on('message', msg => {
        let callback = callbacks[msg.id];
        if (callback) {
            callback(msg);
        }
    });

    //app.get('/', (req, res) => res.send('Hello World!'));

    app.get('/clustertest', (req, res) => {
        let id = Math.random();
        callbacks[id] = (msg) => {
            res.send(msg.string);
        };
        process.send({id: id, string: 'Hello'});
    });
    
    app.use(express.static(path.join(__dirname, 'public')));
 
    app.listen(PORT, () => {
        console.log(`Express server listening on port ${PORT} and worker ${process.pid}`);
    });
}
