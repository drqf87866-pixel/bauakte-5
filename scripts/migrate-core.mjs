#!/usr/bin/env node
// Shared migration runner with applied-migration tracking.
//
// Erstellt (falls nicht vorhanden) die Tabelle `d1_migrations` und wendet nur
// Migrationen an, die noch nicht angewendet wurden. Mehrfaches Ausführen ist
// damit gefahrlos möglich.
//
// Für lokale Läufe in isolierten Verzeichnissen (Tests/CI) kann die
// Umgebungsvariable WRANGLER_PERSIST_TO gesetzt werden.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_NAME = 'bauakte-5';
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const TRACKING_TABLE_SQL =
  'CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime(\'now\')))';

function buildTargetFlags(remote) {
  const flags = remote ? ['--remote'] : ['--local'];
  const persist = process.env.WRANGLER_PERSIST_TO;
  if (!remote && persist) {
    flags.push('--persist-to', persist);
  }
  flags.push('--yes');
  return flags;
}

function run(command, { capture = false } = {}) {
  return capture ? execSync(command, { encoding: 'utf8' }) : execSync(command, { stdio: 'inherit' });
}

function readApplied(target) {
  const out = run(
    `npx wrangler d1 execute ${DB_NAME} ${target} --command "SELECT name FROM d1_migrations ORDER BY name" --json`,
    { capture: true },
  );
  const names = [];
  try {
    const parsed = JSON.parse(out);
    for (const statement of parsed) {
      for (const row of statement.results ?? []) {
        if (row && row.name) names.push(String(row.name));
      }
    }
  } catch (err) {
    console.warn('⚠️  Konnte angewendete Migrationen nicht lesen:', err.message);
  }
  return names;
}

export function runMigrations({ remote = false, mark = [] } = {}) {
  const target = buildTargetFlags(remote).join(' ');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Kein migrations/-Verzeichnis gefunden: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const migrations = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(
    remote
      ? '🌐 Ziel: Remote-D1-Datenbank (Produktion)'
      : '💻 Ziel: Lokale D1-Datenbank (Entwicklung)',
  );

  if (migrations.length === 0) {
    console.log('✅ Keine Migrationen vorhanden');
    return;
  }

  console.log(`📦 Gefundene Migrationen (${migrations.length}):`);
  migrations.forEach((m) => console.log(`  - ${m}`));

  // 1) Tracking-Tabelle sicherstellen
  run(`npx wrangler d1 execute ${DB_NAME} ${target} --command "${TRACKING_TABLE_SQL}"`);

  // 2) Als "bereits angewendet" markierte Migrationen nachtragen (Baseline)
  for (const name of mark) {
    run(
      `npx wrangler d1 execute ${DB_NAME} ${target} --command "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${name}')"`,
    );
    console.log(`🗂  Baseline: ${name} als angewendet markiert`);
  }

  // 3) Bereits angewendete Migrationen ermitteln
  const applied = new Set([...readApplied(target), ...mark]);

  const pending = migrations.filter((m) => !applied.has(m));
  if (pending.length === 0) {
    console.log('✅ Datenbank ist aktuell – keine ausstehenden Migrationen');
    return;
  }

  // 4) Nur ausstehende Migrationen anwenden
  for (const migration of pending) {
    const filePath = path.join(MIGRATIONS_DIR, migration).replace(/\\/g, '/');
    console.log(`\n🚀 Wende Migration an: ${migration}`);
    run(`npx wrangler d1 execute ${DB_NAME} ${target} --file="${filePath}"`);
    run(
      `npx wrangler d1 execute ${DB_NAME} ${target} --command "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${migration}')"`,
    );
    console.log(`✅ ${migration} abgeschlossen`);
  }

  console.log('\n✅ Alle ausstehenden Migrationen wurden angewendet');
}
