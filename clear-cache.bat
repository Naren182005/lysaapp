@echo off
echo Stopping any running Vite servers...
taskkill /f /im node.exe

echo Clearing Vite cache...
rmdir /s /q node_modules\.vite

echo Restarting the server...
npm run dev
