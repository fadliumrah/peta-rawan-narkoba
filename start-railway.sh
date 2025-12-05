#!/bin/sh

# Ensure data directory exists and has correct permissions
mkdir -p /app/data
chmod 755 /app/data

# Start the application
node server.js
