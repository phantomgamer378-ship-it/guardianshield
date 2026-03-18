const jwt = require('jsonwebtoken');
const db = require('../db/database');

const insforge = db.serviceRole;
const SECRET = process.env.JWT_SECRET || 'super_secret_guardian_shield_key_2026';

/**
 * Called by Passport after Google OAuth succeeds.
 * Upserts the user in the DB, creates a JWT, and redirects to home.
 */
exports.googleCallback = async (req, res) => {
    try {
        const profile = req.googleProfile; // set by the middleware below
        if (!profile) {
            return res.redirect('/login.html?error=google_failed');
        }

        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || '';
        const name = profile.displayName || '';
        const avatar = profile.photos?.[0]?.value || '';

        if (!email) {
            return res.redirect('/login.html?error=no_email');
        }

        // Try to find existing user by google_id or email
        let user;
        const { data: byGoogle } = await insforge.database
            .from('users')
            .select('*')
            .eq('google_id', googleId)
            .maybeSingle();

        if (byGoogle) {
            user = byGoogle;
        } else {
            // Check by email (may have registered with email/password before)
            const { data: byEmail } = await insforge.database
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (byEmail) {
                // Link google_id to existing account
                const { data: updated } = await insforge.database
                    .from('users')
                    .update({ google_id: googleId, avatar: avatar || byEmail.avatar })
                    .eq('id', byEmail.id)
                    .select()
                    .single();
                user = updated || byEmail;
            } else {
                // New user - create account (no password_hash needed)
                const { data: created, error: createError } = await insforge.database
                    .from('users')
                    .insert({
                        name,
                        email,
                        google_id: googleId,
                        avatar,
                        password_hash: null
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Google create user error:', createError);
                    return res.redirect('/login.html?error=create_failed');
                }
                user = created;
            }
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
        const userPayload = encodeURIComponent(JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || ''
        }));

        // Redirect with token in URL fragment (client reads it, then clears it)
        res.redirect(`/home.html?token=${token}&user=${userPayload}`);
    } catch (err) {
        console.error('Google auth callback error:', err);
        res.redirect('/login.html?error=server_error');
    }
};
