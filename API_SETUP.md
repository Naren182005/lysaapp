# API Key Setup Guide

This document explains how to set up the required API key for the Grade Scan Scribe AI application.

## Required API Key

The application requires the following API key:

1. **OCR API Key** - Used for optical character recognition (OCR) to extract text from images

## Setting Up Your API Key

### Step 1: Create a `.env` file

The application uses a `.env` file to store the API key securely. If you don't already have one, copy the `.env.example` file and rename it to `.env`.

#### OCR API Key

1. Go to [OCR.space](https://ocr.space/ocrapi)
2. Sign up for a free API key
3. Copy the API key provided in your email or dashboard

### Step 3: Update Your `.env` File

Open your `.env` file and update the following variable:

```
# API Key - Replace with your valid API key
OCR_API_KEY=your_ocr_api_key_here
```

Replace the placeholder value with your actual OCR API key.

### Step 4: Restart the Server

After updating your `.env` file, restart the server for the changes to take effect:

1. Stop any running server instances
2. Run the appropriate start script for your server:
   - `start-server.bat` for the main server
   - `start-express-server.bat` for the Express server
   - `start-simple-server.bat` for the simple server

## Troubleshooting

### API Key Authentication Errors

If you see authentication errors in the console:

1. Double-check that you've entered the correct API keys in the `.env` file
2. Ensure there are no extra spaces or characters in your API keys
3. Verify that your API keys are still valid and have not expired
4. Check if you have sufficient credits or quota for the API services

### Server Not Loading Environment Variables

If the server is not picking up your environment variables:

1. Make sure the `.env` file is in the correct location (root directory of the project)
2. Try setting the environment variables directly in your terminal/command prompt
3. Check if the server is configured to load the `.env` file correctly

## Security Notes

- Never commit your `.env` file to version control
- Do not share your API keys with others
- Consider using environment variables for production deployments
- Rotate your API keys periodically for better security

## Additional Resources

- [OCR.space API Documentation](https://ocr.space/ocrapi)
