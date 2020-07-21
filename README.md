Installing on Cent OS 8
==========
Some of these instructions may work on other flavours of unix, and others may
not.

Install `git` with

    sudo yum install git -y

Download the sport selection program with

    git clone https://github.com/PureGero/SportSelection.git

Install the program with

    sudo SportSelection/install.sh

Then edit the config with (be sure to set the email address and website
hostnames).
You'll also need to accept Let's Encrypt's terms of service for the https
certificate (https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf).

    vim SportSelection/config.json

Start the service with

    sudo systemctl start sportselection.service

There might be a firewall installed, add port 80 and 443 to it with

    sudo firewall-cmd --zone=public --permanent --add-port=80/tcp --add-port=443/tcp
    sudo firewall-cmd --reload

It's now all set up and good to go!

Log in to the admin console at `http://SERVERNAME/admin.html` to get started.