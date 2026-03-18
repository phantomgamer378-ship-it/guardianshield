'use strict';
/**
 * new_deploy.js — Creates a fresh Netlify site and deploys GuardianShield
 * Usage: node new_deploy.js
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const TOKEN = 'nfp_4tBXQDRimqyhrF5ot9c6bdnWn7vACofD5408';
const ROOT  = __dirname;

const ENV_VARS = [
  { key: 'JWT_SECRET',                value: 'super_secret_guardian_shield_key_2026_change_me' },
  { key: 'INSFORGE_BASE_URL',         value: 'https://4eitrub9.ap-southeast.insforge.app' },
  { key: 'INSFORGE_SERVICE_ROLE_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im00aXRydWI5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA1MTgzMiwiZXhwIjoyMDg4NjI3ODMyfQ.QhTrkN5Cj_2J_0Q0d9a1kLxQ3zRzE7mYgZtFqXHnYc8' },
  { key: 'INSFORGE_ANON_KEY',         value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTE4MzJ9.Ydj6GKGNIUL7rf4uxCxoUTdKvfINpATORac9syKve3M' },
  { key: 'NODE_ENV',                  value: 'production' },
];

// ── HTTP helper ──────────────────────────────────────────────────────────────
function req(method, urlPath, body, isBinary = false) {
  return new Promise((resolve, reject) => {
    const isJson   = !isBinary && body != null;
    const payload  = isJson ? Buffer.from(JSON.stringify(body)) : (body instanceof Buffer ? body : null);
    const opts = {
      hostname: 'api.netlify.com',
      path: urlPath,
      method,
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
        'Content-Type': isBinary ? 'application/octet-stream' : 'application/json',
        ...(payload ? { 'Content-Length': payload.length } : {}),
      },
    };
    const r = https.request(opts, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('Timeout on ' + urlPath)); });
    if (payload) r.write(payload);
    r.end();
  });
}

function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }

function collectFiles(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    const full = path.join(dir, name);
    const relPath = rel + '/' + name;
    // skip node_modules, .git, db files, uploads, test files
    if (['node_modules','.git','uploads','db_backup_before_sync'].includes(name)) continue;
    if (['.db','.db-shm','.db-wal','.wav','.mp4','.log'].some(e => name.endsWith(e))) continue;
    if (entry.isDirectory()) out.push(...collectFiles(full, relPath));
    else { const buf = fs.readFileSync(full); out.push({ rel: relPath, buf, hash: sha1(buf) }); }
  }
  return out;
}

async function main() {
  // 1. Find account ID
  process.stdout.write('[1/5] Getting account info... ');
  const meRes = await req('GET', '/api/v1/sites?per_page=1');
  if (meRes.status !== 200) throw new Error('Auth failed: ' + JSON.stringify(meRes.body));
  const acctRes = await req('GET', `/api/v1/sites/${meRes.body[0]?.id}`);
  const accountId = acctRes.body.account_id;
  console.log(`account: ${accountId}`);

  // 2. Create new site
  process.stdout.write('[2/5] Creating new Netlify site "guardianshield-app"... ');
  const siteRes = await req('POST', `/api/v1/sites`, {
    name: `guardianshield-${Date.now()}`,
    account_slug: accountId,
    processing_settings: { skip: false },
  });
  if (siteRes.status !== 201 && siteRes.status !== 200) {
    throw new Error('Site creation failed: ' + JSON.stringify(siteRes.body));
  }
  const siteId   = siteRes.body.id;
  const siteName = siteRes.body.name;
  const siteUrl  = siteRes.body.ssl_url || siteRes.body.url;
  console.log(`\n    → ${siteName}`);
  console.log(`    → ${siteUrl}`);

  // 3. Set environment variables
  process.stdout.write('[3/5] Setting env vars... ');
  for (const envVar of ENV_VARS) {
    const r = await req('POST',
      `/api/v1/accounts/${accountId}/env?site_id=${siteId}`,
      [{ key: envVar.key, values: [{ value: envVar.value, context: 'all' }] }]
    );
    process.stdout.write(r.status === 201 ? '✓' : `(${r.status})`);
  }
  console.log(' done');

  // 4. Build file map
  process.stdout.write('[4/5] Scanning project files... ');
  const allFiles = collectFiles(ROOT);
  console.log(`${allFiles.length} files`);

  // Build digest map (netlify path → sha1)
  const digestMap = {};
  const hashToFile = {};
  for (const f of allFiles) {
    digestMap[f.rel] = f.hash;
    hashToFile[f.hash] = f;
  }

  // 5. Create deploy
  process.stdout.write('[5/5] Creating deploy... ');
  const deployRes = await req('POST', `/api/v1/sites/${siteId}/deploys`, {
    files: digestMap,
    async: false,
  });
  if (deployRes.status !== 200 && deployRes.status !== 201) {
    throw new Error('Deploy failed: ' + JSON.stringify(deployRes.body).slice(0, 300));
  }
  const deployId = deployRes.body.id;
  const required = deployRes.body.required || [];
  console.log(`deploy ${deployId}, uploading ${required.length} files...`);

  // Upload each required file
  let done = 0;
  for (const hash of required) {
    const f = hashToFile[hash];
    if (!f) { console.log(`  ⚠ missing hash ${hash}`); continue; }
    const upPath = `/api/v1/deploys/${deployId}/files${f.rel}`;
    const up = await req('PUT', upPath, f.buf, true);
    if (up.status === 200) { process.stdout.write('.'); done++; }
    else console.log(`\n  ✗ ${f.rel} → ${up.status}`);
  }

  console.log(`\n\n✅ Deploy complete! (${done}/${required.length} files uploaded)`);
  console.log(`\n🌐 Your site: https://${siteName}.netlify.app`);
  console.log(`📊 Dashboard: https://app.netlify.com/sites/${siteName}`);
  console.log('\n⚠️  Important: The site will be live in ~30 seconds after Netlify processes the build.');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
