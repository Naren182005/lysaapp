@echo off
echo Starting server with environment variables...
echo.
echo NOTE: This script will use the API keys from the .env file.
echo Make sure you have set valid API keys in the .env file.
echo.

cd server
node index.js
