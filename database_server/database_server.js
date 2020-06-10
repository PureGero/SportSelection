class DatabaseServer {
    constructor(workers) {
        this.cookies = {};
        this.workers = workers;
        
        this.workers.forEach(worker => this.registerWorker(worker));

        console.log(`Database server on master ${process.pid}`);
    }
    
    registerWorker(worker) {
        worker.on('message', json => {
            if (json.action == 'setcookie') {
                this.cookies[json.key] = json.value;
                this.workers.forEach(otherWorker => otherWorker != worker ? otherWorker.send(json) : null);
            } else if (json.action == 'clustertest') {
                json.string = json.string.split('').reverse().join('');
                worker.send(json);
            }
        });
    }
};

module.exports = DatabaseServer;