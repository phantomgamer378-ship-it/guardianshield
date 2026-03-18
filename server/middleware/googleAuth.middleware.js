/**
 * Google OAuth 2.0 middleware (using passport-google-oauth20)
 *
 * Flow:
 *  1. GET /api/auth/google           → redirects user to Google's consent screen
 *  2. GET /api/auth/google/callback  → Google redirects here with ?code=...
 *     • Passport verifies the code, fetches the profile
 *     • We store profile on req.googleProfile and call next()
 *     • googleAuth.controller.js then handles upsert + JWT issue
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

// Only register strategy if credentials exist
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: CALLBACK_URL,
            // Scope defined at strategy level — most reliable approach
            scope: ['openid', 'profile', 'email'],
        },
        (accessToken, refreshToken, profile, done) => {
            // Pass the raw profile to the callback; DB logic is in the controller
            return done(null, profile);
        }
    ));

    // Passport requires serializeUser/deserializeUser for session support
    // (session is needed during the OAuth redirect/callback round-trip)
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));
}

/**
 * Middleware: initiate Google OAuth redirect
 * NOTE: Do NOT pass session:false here — the OAuth state parameter is
 * stored in the session during the redirect and read back on callback.
 */
function initiateGoogleAuth(req, res, next) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({
            message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.'
        });
    }
    passport.authenticate('google', {
        scope: ['openid', 'profile', 'email'],
        prompt: 'select_account'   // Always show account picker
    })(req, res, next);
}

/**
 * Middleware: handle Google OAuth callback
 * On success, sets req.googleProfile and calls next()
 */
function handleGoogleCallback(req, res, next) {
    passport.authenticate('google', (err, profile) => {
        if (err || !profile) {
            console.error('Google callback error:', err);
            return res.redirect('/login.html?error=google_auth_failed');
        }
        req.googleProfile = profile;
        next();
    })(req, res, next);
}

module.exports = { initiateGoogleAuth, handleGoogleCallback };
