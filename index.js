const cluster = require('cluster');
const os = require('os');

const PORT = 3000;

const clusterWorkerSize = os.cpus().length;

if (cluster.isMaster) {
    let workers = [];
    
    for (let i = 0; i < clusterWorkerSize; i++) {
        workers.push(cluster.fork());
    }

    cluster.on('exit', worker => {
        console.log('Worker ', worker.id, ' has exited.');
    });
    
    const DatabaseServer = require('./database_server/database_server.js');
    
    new DatabaseServer(workers);
    
} else {
    const HttpServer = require('./http_server/http_server.js');
    
    new HttpServer(PORT);
}
