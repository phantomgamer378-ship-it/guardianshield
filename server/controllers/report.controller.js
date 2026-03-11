const insforge = require('../db/database');

exports.submitToNCCP = async (req, res) => {
    const { scan_type, scan_log_id, description } = req.body;
    const ref = 'NCCP-' + Math.floor(Math.random() * 10000000);
    try {
        const { error } = await insforge.database
            .from('nccp_submissions')
            .insert({ user_id: req.user.id, scan_type, scan_log_id, submission_ref: ref });

        if (error) throw new Error(error.message);

        res.json({ message: 'Submitted successfully', submission_ref: ref });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit report' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const { data: reports, error } = await insforge.database
            .from('nccp_submissions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('submitted_at', { ascending: false });

        if (error) throw new Error(error.message);

        res.json({ reports, total: reports.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve reports' });
    }
};
