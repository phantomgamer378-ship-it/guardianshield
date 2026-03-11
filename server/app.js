require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const phoneRoutes = require('./routes/phone.routes');
const videoRoutes = require('./routes/video.routes');
const reportRoutes = require('./routes/report.routes');
const userRoutes = require('./routes/user.routes');

const errorMiddleware = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root route for API checks
app.get('/api', (req, res) => {
  res.json({ message: 'GuardianShield API v1.0' });
});

// Global Error Handler
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`GuardianShield server running on port ${PORT}`);
});
