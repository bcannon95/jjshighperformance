#!/usr/bin/env node
/**
 * Mobile build script for Capacitor.
 * Temporarily moves app/api and app/admin outside the app directory
 * (server-only, Vercel-only) so they are excluded from the Next.js
 * static export, then restores them after the build.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const excluded = [
  { src: path.join(root, 'app', 'api'),   tmp: path.join(root, '_mobile_bak_api') },
  { src: path.join(root, 'app', 'admin'), tmp: path.join(root, '_mobile_bak_admin') },
];

function move(from, to) {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    console.log(`  moved: ${from.replace(root, '.')} -> ${to.replace(root, '.')}`);
  }
}

function restore() {
  for (const { src, tmp } of excluded) {
    move(tmp, src);
  }
}

// Stash excluded folders outside the app directory
console.log('\nExcluding server-only routes from mobile build...');
for (const { src, tmp } of excluded) {
  move(src, tmp);
}

// Build
let buildFailed = false;
try {
  console.log('\nBuilding Next.js static export...\n');
  execSync('cross-env CAPACITOR_BUILD=true next build', { stdio: 'inherit', cwd: root });
} catch (e) {
  buildFailed = true;
}

// Always restore
console.log('\nRestoring server-only routes...');
restore();

if (buildFailed) {
  console.error('\nBuild failed. Routes restored — no changes synced to Capacitor.\n');
  process.exit(1);
}

// Sync to Capacitor
console.log('\nSyncing to Capacitor...\n');
execSync('npx cap sync', { stdio: 'inherit', cwd: root });
console.log('\nMobile build complete.\n');
