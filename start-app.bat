@echo off
echo Starting Grade Scan Scribe AI...
echo.

echo This script will start both the Express server and the frontend application.
echo.

echo Starting Express server...
start cmd /k "npm run server"

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Starting frontend application...
start cmd /k "npm run dev"

echo.
echo Application started!
echo Express server is running at http://localhost:3000/
echo Frontend application is running at http://localhost:5173/
echo.
echo You can now use the application to scan any type of question paper and generate answers.
echo.
