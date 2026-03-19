#!/usr/bin/env node
/**
 * Runlayer OAuth Authentication Script
 *
 * Run this once to authenticate with Runlayer MCP proxy.
 * Opens your browser for Gusto SSO login, then saves the token.
 *
 * Usage: node scripts/runlayer-auth.mjs
 */

import http from 'http';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const RUNLAYER_AUTH_SERVER = 'https://gusto.runlayer.com';
const GSHEETS_PROXY_ID = '67c072b8-017b-4ef2-96ac-e5c1b3c5a0be';
const PORT = 19837;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

async function main() {
  // Step 1: Register a dynamic OAuth client
  console.log('\n🔐 Registering OAuth client with Runlayer...');
  const regRes = await fetch(`${RUNLAYER_AUTH_SERVER}/api/v1/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'gusto-treasury-backend',
      redirect_uris: [REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });
  const client = await regRes.json();
  if (!client.client_id) {
    console.error('Failed to register client:', client);
    process.exit(1);
  }
  console.log('✅ Client registered:', client.client_id);

  // Step 2: Generate PKCE verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl =
    `${RUNLAYER_AUTH_SERVER}/api/v1/oauth/authorize?` +
    new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: REDIRECT_URI,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: `mcp:proxy mcp:proxy:${GSHEETS_PROXY_ID}`,
    }).toString();

  // Step 3: Start callback server
  const tokenPromise = new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      if (url.pathname !== '/callback') { res.writeHead(404); res.end(); return; }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h2>Auth failed: ${error}</h2>`);
        reject(new Error(error));
        server.close();
        return;
      }

      // Exchange code for token
      const tokenRes = await fetch(`${RUNLAYER_AUTH_SERVER}/api/v1/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: client.client_id,
          code_verifier: codeVerifier,
        }).toString(),
      });

      const tokenData = await tokenRes.json();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1 style="color:green">✅ Authenticated!</h1><p>Close this tab and return to your terminal.</p>');
      server.close();
      resolve(tokenData);
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`\n🌐 Opening browser for Runlayer SSO login...`);
      console.log(`   If the browser doesn't open, manually visit:\n   ${authUrl}\n`);
      try {
        if (process.platform === 'win32') {
          execSync(`start "" "${authUrl}"`, { shell: 'cmd.exe', stdio: 'ignore' });
        } else {
          execSync(`open "${authUrl}" || xdg-open "${authUrl}"`, { stdio: 'ignore' });
        }
      } catch (e) { /* user will open manually */ }
      console.log('⏳ Waiting for SSO callback...');
    });

    setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 300000);
  });

  const tokenData = await tokenPromise;

  if (!tokenData.access_token) {
    console.error('❌ Token exchange failed:', tokenData);
    process.exit(1);
  }

  console.log(`\n✅ Token received! Expires in ${tokenData.expires_in}s`);

  // Step 4: Save token to .env
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /^RUNLAYER_ACCESS_TOKEN=.*$/m,
    `RUNLAYER_ACCESS_TOKEN=${tokenData.access_token}`
  );
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Saved token to .env (RUNLAYER_ACCESS_TOKEN)');

  // Also save refresh token for future use
  if (tokenData.refresh_token) {
    const tokenFile = path.join(__dirname, '..', '.runlayer-token.json');
    fs.writeFileSync(tokenFile, JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
      client_id: client.client_id,
    }, null, 2));
    console.log('✅ Saved refresh token to .runlayer-token.json');
  }

  console.log('\n🚀 Done! Restart the backend to start ingesting Google Sheets data.');
}

main().catch((err) => {
  console.error('❌ Authentication failed:', err.message);
  process.exit(1);
});
