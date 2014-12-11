#!/bin/bash

# IMPT: This must be run in the DM root directory.
# IMPT: The port number on 4store in production is 8083
#
# Current production URL: dm-server.library.upenn.edu


sudo gunicorn wsgi:application &
echo -e "Started gunicorn.\n"

sudo /etc/init.d/nginx start
echo -e "Started Nginx.\n"

sudo 4s-backend dm
sudo 4s-httpd -p 8083 -D dm &
echo -e "Started 4store on port 8083.\n"