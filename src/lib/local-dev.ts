/**
 * Local dev environment setup.
 *
 * Provides Cloudflare bindings (D1, R2, AI) for running the Hono app
 * outside of wrangler, using @hono/node-server + tsx.
 *
 * Usage: import { createLocalApp } from './lib/local-dev'; then serve() it.
 */

import { Hono } from 'hono';
import { serve, type ServerType } from '@hono/node-server';
import fs from 'fs';
import path from 'path';
import { D1Adapter } from './d1-adapter';
import type { Env } from '../db/schema';

// ── SQL migrations to run on startup ──────────────────────────────────
function loadMigrations(): string[] {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn('[local-dev] No migrations/ directory found');
    return [];
  }
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((f) => {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    console.log(`[local-dev] Loaded migration: ${f}`);
    return sql;
  });
}

function runMigrations(d1: D1Adapter): void {
  const migrations = loadMigrations();
  for (const sql of migrations) {
    try {
      d1.exec(sql);
      console.log('[local-dev] Migration executed successfully');
    } catch (err: any) {
      console.error(`[local-dev] Migration failed: ${err.message}`);
      throw err;
    }
  }
}

// ── R2 stub (local filesystem) ────────────────────────────────────────
const UPLOAD_DIR = path.resolve(process.cwd(), '.local-uploads');

class R2ObjectStub implements R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpEtag: string;
  checksums: Record<string, string> = {};

  constructor(key: string, size: number) {
    this.key = key;
    this.version = 'v1';
    this.size = size;
    this.etag = `"${key}-${Date.now()}"`;
    this.uploaded = new Date();
    this.httpEtag = this.etag;
  }
}

class LocalR2Bucket implements R2Bucket {
  async head(key: string): Promise<R2Object | null> {
    const p = path.join(UPLOAD_DIR, key);
    try {
      const stat = fs.statSync(p);
      return stat.isFile() ? new R2ObjectStub(key, stat.size) : null;
    } catch {
      return null;
    }
  }

  async get(
    key: string,
    _options?: R2GetOptions
  ): Promise<R2ObjectBody | null> {
    const p = path.join(UPLOAD_DIR, key);
    try {
      const data = fs.readFileSync(p);
      const stat = fs.statSync(p);
      const obj = new R2ObjectStub(key, stat.size) as R2ObjectBody;
      (obj as any).body = data;
      return obj as R2ObjectBody;
    } catch {
      return null;
    }
  }

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    _options?: R2PutOptions & { onlyIf?: R2Conditional; httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string, string> }
  ): Promise<R2Object> {
    fs.mkdirSync(path.dirname(path.join(UPLOAD_DIR, key)), { recursive: true });
    if (value instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = value.getReader();
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(chunk);
      }
      fs.writeFileSync(path.join(UPLOAD_DIR, key), Buffer.concat(chunks));
    } else if (value instanceof Blob) {
      fs.writeFileSync(path.join(UPLOAD_DIR, key), Buffer.from(await value.arrayBuffer()));
    } else if (value instanceof ArrayBuffer) {
      fs.writeFileSync(path.join(UPLOAD_DIR, key), Buffer.from(value));
    } else if (ArrayBuffer.isView(value)) {
      fs.writeFileSync(path.join(UPLOAD_DIR, key), Buffer.from(value.buffer));
    } else {
      fs.writeFileSync(path.join(UPLOAD_DIR, key), String(value));
    }
    return new R2ObjectStub(key, fs.statSync(path.join(UPLOAD_DIR, key)).size);
  }

  async delete(keys: string | string[]): Promise<void> {
    const arr = Array.isArray(keys) ? keys : [keys];
    for (const key of arr) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, key));
      } catch { /* ignore */ }
    }
  }

  async list(_options?: R2ListOptions): Promise<R2Objects> {
    return { objects: [], truncated: false, delimitedPrefixes: [] };
  }
}

// ── AI stub ───────────────────────────────────────────────────────────
class LocalAI implements Ai {
  async run(_model: string, _inputs: any, _options?: any): Promise<any> {
    console.warn('[AI] stub – no real AI available locally');
    return null;
  }
  async embedding?(_model: string, _inputs: any): Promise<any> {
    return { data: [] };
  }
  async textClassification?(_model: string, _inputs: any): Promise<any> {
    return [];
  }
}

// ── Create a local dev app ────────────────────────────────────────────
export function createLocalEnv(): Env {
  const d1 = new D1Adapter();
  runMigrations(d1);

  return {
    DB: d1 as unknown as D1Database,
    R2: new LocalR2Bucket() as unknown as R2Bucket,
    AI: new LocalAI() as unknown as Ai,
  };
}

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = createLocalEnv();
  }
  return cachedEnv;
}

// ── Serve the app directly (call this from the dev server entry) ──────
let server: ServerType | null = null;

export async function startDevServer(app: Hono<any>, port: number = 3000): Promise<ServerType> {
  const env = getEnv();

  // Wrap the app dispatch so every request gets the local env injected
  const wrapped = new Hono<any>();

  wrapped.use('*', async (c, next) => {
    // Re-create env ref each time so DB/R2 are the same instance
    c.env = env;
    await next();
  });

  // Serve static files from public/ directory (PWA assets, CSS, etc.)
  wrapped.use('/*', async (c, next) => {
    const url = new URL(c.req.url);
    const filePath = path.resolve(process.cwd(), 'public', url.pathname.slice(1));
    if (filePath.startsWith(path.resolve(process.cwd(), 'public')) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime: Record<string, string> = {
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.html': 'text/html',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
      };
      const content = fs.readFileSync(filePath);
      return c.newResponse(content, 200, {
        'Content-Type': mime[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
    }
    await next();
  });

  wrapped.route('/', app as any);

  // Also inject env into the original app on each request
  app.use('*', async (c, next) => {
    if (!c.env?.DB) {
      c.env = env;
    }
    await next();
  });

  return new Promise((resolve, reject) => {
    try {
      server = serve({
        fetch: wrapped.fetch,
        port,
      }, (listener) => {
        const addr = listener.address();
        const host = typeof addr === 'string' ? addr : `http://localhost:${addr?.port || port}`;
        console.log(`\n🚀 Local dev server at ${host}\n`);
        resolve(server!);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function stopDevServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
