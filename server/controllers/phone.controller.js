const insforge = require('../db/database');
const truecallerjs = require('truecallerjs');

// ─────────────────────────────────────────────────────────────────────────────
//  PHONE RISK ANALYSIS
//  Uses AbstractAPI Phone Validation (free: 250 req/month) if configured,
//  plus community report count from local DB for an intelligent risk score.
// ─────────────────────────────────────────────────────────────────────────────

const ABSTRACT_API_KEY = process.env.ABSTRACT_API_KEY; // free at abstractapi.com

exports.analyze = async (req, res) => {
    const phoneNumber = (req.body.phoneNumber || req.body.number || '').replace(/\D/g, '');

    if (!phoneNumber || phoneNumber.length < 7) {
        return res.status(400).json({ error: 'Invalid phone number provided.' });
    }

    try {
        // 1. Check community report count from local DB
        let reportedCount = 0;
        try {
            const { data: reportRows } = await insforge.database
                .from('community_reports')
                .select('id', { count: 'exact' })
                .in('target_ref', [phoneNumber, '+91' + phoneNumber]);
            reportedCount = reportRows?.length || 0;
        } catch (e) {
            // table may not exist yet, ignore
        }

        // 2. Check global spam database
        let globalSpamData = null;
        try {
            const { data: spamRows } = await insforge.database
                .from('global_spam_numbers')
                .select('*')
                .in('phone_number', [phoneNumber, '+91' + phoneNumber]);
            if (spamRows && spamRows.length > 0) {
                globalSpamData = spamRows[0];
            }
        } catch (e) {
            // ignore if table doesn't exist yet
        }

        let result;

        if (ABSTRACT_API_KEY) {
            result = await analyzeWithAbstractAPI(phoneNumber, reportedCount, globalSpamData);
        } else {
            result = analyzeWithHeuristics(phoneNumber, reportedCount, globalSpamData);
        }

        // Persist scan to DB
        try {
            const { error: dbErr } = await insforge.database
                .from('phone_scan_logs')
                .insert({
                    user_id: req.user.id,
                    phone_number: phoneNumber,
                    risk_score: result.riskScore,
                    classification: result.riskLevel.toUpperCase(),
                    confidence: result.confidence,
                    reasons: JSON.stringify(result.reasons)
                });
            if (dbErr) console.error('DB log error (non-fatal):', dbErr.message);
        } catch (dbErr) {
            console.error('DB log error (non-fatal):', dbErr.message);
        }

        return res.json(result);

    } catch (err) {
        console.error('Phone analysis error:', err);
        return res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  AbstractAPI Phone Intelligence (Free: 250 req/month — no credit card)
//  Sign up at: https://app.abstractapi.com/api/phone-validation
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeWithAbstractAPI(phoneNumber, reportedCount, globalSpamData) {
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

    const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}&phone=${phoneNumber}`;
    const response = await fetch(url);

    if (!response.ok) {
        console.warn('AbstractAPI failed, falling back to heuristics');
        return analyzeWithHeuristics(phoneNumber, reportedCount, globalSpamData);
    }

    const data = await response.json();

    // data.valid, data.type (mobile/landline/voip), data.carrier, data.location, data.line_type
    let riskScore = reportedCount * 12; // Community reports carry heavy weight
    const reasons = [];

    if (!data.valid) {
        riskScore += 40;
        reasons.push('Phone number format is invalid or unregistered');
    }

    if (data.type === 'voip' || data.line_type === 'voip') {
        riskScore += 35;
        reasons.push('VoIP number — frequently used for spoofing and fraud calls');
    }

    if (!data.carrier) {
        riskScore += 15;
        reasons.push('No carrier information available — number may be temporary');
    } else {
        reasons.push(`Registered carrier: ${data.carrier}`);
    }

    if (data.location) {
        reasons.push(`Location: ${data.location}`);
    }

    if (reportedCount > 0) {
        reasons.push(`Community reports: ${reportedCount} user(s) flagged this number`);
    }

    // Global Spam Database Match
    if (globalSpamData) {
        riskScore += 90;
        reasons.push(`Number found in global spam database: ${globalSpamData.spam_type || 'Known Scam'}`);
    }

    riskScore = Math.min(100, riskScore);

    let riskLevel, details;
    if (riskScore >= 60) {
        riskLevel = 'high';
        details = 'This number shows multiple high-risk indicators. Do not share personal details or make payments based on calls from this number.';
    } else if (riskScore >= 30) {
        riskLevel = 'medium';
        details = 'This number has some suspicious characteristics. Verify the caller\'s identity via official channels before proceeding.';
    } else {
        riskLevel = 'low';
        details = 'No significant fraud indicators detected. This appears to be a legitimate number, though always exercise caution.';
    }

    return {
        riskLevel,
        riskScore,
        confidence: data.valid ? 92 : 75,
        details,
        reasons,
        reportedCount,
        carrier: data.carrier || 'Unknown',
        location: data.location || 'Unknown',
        numberType: data.type || data.line_type || 'Unknown',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Smart Heuristic Phone Analysis (No external API needed)
//  Works offline using known Indian phone patterns + community DB
// ─────────────────────────────────────────────────────────────────────────────
function analyzeWithHeuristics(phoneNumber, reportedCount, globalSpamData) {
    const clean = phoneNumber.replace(/\D/g, '').replace(/^91/, '');
    let riskScore = 0;
    const reasons = [];

    // Known high-risk patterns in India
    const HIGH_RISK_PREFIXES = ['140', '141', '142', '143', '144', '145', '146', '147', '148', '149']; // Telemarketing
    const SUSPICIOUS_PATTERNS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    const ALL_SAME = /^(.)\1{9}$/.test(clean); // e.g. 0000000000

    if (ALL_SAME) {
        riskScore += 80;
        reasons.push('All identical digits — common test/fake number pattern');
    }

    if (HIGH_RISK_PREFIXES.some(p => clean.startsWith(p))) {
        riskScore += 50;
        reasons.push('Number starts with a known telemarketing prefix (140-149 series)');
    }

    if (SUSPICIOUS_PATTERNS.some(p => clean.includes(p))) {
        riskScore += 20;
        reasons.push('Repeated digit sequence detected — uncommon in legitimate numbers');
    }

    // Length check (Indian mobiles: 10 digits)
    if (clean.length !== 10) {
        riskScore += 30;
        reasons.push(`Unusual length (${clean.length} digits) — Indian mobiles have 10 digits`);
    }

    // Valid Indian mobile prefix (6-9)
    const firstDigit = parseInt(clean[0]);
    if (firstDigit >= 6 && firstDigit <= 9) {
        reasons.push('Valid Indian mobile number prefix');
    } else if (clean.length === 10) {
        riskScore += 25;
        reasons.push('Number prefix does not match Indian mobile standards (should start with 6-9)');
    }

    // Community reports weight
    if (reportedCount > 0) {
        riskScore += Math.min(40, reportedCount * 15);
        reasons.push(`Flagged by ${reportedCount} GuardianShield user(s) as suspicious`);
    } else {
        reasons.push('No community reports on file for this number');
    }

    // Global Spam Database Match
    if (globalSpamData) {
        riskScore += 90;
        reasons.push(`Number found in global spam database: ${globalSpamData.spam_type || 'Known Scam'}`);
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel, details;
    if (riskScore >= 60) {
        riskLevel = 'high';
        details = 'This number matches multiple high-risk patterns in our database. Exercise extreme caution — do not share OTPs, banking details, or personal information.';
    } else if (riskScore >= 25) {
        riskLevel = 'medium';
        details = 'This number has some suspicious characteristics. We recommend verifying the caller\'s identity through official channels before proceeding.';
    } else {
        riskLevel = 'low';
        details = 'No significant fraud indicators found for this number. It appears to follow standard Indian mobile number patterns.';
    }

    reasons.push('Analysis by GuardianShield Heuristic Engine — add ABSTRACT_API_KEY to .env for enhanced carrier/VoIP detection');

    return {
        riskLevel,
        riskScore,
        confidence: 78,
        details,
        reasons,
        reportedCount,
        carrier: 'Unknown (no API key configured)',
        location: 'India',
        numberType: 'Unknown'
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMMUNITY REPORT SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────
exports.report = async (req, res) => {
    const { number, comment, scamType, description } = req.body;
    const targetRef = number || req.body.phoneNumber;
    const reportText = comment || description || scamType || '';

    if (!targetRef) {
        return res.status(400).json({ error: 'Phone number is required for reports.' });
    }

    try {
        // The sequence for this table is out of sync — compute next ID manually
        const { data: maxRow } = await insforge.database
            .from('community_reports')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        const nextId = maxRow && maxRow.length > 0 ? maxRow[0].id + 1 : 1;

        const { data, error } = await insforge.database
            .from('community_reports')
            .insert({ id: nextId, reporter_id: req.user.id, report_type: 'phone', target_ref: targetRef, comment: reportText })
            .select();

        if (error) throw new Error(error.message);

        return res.json({ message: 'Report submitted successfully', report_id: data[0].id });
    } catch (err) {
        console.error('Report error:', err);
        return res.status(500).json({ error: 'Failed to submit report. Details: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SYNC EXTERNAL SPAM DATABASE
// ─────────────────────────────────────────────────────────────────────────────
exports.syncSpamDb = async (req, res) => {
    const { numbers } = req.body;

    if (!Array.isArray(numbers)) {
        return res.status(400).json({ error: 'Expected an array of numbers' });
    }

    try {
        const records = numbers
            .map(item => {
                const phone = (item.phone_number || item).toString().replace(/\D/g, '');
                return phone ? { phone_number: phone, spam_type: item.spam_type || 'spam', risk_level: item.risk_level || 'high' } : null;
            })
            .filter(Boolean);

        if (records.length > 0) {
            const { error } = await insforge.database
                .from('global_spam_numbers')
                .insert(records);
            if (error) throw new Error(error.message);
        }

        return res.json({ message: `Successfully synced ${records.length} numbers to the global spam database.` });
    } catch (err) {
        console.error('Spam DB sync error:', err);
        return res.status(500).json({ error: 'Failed to sync database.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  FETCH CALLER ID & USER INFORMATION USING IPQUALITYSCORE
// ─────────────────────────────────────────────────────────────────────────────
exports.fetchCallerInfo = async (req, res) => {
    // Only strip non-numeric characters for processing, but we keep the country code if provided.
    // IPQS prefers the full international format or a country code parameter.
    const phoneNumber = (req.body.phoneNumber || req.body.number || '').replace(/\D/g, '');

    if (!phoneNumber || phoneNumber.length < 7) {
        return res.status(400).json({ error: 'Invalid phone number provided.' });
    }

    try {
        const apiKey = process.env.IPQS_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'Caller ID API not configured. Missing IPQS_API_KEY.' });
        }
        
        const countryCode = req.body.countryCode || "IN";
        const url = `https://www.ipqualityscore.com/api/json/phone/${apiKey}/${phoneNumber}?country=${countryCode}`;
        
        const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
        const response = await fetch(url);
        
        if (!response.ok) {
           throw new Error(`IPQS API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success === false) {
             console.error('IPQS API Error:', data.message);
             return res.status(500).json({ error: data.message || 'Failed to fetch caller information.' });
        }

        // Standardize the response to look similar to how truecaller/other APIs format it
        // so the frontend receives it predictably.
        const standardizedResponse = {
            id: phoneNumber,
            name: data.name || "Unknown",
            score: data.fraud_score || 0,
            access: data.recent_abuse ? "Spammer" : "Clear",
            carrier: data.carrier || "Unknown",
            line_type: data.line_type || "Unknown",
            spammer: data.spammer || false,
            addresses: [{
                city: data.city || "Unknown",
                region: data.region || "Unknown",
                country: data.country || "Unknown"
            }],
            phones: [{
                e164Format: data.formatted || phoneNumber,
                numberType: data.line_type || "Unknown"
            }],
            raw_ipqs_data: data // Send raw info just in case frontend needs VOIP/active status
        };

        return res.json(standardizedResponse);
    } catch (err) {
        console.error('Caller Info fetch error:', err.message || err);
        return res.status(500).json({ error: 'Failed to fetch caller information.' });
    }
};

