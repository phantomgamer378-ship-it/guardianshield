const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

// Use service role client for registration (bypasses RLS)
const insforge = db.serviceRole;

const SECRET = process.env.JWT_SECRET || 'super_secret_guardian_shield_key_2026';

exports.register = async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Validation Error: Required fields missing' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const { data, error } = await insforge.database
            .from('users')
            .insert({ name, email, phone: phone || null, password_hash: hash })
            .select();

        if (error) {
            console.error('InsForge register error:', JSON.stringify(error));
            const msg = error.message || error.hint || JSON.stringify(error);
            if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
                return res.status(400).json({ message: 'Email or phone already registered' });
            }
            return res.status(500).json({ message: 'Registration failed: ' + msg });
        }

        if (!data || !data.length) {
            return res.status(500).json({ message: 'Registration failed: No data returned' });
        }

        const id = data[0].id;

        const token = jwt.sign({ id, email }, SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id, name, email } });
    } catch (err) {
        console.error('Register catch:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await insforge.database
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) return res.status(401).json({ message: 'Invalid credentials' });
        const user = data;

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};
