/**
 * Grade Scan Scribe AI - Server
 * 
 * This is the main server file that sets up the Express server
 * and configures middleware and routes.
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

// Create Express app
const app = express();

// Get port from environment variables or use default
const PORT = process.env.PORT || 3001;

// Configure middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Grade Scan Scribe AI Server is running');
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Health check at http://localhost:${PORT}/health`);
  
  // Log environment variables (excluding sensitive information)
  console.log('\nEnvironment variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('PORT:', process.env.PORT || 'not set (using default: 3001)');
  console.log('OCR_API_KEY:', process.env.OCR_API_KEY ? 'Set ✓' : 'Not set ✗');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set ✓' : 'Not set ✗');
  console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Set ✓' : 'Not set ✗');
  console.log('TOGETHER_API_KEY:', process.env.TOGETHER_API_KEY ? 'Set ✓' : 'Not set ✗');
});

// Export the app for testing
module.exports = app;
