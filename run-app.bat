@echo off
echo Starting Grade Scan Scribe AI application...

echo Stopping any running Node.js processes...
taskkill /f /im node.exe 2>nul

echo Installing dependencies...
call npm install

echo Starting the server...
start cmd /k "cd server && node index.js"

echo Starting the frontend...
start cmd /k "npm run dev"

echo Application started!
echo Server should be running on http://localhost:3000
echo Frontend should be running on http://localhost:8080
