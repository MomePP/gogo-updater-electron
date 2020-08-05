#!/bin/sh
echo "add udev rules for gogoboard"
sudo cp /opt/GoGo\ Updater/resources/deb-script/51-gogo-udev.rules /etc/udev/rules.d && sudo udevadm control -R
