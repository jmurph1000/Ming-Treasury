const { cpSync, rmSync, existsSync } = require('fs');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(ROOT, '..');
const OUT_DIR = resolve(ROOT, 'out');
const DEPLOY_DIR = resolve(REPO_ROOT, 'ming-treasury', 'corp-forecast-v2');

if (!existsSync(OUT_DIR)) {
  console.error('out/ directory not found. Run "npm run build:static" first.');
  process.exit(1);
}

if (existsSync(DEPLOY_DIR)) {
  rmSync(DEPLOY_DIR, { recursive: true });
}

cpSync(OUT_DIR, DEPLOY_DIR, { recursive: true });
console.log(`Deployed to ${DEPLOY_DIR}`);
console.log('Now commit and push the ming-treasury branch to publish.');
