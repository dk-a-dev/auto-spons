const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Email routes
app.use('/api/email', require('./routes/email'));

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Auto-Spons API Documentation',
    endpoints: {
      email: {
        'POST /api/email/send': 'Send a single email',
        'POST /api/email/send-bulk': 'Send bulk emails',
        'POST /api/email/send-personalized-bulk': 'Send personalized bulk emails using templates',
        'POST /api/email/preview-personalized': 'Preview personalized email',
        'POST /api/email/test': 'Send test email',
        'GET /api/email/validate-config': 'Validate email configuration',
        'GET /api/email/template-guide': 'Get email template guide'
      },
    },
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Auto-Spons Backend',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(PORT, () => {
  console.log(`🚀 Auto-Spons Backend Server running on port ${PORT}`);
});

module.exports = app;
