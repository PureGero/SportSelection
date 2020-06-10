class DatabaseServer {
    constructor(workers) {
        workers.forEach(worker => this.registerWorker(worker));

        console.log(`Database server on master ${process.pid}`);
    }
    
    registerWorker(worker) {
        worker.on('message', msg => {
            msg.string = msg.string.split('').reverse().join('');
            worker.send(msg);
        });
    }
};

module.exports = DatabaseServer;