#!/bin/bash

# This stops all gunicorn, nginx and 4store processes 
#   running on the server. If you have these services running 
#   independent of your DM installation do NOT run this script.


sudo kill $(ps aux | grep '[g]unicorn' | awk '{print $2}')
echo -e "Stopped Gunicorn.\n"

sudo kill $(ps aux | grep '[n]ginx' | awk '{print $2}')
echo -e "Stopped Nginx.\n"

sudo kill $(ps aux | grep '[4]s' | awk '{print $2}')
echo -e "Stopped 4store.\n"