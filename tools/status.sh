#!/bin/bash

# Shows all gunicorn, nginx and 4s processes
#   currently running. They may or may NOT be 
#   related to your DM installation.


echo -e "\nChecking for running gunicorn processes..."
ps aux | grep gunicorn

echo -e "\nChecking for running nginx processes..."
ps aux | grep nginx

echo -e "\nChecking for running 4s processes..."
ps aux | grep 4s