@echo off
echo Starting Grade Scan Scribe AI with Mock Hugging Face API...
echo.

echo This script will start both the Mock Hugging Face API server and the frontend application.
echo.

echo Starting Mock Hugging Face API server...
start cmd /k "node mock-huggingface-server.js"

echo Waiting for Mock Hugging Face API server to start...
timeout /t 5 /nobreak > nul

echo Starting frontend application...
start cmd /k "npm run dev"

echo.
echo Application started!
echo Mock Hugging Face API server is running at http://localhost:3002/
echo Frontend application is running at http://localhost:8080/
echo.
echo You can now use the application with the mock Hugging Face API.
echo.
