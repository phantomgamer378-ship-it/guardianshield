/**
 * set_netlify_env.js
 * Sets all required env vars on the Netlify sites via the Netlify API.
 * Run once: node set_netlify_env.js
 * Delete this file after running.
 */
'use strict';

const https = require('https');

const TOKEN = 'nfp_4tBXQDRimqyhrF5ot9c6bdnWn7vACofD5408';

// Env vars to set (from .env + database.js)
const ENV_VARS = {
  JWT_SECRET:                'super_secret_guardian_shield_key_2026_change_me',
  INSFORGE_BASE_URL:         'https://4eitrub9.ap-southeast.insforge.app',
  INSFORGE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im00aXRydWI5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA1MTgzMiwiZXhwIjoyMDg4NjI3ODMyfQ.QhTrkN5Cj_2J_0Q0d9a1kLxQ3zRzE7mYgZtFqXHnYc8',
  INSFORGE_ANON_KEY:         'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTE4MzJ9.Ydj6GKGNIUL7rf4uxCxoUTdKvfINpATORac9syKve3M',
  NODE_ENV:                  'production',
};

// Sites to configure
const SITE_IDS = [
  'f187b961-68ed-43d9-b933-d30ec0a99532',  // astounding-nougat-157621
  '4d820d88-6a1e-47dc-aa92-bbfabda313d6',  // prismatic-tulumba-b801d4
];

function apiReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.netlify.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // 1. Get account ID from first site
  console.log('Fetching account info...');
  const siteInfo = await apiReq('GET', `/api/v1/sites/${SITE_IDS[0]}`);
  const accountId = siteInfo.body.account_id;
  console.log(`Account ID: ${accountId}`);

  for (const siteId of SITE_IDS) {
    const siteName = siteId === SITE_IDS[0] ? 'astounding-nougat-157621' : 'prismatic-tulumba-b801d4';
    console.log(`\n--- Setting env vars for: ${siteName} ---`);

    for (const [key, val] of Object.entries(ENV_VARS)) {
      // POST to create/update each var with site_id scope
      const result = await apiReq('POST',
        `/api/v1/accounts/${accountId}/env?site_id=${siteId}`,
        [{ key, values: [{ value: val, context: 'all' }] }]
      );
      if (result.status === 201 || result.status === 200) {
        console.log(`  ✓ ${key}`);
      } else {
        // Try PATCH (update existing)
        const patch = await apiReq('PATCH',
          `/api/v1/accounts/${accountId}/env/${key}?site_id=${siteId}`,
          { value: val, context: 'all' }
        );
        if (patch.status === 200) {
          console.log(`  ✓ ${key} (updated)`);
        } else {
          console.log(`  ✗ ${key} → ${result.status}:`, JSON.stringify(result.body).slice(0, 120));
        }
      }
    }
  }

  console.log('\n✅ All done! Trigger a redeploy in Netlify dashboard to apply the new env vars.');
  console.log('   → https://app.netlify.com/sites/astounding-nougat-157621/deploys');
  console.log('   → https://app.netlify.com/sites/prismatic-tulumba-b801d4/deploys');
}

main().catch(console.error);
