import { describe, it, expect, vi } from 'vitest';
import { runAiTagging } from './upload';
import { MAX_AI_IMAGE_BYTES } from './ai-tags';

interface CapturedUpdate {
  sql: string;
  args: unknown[];
}

function streamOf(bytes: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}

function createMockEnv(overrides?: { dbFirst?: () => Promise<unknown> }) {
  const updates: CapturedUpdate[] = [];
  const dbFirst = overrides?.dbFirst || (async () => null);
  const db = {
    prepare: (sql: string) => {
      const stmt = {
        bind: (...args: unknown[]) => {
          if (sql.trim().startsWith('UPDATE uploads')) updates.push({ sql, args });
          return {
            run: async () => ({ success: true, meta: {} }),
            first: dbFirst,
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

  // Images-Binding-Mock: downscales to a tiny "jpeg" and returns it unchanged.
  const chain = {
    transform: vi.fn(() => chain),
    output: vi.fn(async () => ({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    })),
  };
  const images = {
    input: vi.fn(() => chain),
    hosted: {
      image: vi.fn(),
      upload: vi.fn(),
      list: vi.fn(),
      createDirectUpload: vi.fn(),
    },
  };

  return {
    db: db as unknown as D1Database,
    updates,
    get,
    run,
    env: {
      DB: db as unknown as D1Database,
      R2: { get } as unknown as R2Bucket,
      AI: { run } as unknown as Ai,
      IMAGES: images as unknown as ImagesBinding,
    },
  };
}

const r2Object = (size: number) => ({
  size,
  body: streamOf([1, 2, 3]),
});

describe('runAiTagging', () => {
  it('persists tags, ai_tags, description and status done on success', async () => {
    const { env, updates, get, run } = createMockEnv();
    get.mockResolvedValue(r2Object(10));
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
    // args: [tags, ai_tags, ai_description, tag_status, tag_error]
    expect(last.args[0]).toBe('beton, rohbau, dach');  // merged tags
    expect(last.args[1]).toBe('beton, rohbau, dach');  // ai_tags
    expect(last.args[2]).toBe('Betonarbeiten am Rohbau'); // ai_description
    expect(last.args[3]).toBe('done');                  // tag_status
    expect(last.args[4]).toBe('');                      // tag_error
  });

  it('marks upload as failed when the AI call throws', async () => {
    const { env, updates, get, run } = createMockEnv();
    get.mockResolvedValue(r2Object(10));
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
    // Fehlerfall: args = [tag_status, tag_error, uploadId] (Tags bleiben unangetastet)
    expect(last.args[0]).toBe('failed');
    expect(last.args[1]).toContain('workers ai unavailable');

    consoleSpy.mockRestore();
  });

  it('marks upload as failed when the response cannot be parsed', async () => {
    const { env, updates, get, run } = createMockEnv();
    get.mockResolvedValue(r2Object(10));
    run.mockResolvedValue({ response: 'kein JSON hier' });

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'image',
      r2Key: 'uploads/phase-1/up-1.jpg',
      mimeType: 'image/jpeg',
    });

    const last = updates[updates.length - 1];
    expect(last).toBeDefined();
    expect(last.args[0]).toBe('failed');
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
    expect(last.args[0]).toBe('failed');
    expect(last.args[1]).toContain('R2');
  });

  it('skips analysis (failed with hint) for images above the size limit', async () => {
    const { env, updates, get } = createMockEnv();
    get.mockResolvedValue(r2Object(MAX_AI_IMAGE_BYTES + 1));

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'image',
      r2Key: 'uploads/phase-1/huge.jpg',
      mimeType: 'image/jpeg',
    });

    const last = updates[updates.length - 1];
    expect(last).toBeDefined();
    expect(last.args[0]).toBe('failed');
    expect(String(last.args[1])).toContain('zu groß');
  });

  it('does not overwrite existing tags in the DB when the analysis fails', async () => {
    const { env, updates, get, run } = createMockEnv();
    get.mockResolvedValue(r2Object(10));
    run.mockRejectedValue(new Error('workers ai unavailable'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runAiTagging(env, {
      uploadId: 'up-1',
      type: 'image',
      r2Key: 'uploads/phase-1/up-1.jpg',
      mimeType: 'image/jpeg',
    });

    const last = updates[updates.length - 1];
    // Nur tag_status + tag_error werden geschrieben, tags/ai_tags/ai_description bleiben unangetastet
    expect(last.sql).not.toMatch(/tags/i);
    expect(last.args).toEqual(['failed', expect.stringContaining('workers ai unavailable'), 'up-1']);

    consoleSpy.mockRestore();
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

  it('merges manual_tags with new AI tags and writes ai_tags separately', async () => {
    const { env, updates, get, run } = createMockEnv({
      dbFirst: async () => ({
        manual_tags: 'Manuell1, Manuell2',
        ai_tags: '',
        tags: 'manuell1, manuell2',
      }),
    });
    get.mockResolvedValue(r2Object(1));
    run.mockResolvedValue({
      response: JSON.stringify({
        tags: ['Beton', 'Manuell1'],
        description: 'Test',
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
    // merged = deduplicated union: manual first, then ai, preserving order
    // Manuell1 appears in both manual and AI → deduplicated, first occurrence wins
    expect(last.args[0]).toBe('manuell1, manuell2, beton');
    // ai_tags = only the new AI tags (deduplicated from ai result)
    expect(last.args[1]).toBe('beton');
  });
});
