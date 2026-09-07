#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../migrations');

if (!fs.existsSync(migrationsDir)) {
  console.error('❌ No migrations/ directory found');
  process.exit(1);
}

const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (migrations.length === 0) {
  console.log('✅ No migrations to run');
  process.exit(0);
}

console.log(`📦 Found ${migrations.length} migration(s):`);
migrations.forEach((m) => console.log(`  - ${m}`));

for (const migration of migrations) {
  const filePath = path.join(migrationsDir, migration);
  console.log(`\n🚀 Running migration: ${migration}`);
  try {
    execSync(`wrangler d1 execute bauakte-5 --local --file="${filePath}"`, {
      stdio: 'inherit',
    });
    console.log(`✅ Migration ${migration} completed`);
  } catch (err) {
    console.error(`❌ Migration ${migration} failed`);
    process.exit(1);
  }
}

console.log('\n✅ All migrations completed successfully');