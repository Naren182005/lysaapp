// Load environment variables from .env file
const dotenv = require('dotenv');
const path = require('path');

// Try to load from root directory first
dotenv.config();

// Then try to load from server directory if needed
dotenv.config({ path: path.join(__dirname, '.env') });

// Log environment variables for debugging (without showing full values)
console.log('Environment variables loaded:');
console.log('OCR_API_KEY:', process.env.OCR_API_KEY ? 'Set ✓' : 'Not set ✗');
console.log('HUGGINGFACE_API_TOKEN:', process.env.HUGGINGFACE_API_TOKEN ? 'Set ✓' : 'Not set ✗');

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// API routes
app.use('/api', apiRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
