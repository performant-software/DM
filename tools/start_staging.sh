#!/bin/bash

# IMPT: This must be run in the DM root directory.
#
# Current staging URL: dm.performantsoftware.com


sudo gunicorn wsgi:application &
echo -e "Started gunicorn.\n"

sudo /etc/init.d/nginx start
echo -e "Started Nginx.\n"

sudo 4s-backend dm
sudo 4s-httpd -p 8888 -D dm &
echo -e "Started 4store on port 8888.\n"