require('dotenv').config();

const SERVICE_KEY = process.env.INSFORGE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im00aXRydWI5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA1MTgzMiwiZXhwIjoyMDg4NjI3ODMyfQ.QhTrkN5Cj_2J_0Q0d9a1kLxQ3zRzE7mYgZtFqXHnYc8';
const BASE_URL = 'https://4eitrub9.ap-southeast.insforge.app';

async function runSQL(query) {
    const res = await fetch(`${BASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    return { status: res.status, data };
}

async function fix() {
    // Try to find the sequence name first
    const r1 = await runSQL("SELECT pg_get_serial_sequence('community_reports', 'id')");
    console.log('Sequence name:', r1);
    
    // Also try a direct sequence reset
    const r2 = await runSQL("SELECT setval(pg_get_serial_sequence('community_reports','id'), COALESCE((SELECT MAX(id)+1 FROM community_reports), 1), false);");
    console.log('Reset result:', r2);
}

fix();
