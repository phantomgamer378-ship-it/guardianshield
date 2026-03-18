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
app.use((req, res, next) => {
    // serverless-http/Netlify sometimes passes the body as a raw Buffer or String
    if (Buffer.isBuffer(req.body)) {
        try { req.body = JSON.parse(req.body.toString('utf8')); } catch (e) {}
    } else if (typeof req.body === 'string') {
        try { req.body = JSON.parse(req.body); } catch (e) {}
    }
    next();
});

app.use('/api/auth',   authRoutes);
app.use('/api/phone',  phoneRoutes);
app.use('/api/video',  videoRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/user',   userRoutes);

app.get('/api',     (_req, res) => res.json({ message: 'GuardianShield API v1.0' }));
app.post('/api/echo', (req, res) => res.json({ body: req.body, type: typeof req.body, isBuffer: Buffer.isBuffer(req.body) }));
app.get('/health',  (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use(errorMiddleware);

// Export the serverless handler
module.exports.handler = serverless(app);
