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

# Install npm packages
npm install

# Create service
echo "[Unit]" > /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "Description=Sport Selection server daemon" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "After=network.target" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "[Service]" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "ExecStart=/usr/bin/node `dirname "$0"`" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "ExecReload=/bin/kill -HUP $MAINPID" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "KillMode=process" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "[Install]" >> /etc/systemd/system/multi-user.target.wants/sportselection.service
echo "WantedBy=multi-user.target" >> /etc/systemd/system/multi-user.target.wants/sportselection.service

# Enable and start service
systemctl enable sportselection.service
systemctl start sportselection.service