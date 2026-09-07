#!/usr/bin/env node
// Legacy-Alias für `npm run db:migrate:local` → `node scripts/migrate.mjs --local`

import { runMigrations } from './migrate-core.mjs';

runMigrations({ remote: false });
