#!/bin/bash

# This script is designed for CentOS 8, it may or may not work on other systems

# Install node
if ! command -v node &> /dev/null
then
    echo "Installing nodejs..."
    dnf install nodejs
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