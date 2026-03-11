const db = require('../db/database');
const insforge = db.serviceRole;
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { data, error } = await insforge.database
            .from('users')
            .select('id, name, email, phone, profile_pic, created_at')
            .eq('id', userId)
            .single();

        if (error) throw new Error(error.message);

        const user = data ? {
            id: data.id, name: data.name, email: data.email, phone: data.phone,
            profilePic: data.profile_pic, createdAt: data.created_at
        } : null;

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.uploadAvatar = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { profilePic } = req.body;
        if (!profilePic) return res.status(400).json({ message: 'No image provided' });

        const { error } = await insforge.database
            .from('users')
            .update({ profile_pic: profilePic })
            .eq('id', userId);

        if (error) throw new Error(error.message);

        res.json({ message: 'Avatar updated successfully', profilePic });
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Fetch raw records via InsForge SDK
        const { data: phoneScans = [] } = await insforge.database
            .from('phone_scan_logs')
            .select('id, phone_number, risk_score, classification, confidence, reasons, scanned_at')
            .eq('user_id', userId)
            .order('scanned_at', { ascending: false })
            .limit(20);

        const { data: videoScans = [] } = await insforge.database
            .from('video_scan_logs')
            .select('id, file_name, authenticity_score, classification, confidence, factors, scanned_at')
            .eq('user_id', userId)
            .order('scanned_at', { ascending: false })
            .limit(20);

        const { data: voiceScans = [] } = await insforge.database
            .from('voice_scan_logs')
            .select('id, file_name, ai_probability, classification, confidence, factors, scanned_at')
            .eq('user_id', userId)
            .order('scanned_at', { ascending: false })
            .limit(20);

        // Map to camelCase & booleans that the frontend expects
        const formattedPhoneScans = phoneScans.map(s => ({
            id: s.id,
            phoneNumber: s.phone_number,
            riskScore: s.risk_score,
            // Derive riskLevel from classification string or score
            riskLevel: s.classification?.toLowerCase().includes('high') ? 'high'
                : s.classification?.toLowerCase().includes('medium') || s.risk_score >= 30 ? 'medium'
                    : 'low',
            classification: s.classification,
            confidence: s.confidence,
            reasons: s.reasons ? JSON.parse(s.reasons) : [],
            scanDate: s.scanned_at,
        }));

        const formattedVideoScans = videoScans.map(s => ({
            id: s.id,
            fileName: s.file_name,
            authenticityScore: s.authenticity_score,
            // isDeepfake = authenticity_score < 50 OR classification says DEEPFAKE
            isDeepfake: s.classification === 'DEEPFAKE_DETECTED' || (s.authenticity_score !== null && s.authenticity_score < 50),
            classification: s.classification,
            confidence: s.confidence,
            factors: s.factors ? JSON.parse(s.factors) : [],
            scanDate: s.scanned_at,
        }));

        const formattedVoiceScans = voiceScans.map(s => ({
            id: s.id,
            fileName: s.file_name,
            aiProbability: s.ai_probability,
            isAI: s.classification === 'AI_VOICE_DETECTED' || (s.ai_probability !== null && s.ai_probability > 50),
            classification: s.classification,
            confidence: s.confidence,
            factors: s.factors ? JSON.parse(s.factors) : [],
            scanDate: s.scanned_at,
        }));

        res.json({
            phoneScans: formattedPhoneScans,
            videoScans: formattedVideoScans,
            voiceScans: formattedVoiceScans,
        });
    } catch (error) {
        next(error);
    }
};

exports.updatePassword = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body;
        const { data: user, error: userErr } = await insforge.database
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userErr) throw new Error(userErr.message);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid current password' });

        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(newPassword, salt);
        const { error: updateErr } = await insforge.database
            .from('users')
            .update({ password_hash: newHashedPassword })
            .eq('id', userId);

        if (updateErr) throw new Error(updateErr.message);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};
