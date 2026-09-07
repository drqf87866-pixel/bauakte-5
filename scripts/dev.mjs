#!/usr/bin/env node

/**
 * Local dev server with CSS watch and wrangler dev.
 *
 * Starts two processes in parallel:
 *   1. Tailwind CSS watch (recompiles on changes to src/styles/)
 *   2. wrangler dev (Cloudflare Workers local runtime)
 *
 * Usage: node scripts/dev.mjs
 *   or:  npm run dev
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║   🏗️  Bauakte – Lokale Entwicklungsumgebung  ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

const processes = [];

function startProcess(label, command, args, opts = {}) {
  console.log(`[${label}] Starting...`);
  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env: { ...process.env, ...opts.env },
  });

  proc.on('error', (err) => {
    console.error(`[${label}] Error:`, err.message);
  });

  proc.on('exit', (code) => {
    console.log(`[${label}] Exited with code ${code}`);
  });

  processes.push(proc);
  return proc;
}

// ── 1. CSS Watch ──────────────────────────────────────────────
startProcess('CSS', 'npx', [
  'tailwindcss',
  '-i', './src/styles/app.css',
  '-o', './public/app.css',
  '--watch',
]);

// ── 2. Wrangler Dev Server ────────────────────────────────────
startProcess('WRANGLER', 'npx', [
  'wrangler',
  'dev',
]);

console.log('\n📡 Dev server will be available at http://localhost:8788\n');
console.log('⏳ Waiting for both processes to start...\n');

// ── Cleanup on exit ───────────────────────────────────────────
function cleanup(signal) {
  console.log(`\n${signal} received – shutting down...\n`);
  for (const proc of processes) {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }
  // Force exit after 2s if children haven't stopped
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('exit', () => {
  for (const proc of processes) {
    if (proc && !proc.killed) {
      proc.kill();
    }
  }
});
