import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

type Db = InstanceType<typeof Database>;

/**
 * Emulates Cloudflare D1Database using better-sqlite3.
 * Implements only the subset of D1Database / D1PreparedStatement used
 * by the app's query functions in src/db/queries.ts.
 */

interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  meta?: { changes: number };
}

export class D1PreparedStatement {
  private sql: string;
  private db: Db;
  private params: unknown[] = [];

  constructor(db: Db, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...args: unknown[]): this {
    this.params = args;
    return this;
  }

  first<T = unknown>(): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.sql);
      const row = stmt.get(...this.params) as T | undefined;
      return Promise.resolve(row ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[D1] first() error on "${this.sql.slice(0, 60)}…": ${msg}`);
      return Promise.resolve(null);
    }
  }

  all<T = unknown>(): Promise<D1Result<T>> {
    try {
      const stmt = this.db.prepare(this.sql);
      const rows = stmt.all(...this.params) as T[];
      return Promise.resolve({ success: true, results: rows });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[D1] all() error on "${this.sql.slice(0, 60)}…": ${msg}`);
      return Promise.resolve({ success: false, results: [] });
    }
  }

  run(): Promise<D1Result> {
    try {
      const stmt = this.db.prepare(this.sql);
      const info = stmt.run(...this.params);
      return Promise.resolve({ success: true, meta: { changes: info.changes } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[D1] run() error on "${this.sql.slice(0, 60)}…": ${msg}`);
      return Promise.resolve({ success: false, meta: { changes: 0 } });
    }
  }

  raw(): Promise<unknown[][]> {
    try {
      const stmt = this.db.prepare(this.sql);
      const rows = stmt.raw().all(...this.params) as unknown[][];
      return Promise.resolve(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[D1] raw() error on "${this.sql.slice(0, 60)}…": ${msg}`);
      return Promise.resolve([]);
    }
  }
}

export class D1Adapter {
  private db: Db;

  constructor(dbPath?: string) {
    const dir = path.resolve(process.cwd(), '.wrangler', 'state', 'v3', 'd1');
    if (!dbPath) {
      fs.mkdirSync(dir, { recursive: true });
      dbPath = path.join(dir, 'miniflare-D1DatabaseObject.sqlite');
    }
    console.log(`[D1] Opening database at ${dbPath}`);
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  prepare(sql: string): D1PreparedStatement {
    return new D1PreparedStatement(this.db, sql);
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    const tx = this.db.transaction(() => {
      return statements.map((stmt) => {
        try {
          // Re-run the statement synchronously inside the transaction
          const s = this.db.prepare(stmt['sql']);
          const info = s.run(...stmt['params']);
          return { success: true, meta: { changes: info.changes } };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[D1] batch error: ${msg}`);
          return { success: false, meta: { changes: 0 } };
        }
      });
    });
    return Promise.resolve(tx());
  }

  async exec(sql: string): Promise<D1ExecResult> {
    try {
      this.db.exec(sql);
      return { count: 0, duration: 0 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[D1] exec() error: ${msg}`);
      return { count: 0, duration: 0 };
    }
  }

  dump(): Promise<ArrayBuffer> {
    console.warn('[D1] dump() not implemented');
    return Promise.resolve(new ArrayBuffer(0));
  }

  close(): void {
    this.db.close();
  }
}
