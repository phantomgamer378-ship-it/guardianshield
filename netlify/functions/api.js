/**
 * netlify/functions/api.js
 * ────────────────────────────────────────────────────────────────────────────
 * Single Netlify Function that wraps the entire Express app via serverless-http.
 * ALL /api/* calls are routed here by netlify.toml.
 *
 * Every request arrives as:
 *   /.netlify/functions/api/<route>   →  express router picks it up normally
 * ────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const serverless   = require('serverless-http');
const multer       = require('multer');

// ── shared sub-modules (same code as local server) ─────────────────────────
const authRoutes   = require('../../server/routes/auth.routes');
const phoneRoutes  = require('../../server/routes/phone.routes');
const videoRoutes  = require('../../server/routes/video.routes');
const reportRoutes = require('../../server/routes/report.routes');
const userRoutes   = require('../../server/routes/user.routes');

const errorMiddleware = require('../../server/middleware/error.middleware');

// ── use in-memory storage for multer (no writable disk in Lambda) ───────────
const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── mount routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/phone',  phoneRoutes);
app.use('/api/video',  videoRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/user',   userRoutes);

app.get('/api',     (_req, res) => res.json({ message: 'GuardianShield API v1.0' }));
app.get('/health',  (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use(errorMiddleware);

// Export the serverless handler
module.exports.handler = serverless(app);
