/**
 * Local dev server entry point.
 *
 * Uses the existing startDevServer() from src/lib/local-dev.ts
 * which handles:
 *   - Creating D1 (SQLite via better-sqlite3), R2 (local fs), AI (stub) bindings
 *   - Running DB migrations on startup
 *   - Starting @hono/node-server
 *
 * Usage: npx tsx scripts/run-local.mts
 *   or:  npm run dev
 */

import { startDevServer } from '../src/lib/local-dev';
import app from '../src/index';

const port = parseInt(process.env.PORT || '3000', 10);

startDevServer(app, port);
