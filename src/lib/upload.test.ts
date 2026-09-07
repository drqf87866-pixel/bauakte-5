import { describe, it, expect, vi } from 'vitest';
import { runAiTagging } from './upload';

interface CapturedUpdate {
  sql: string;
  args: unknown[];
}

function createMockEnv() {
  const updates: CapturedUpdate[] = [];
  const db = {
    prepare: (sql: string) => {
      const stmt = {
        bind: (...args: unknown[]) => {
          if (sql.trim().startsWith('UPDATE uploads')) updates.push({ sql, args });
          return {
            run: async () => ({ success: true, meta: {} }),
            first: async () => null,
            all: async () => ({ results: [], success: true }),
          };
        },
      };
      return stmt as unknown as ReturnType<D1Database['prepare']>;
    },
    batch: vi.fn(async () => []),
    exec: vi.fn(),
    dump: vi.fn(),
  };

  const get = vi.fn<(key: string) => Promise<object | null>>();

  const run = vi.fn<(...args: unknown[]) => Promise<{ response?: string }>>();

  return {
    db: db as unknown as D1Database,
    updates,
    get,
    run,
    env: {
      DB: db as unknown as D1Database,
      R2: { get } as unknown as R2Bucket,
      AI: { run } as unknown as Ai,
    },
  };
}

describe('runAiTagging', () => {
  it('persists tags, description and status done on success', async () => {
    const { env, updates, get, run } = createMockEnv();
    get.mockResolvedValue({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    run.mockResolvedValue({
      response: JSON.stringify({
        tags: ['Beton', 'Rohbau', 'Dach'],
        description: 'Betonarbeiten am Rohbau',
      }),
    });

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'image',
      r2Key: 'uploads/phase-1/up-1.jpg',
      mimeType: 'image/jpeg',
    });

    const last = updates[updates.length - 1];
    expect(last).toBeDefined();
    expect(last.args[0]).toBe('beton, rohbau, dach');
    expect(last.args[1]).toBe('Betonarbeiten am Rohbau');
    expect(last.args[2]).toBe('done');
    expect(last.args[3]).toBe('');
  });

  it('marks upload as failed when the AI call throws', async () => {
    const { env, updates, get, run } = createMockEnv();
    get.mockResolvedValue({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    run.mockRejectedValue(new Error('workers ai unavailable'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'image',
      r2Key: 'uploads/phase-1/up-1.jpg',
      mimeType: 'image/jpeg',
    });

    const last = updates[updates.length - 1];
    expect(last).toBeDefined();
    expect(last.args[2]).toBe('failed');
    expect(last.args[3]).toContain('workers ai unavailable');

    consoleSpy.mockRestore();
  });

  it('marks upload as failed when the response cannot be parsed', async () => {
    const { env, updates, get, run } = createMockEnv();
    get.mockResolvedValue({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    run.mockResolvedValue({ response: 'kein JSON hier' });

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'image',
      r2Key: 'uploads/phase-1/up-1.jpg',
      mimeType: 'image/jpeg',
    });

    const last = updates[updates.length - 1];
    expect(last).toBeDefined();
    expect(last.args[2]).toBe('failed');
  });

  it('marks upload as failed when the R2 object is missing', async () => {
    const { env, updates, get } = createMockEnv();
    get.mockResolvedValue(null);

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'image',
      r2Key: 'uploads/phase-1/missing.jpg',
      mimeType: 'image/jpeg',
    });

    const last = updates[updates.length - 1];
    expect(last).toBeDefined();
    expect(last.args[2]).toBe('failed');
    expect(last.args[3]).toContain('R2');
  });

  it('does nothing for non-image uploads', async () => {
    const { env, updates, get, run } = createMockEnv();

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'doc',
      r2Key: 'uploads/phase-1/plan.pdf',
      mimeType: 'application/pdf',
    });

    expect(get).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });
});
