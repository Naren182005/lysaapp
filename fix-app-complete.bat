@echo off
echo ===================================================
echo GRADE SCAN SCRIBE AI - COMPLETE FIX SCRIPT
echo ===================================================
echo.

echo Step 1: Stopping any running Node.js processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak > nul

echo Step 2: Clearing Vite cache...
if exist node_modules\.vite (
  rmdir /s /q node_modules\.vite
)

echo Step 3: Clearing dist directory...
if exist dist (
  rmdir /s /q dist
)

echo Step 4: Updating port configuration...
echo Updating server/.env...
(
  echo # Server configuration
  echo PORT=3001
  echo NODE_ENV=development
  echo.
  echo # API Keys
  echo OCR_API_KEY=256DF5A5-1D99-45F9-B165-1888C6EB734B
  echo HUGGINGFACE_API_TOKEN=your_huggingface_token_here
  echo OPENAI_API_KEY=your_openai_api_key_here
  echo GROQ_API_KEY=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
  echo TOGETHER_API_KEY=e9258f2823b9179bcdd80298d2c4e9928c2f97d780a682afb23c36c7535922a1
  echo.
  echo # Other configuration
  echo VITE_API_BASE_URL=http://localhost:3001/api
) > server/.env

echo Updating src/config/apiConfig.ts...
(
  echo /**
  echo  * API configuration
  echo  *
  echo  * This file contains the configuration for API endpoints.
  echo  * It uses environment variables to determine the base URL.
  echo  */
  echo.
  echo // Get the API base URL from environment variables
  echo // In development, this will be set by Vite from .env file
  echo // In production, this will be set during the build process
  echo export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  echo.
  echo // API endpoints
  echo export const API_ENDPOINTS = {
  echo   OCR: `${API_BASE_URL}/ocr`,
  echo   MODEL: `${API_BASE_URL}/model`,
  echo   CONNECTIVITY: `${API_BASE_URL}/connectivity`,
  echo   EVALUATE_ANSWER: `${API_BASE_URL}/evaluate-answer`,
  echo   OPENAI: `${API_BASE_URL}/openai`
  echo };
  echo.
  echo // OCR API configuration
  echo export const OCR_API_KEY = "256DF5A5-1D99-45F9-B165-1888C6EB734B"; // OCR API key
  echo.
  echo // OpenAI API configuration
  echo export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "your_openai_api_key_here"; // OpenAI API key
  echo export const DEFAULT_OPENAI_MODEL = "gpt-3.5-turbo"; // Default OpenAI model
  echo export const OPENAI_MODELS = ["gpt-3.5-turbo", "gpt-4"]; // Available OpenAI models
  echo.
  echo // Default model to use for all operations
  echo export const DEFAULT_MODEL = "openai"; // Using OpenAI as the primary model
) > src/config/apiConfig.ts

echo Step 5: Creating .env file in root directory...
(
  echo VITE_API_BASE_URL=http://localhost:3001/api
  echo OCR_API_KEY=256DF5A5-1D99-45F9-B165-1888C6EB734B
  echo OPENAI_API_KEY=your_openai_api_key_here
) > .env

echo Step 6: Installing dependencies...
call npm install

echo Step 7: Starting the backend server...
start cmd /k "npm run server"

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Step 8: Starting the frontend application...
start cmd /k "npm run dev"

echo.
echo ===================================================
echo SETUP COMPLETE!
echo ===================================================
echo.
echo If everything worked correctly:
echo - Backend server should be running at http://localhost:3001
echo - Frontend application should be running at http://localhost:5173
echo.
echo Please open your browser to http://localhost:5173
echo.
echo If you still see a blank page:
echo 1. Open browser developer tools (F12)
echo 2. Check the Console tab for errors
echo 3. Check the Network tab for failed requests
echo ===================================================

timeout /t 5 /nobreak > nul
start http://localhost:5173
