#!/bin/bash

# This script is designed for CentOS 8, it may or may not work on other systems

cd `dirname "$0"`

# Install node
if ! command -v node &> /dev/null
then
    echo "Installing nodejs..."
    dnf install nodejs -y
fi

# Install python cause one of the dependencies needs it?
if ! command -v python3 &> /dev/null
then
    echo "Installing python..."
    yum install python38 -y
fi

# Install make cause the same dependency needs it?
if ! command -v make &> /dev/null
then
    echo "Installing gcc..."
    dnf group install "Development Tools" -y
fi

# Install npm packages
echo "Installing library..."
npm install

# Create service
echo "Installing service..."
echo "[Unit]" > /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "Description=Sport Selection server daemon" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "After=network.target" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "[Service]" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "ExecStart=/usr/bin/node `pwd`" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "ExecReload=/bin/kill -HUP $MAINPID" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "KillMode=process" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "Restart=on-failure" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "RestartSec=15s" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "[Install]" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "WantedBy=multi-user.target" >> /etc/systemd/system/multi-user.target.wants/sportselection.service

cp -n config.default.json config.json

# Enable the service
systemctl daemon-reload
systemctl enable /etc/systemd/system/multi-user.target.wants/sportselection.service

echo "Installed."
echo "Start the service with"
echo "> sudo systemctl start sportselection.service"
