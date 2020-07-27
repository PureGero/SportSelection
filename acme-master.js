const acme_v2 = require('acme-v2');
const cluster = require('cluster');
const fs = require('fs');
const keypairs = require('@root/keypairs');
const pkg = require('./package.json');
const punycode = require('punycode');
const CSR = require('@root/csr');
const PEM = require('@root/pem');

let amce;
let serverKey;
let accountKey;
let account;

function notify(ev, msg) {
    if ('error' === ev || 'warning' === ev) {
        return console.error(ev.toUpperCase() + ' ' + msg.message);
    }
    
    // be brief on all others
    console.log(ev, msg.altname || '', msg.status || '');
}

function init(config) {
    // Why does ACME.js want my email and package details?
    let maintainerEmail = 'aj+acme-test@rootprojects.org'; //config.email;
    let packageAgent = 'test/v0'; //`${pkg.name}/${pkg.version}`;

    if (config.email.indexOf('@example')) {
        console.log('To setup automatic HTTPS certificates, edit config.json');
        return;
    }

    acme = acme_v2.create({ maintainerEmail, packageAgent, notify });
    
    acme.init('https://acme-v02.api.letsencrypt.org/directory').then(() => checkPrivKey(config));
}

function checkPrivKey(config) {
    fs.readFile('privkey.pem', 'ascii', (err, data) => {
        if (err) {
            return genPrivKey(config);
        }
        
        keypairs.import({ pem: data }).then(jwk => {
            serverKey = jwk;
            checkAccount(config);
        });
    });
}

function genPrivKey(config) {
    keypairs.generate({ kty: 'RSA', format: 'jwk' }).then(jwk => {
        serverKey = jwk.private;
        
        keypairs.export({ jwk: serverKey }).then(pem => {
            fs.writeFile('privkey.pem', pem, 'ascii', err => {
                if (err) {
                    return console.error(err);
                }
                
                checkAccount(config);
            });
        });
    });
}

function checkAccount(config) {
    fs.readFile('accountkey.pem', 'ascii', (err, data) => {
        if (err) {
            return genAccount(config);
        }
        
        keypairs.import({ pem: data }).then(jwk => {
            accountKey = jwk;
            checkCertificate(config);
        });
    });
}

function genAccount(config) {
    keypairs.generate({ kty: 'EC', format: 'jwk' }).then(jwk => {
        accountKey = jwk.private;
        
        keypairs.export({ jwk: accountKey }).then(pem => {
            fs.writeFile('accountkey.pem', pem, 'ascii', err => {
                if (err) {
                    return console.error(err);
                }
                
                checkCertificate(config);
            });
        });
    }).catch(console.error);
}

function checkCertificate(config) {
    let subscriberEmail = config.email;
    let agreeToTerms = config.acceptToS;
    
    acme.accounts.create({
        subscriberEmail,
        agreeToTerms,
        accountKey
    }).then(acc => {
        account = acc;
        console.info('Created ACME account with id', account.key.kid);
        
        let domains = config.hostnames.map(function(name) {
            return punycode.toASCII(name);
        });
        
        let encoding = 'der';
        let typ = 'CERTIFICATE REQUEST';

        CSR.csr({ jwk: serverKey, domains, encoding }).then(csrDer => {
            let csr = PEM.packBlock({ type: typ, bytes: csrDer });
            
            let challenges = {
                'http-01': require('acme-http-01-webroot').create({ webroot: '.well-known/acme-challenge' })
            };
            
            acme.certificates.create({
                account,
                accountKey,
                csr,
                domains,
                challenges
            }).then(pems => {
                let fullchain = pems.cert + '\n' + pems.chain + '\n';
                
                fs.writeFile('fullchain.pem', fullchain, 'ascii', err => {
                    if (err) {
                        return console.error(err);
                    }
                
                    console.info('Updated ./fullchain.pem - Restarting https servers');
                
                    Object.keys(cluster.workers).forEach(id => cluster.workers[id].send({
                        action: 'restartHttps'
                    }));
                });
            });
        });
    });
}

module.exports = init;