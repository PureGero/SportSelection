const cluster = require('cluster');
const fs = require('fs');
const process = require('process');
const os = require('os');

process.chdir(__dirname);

if (!fs.existsSync('config.json')) {
    fs.copyFileSync('config.default.json', 'config.json');
}

const config = require('./config.json');

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
    
    if (config.httpsEnabled) {
        require('./acme-master.js')(config);
    }
    
} else {
    const HttpServer = require('./http_server/http_server.js');
    
    new HttpServer(config);
}
