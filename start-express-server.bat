@echo off
echo Starting Grade Scan Scribe AI Express Server...
echo.

echo NOTE: This script will use the API keys from the .env file.
echo Make sure you have set valid API keys in the .env file.
echo.

set PORT=3000

echo Starting server...
node express-server.mjs

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Server exited with error code %ERRORLEVEL%
  pause
)
