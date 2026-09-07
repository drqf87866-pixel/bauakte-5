#!/usr/bin/env node
// CLI für `npm run db:migrate` (Remote) bzw. `npm run db:migrate -- --local`.
//
// Optionen:
//   --local                          gegen die lokale D1-DB statt Remote
//   --mark 0001_init.sql,0002_add_tags.sql   Migrationen als "bereits
//                                    angewendet" markieren (Baseline für DBs,
//                                    die vor diesem Runner migriert wurden)

import { runMigrations } from './migrate-core.mjs';

const args = process.argv.slice(2);
const local = args.includes('--local');

const markIndex = args.indexOf('--mark');
const mark =
  markIndex >= 0 && args[markIndex + 1]
    ? args[markIndex + 1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

runMigrations({ remote: !local, mark });
