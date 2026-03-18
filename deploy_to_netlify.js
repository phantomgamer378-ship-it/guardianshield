'use strict';
/**
 * deploy_to_netlify.js
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Sets all required environment variables on both Netlify sites
 * 2. Triggers a new deploy with functions included via Netlify Deploy API
 *
 * Run: node deploy_to_netlify.js
 * ─────────────────────────────────────────────────────────────────────────
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const TOKEN   = 'nfp_4tBXQDRimqyhrF5ot9c6bdnWn7vACofD5408';
const SITE_ID = '7ac570ad-5d94-479c-8723-5b2fb270d76e'; // guardianshield-1773236627094

const ENV_VARS = {
  JWT_SECRET:                'super_secret_guardian_shield_key_2026_change_me',
  INSFORGE_BASE_URL:         'https://4eitrub9.ap-southeast.insforge.app',
  INSFORGE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im00aXRydWI5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA1MTgzMiwiZXhwIjoyMDg4NjI3ODMyfQ.QhTrkN5Cj_2J_0Q0d9a1kLxQ3zRzE7mYgZtFqXHnYc8',
  INSFORGE_ANON_KEY:         'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTE4MzJ9.Ydj6GKGNIUL7rf4uxCxoUTdKvfINpATORac9syKve3M',
  NODE_ENV:                  'production',
};

// ── helpers ────────────────────────────────────────────────────────────────
function request(method, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const payload = body instanceof Buffer ? body : (body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : null);
    const opts = {
      hostname: 'api.netlify.com',
      path: urlPath,
      method,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': body instanceof Buffer ? 'application/octet-stream' : 'application/json',
        ...extraHeaders,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function walkDir(dir, base = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full, base));
    else results.push(full);
  }
  return results;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  // ── Step 1: get account_id ────────────────────────────────────────────────
  console.log('\n[1/4] Fetching site info...');
  const siteRes = await request('GET', `/api/v1/sites/${SITE_ID}`);
  if (siteRes.status !== 200) throw new Error('Cannot fetch site: ' + JSON.stringify(siteRes.body));
  const accountId = siteRes.body.account_id;
  const siteName  = siteRes.body.name;
  console.log(`    Site: ${siteName}  |  Account: ${accountId}`);

  // ── Step 2: set env vars ───────────────────────────────────────────────────
  console.log('\n[2/4] Setting environment variables...');
  for (const [key, value] of Object.entries(ENV_VARS)) {
    const r = await request('POST',
      `/api/v1/accounts/${accountId}/env?site_id=${SITE_ID}`,
      [{ key, values: [{ value, context: 'all' }] }]
    );
    if (r.status === 201 || r.status === 200) {
      console.log(`    ✓ ${key}`);
    } else {
      // already exists → patch
      const p = await request('PATCH',
        `/api/v1/accounts/${accountId}/env/${key}?site_id=${SITE_ID}`,
        { value, context: 'all' }
      );
      console.log(`    ${p.status === 200 ? '✓ (updated)' : '✗ ' + p.status} ${key}`);
    }
  }

  // ── Step 3: build file digest map ─────────────────────────────────────────
  console.log('\n[3/4] Scanning files for deploy...');
  const ROOT = __dirname;

  // Collect public/ files
  const files = {}; // netlify path → { disk path, sha1 }
  const publicDir = path.join(ROOT, 'public');
  for (const f of walkDir(publicDir)) {
    const rel = '/' + path.relative(publicDir, f).replace(/\\/g, '/');
    const buf = fs.readFileSync(f);
    files[rel] = { disk: f, hash: sha1(buf), buf };
  }

  // Collect netlify/functions files (Netlify handles bundling)
  const fnDir = path.join(ROOT, 'netlify', 'functions');
  const serverDir = path.join(ROOT, 'server');
  const pkgFile   = path.join(ROOT, 'package.json');
  const pkgLock   = path.join(ROOT, 'package-lock.json');
  const tomlFile  = path.join(ROOT, 'netlify.toml');

  // Function source files
  const fnFiles = [
    ...walkDir(fnDir),
    ...walkDir(serverDir),
    pkgFile, pkgLock, tomlFile,
  ];
  for (const f of fnFiles) {
    if (!fs.existsSync(f)) continue;
    const rel = '/' + path.relative(ROOT, f).replace(/\\/g, '/');
    const buf = fs.readFileSync(f);
    files[rel] = { disk: f, hash: sha1(buf), buf };
  }

  const digestMap = {};
  for (const [rel, { hash }] of Object.entries(files)) digestMap[rel] = hash;
  console.log(`    ${Object.keys(files).length} files ready`);

  // ── Step 4: create deploy ──────────────────────────────────────────────────
  console.log('\n[4/4] Creating Netlify deploy...');
  const deployRes = await request('POST', `/api/v1/sites/${SITE_ID}/deploys`, {
    files: digestMap,
    functions: {},
    async: false,
  });

  if (deployRes.status !== 200 && deployRes.status !== 201) {
    throw new Error('Deploy creation failed: ' + JSON.stringify(deployRes.body));
  }

  const deployId = deployRes.body.id;
  const required = deployRes.body.required || [];
  console.log(`    Deploy ID: ${deployId}`);
  console.log(`    Files to upload: ${required.length}`);

  // ── Upload missing files ───────────────────────────────────────────────────
  const hashToFile = {};
  for (const [rel, info] of Object.entries(files)) hashToFile[info.hash] = info;

  let uploaded = 0;
  for (const hash of required) {
    const info = hashToFile[hash];
    if (!info) { console.log(`    ⚠ No file found for hash ${hash}`); continue; }
    const up = await request('PUT',
      `/api/v1/deploys/${deployId}/files${Object.entries(files).find(([,v]) => v.hash === hash)?.[0]}`,
      info.buf,
      { 'Content-Type': 'application/octet-stream', 'Content-Length': info.buf.length }
    );
    if (up.status === 200) { process.stdout.write('.'); uploaded++; }
    else console.log(`\n    ✗ Upload failed (${up.status}) for hash ${hash}`);
  }

  console.log(`\n    Uploaded ${uploaded}/${required.length} files`);
  console.log('\n✅ Deploy submitted!');
  console.log(`   → https://app.netlify.com/sites/${siteName}/deploys/${deployId}`);
  console.log(`   → Live URL: https://${siteName}.netlify.app`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
