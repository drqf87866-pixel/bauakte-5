import { describe, it, expect, vi } from 'vitest';
import { normalizeTag, formatTags, arrayBufferToBase64, analyzeImage, classifyAiError, runWithRetry, AiAnalysisError } from './ai-tags';

describe('normalizeTag', () => {
  it('lowercases and trims whitespace', () => {
    expect(normalizeTag('  Dach  ')).toBe('dach');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeTag('Innen   Ausbau')).toBe('innen ausbau');
  });

  it('returns empty string for empty / whitespace input', () => {
    expect(normalizeTag('')).toBe('');
    expect(normalizeTag('   ')).toBe('');
  });

  it('maps common German plurals to singular', () => {
    expect(normalizeTag('Rohre')).toBe('rohr');
    expect(normalizeTag('Steckdosen')).toBe('steckdose');
    expect(normalizeTag('Türen')).toBe('tür');
    expect(normalizeTag('Tuere')).toBe('tür');
    expect(normalizeTag('Fliesen')).toBe('fliese');
    expect(normalizeTag('Kabel')).toBe('kabel');
    expect(normalizeTag('Heizkörper')).toBe('heizkörper');
  });

  it('leaves already-singular words unchanged', () => {
    expect(normalizeTag('Dach')).toBe('dach');
    expect(normalizeTag('Fenster')).toBe('fenster');
  });
});

describe('formatTags', () => {
  it('joins normalized tags comma-separated', () => {
    expect(formatTags(['Dach', 'Fassade', 'Innenausbau'])).toBe('dach, fassade, innenausbau');
  });

  it('removes duplicates after normalization', () => {
    expect(formatTags(['Rohre', 'Rohr', 'ROHR'])).toBe('rohr');
  });

  it('preserves first-seen order', () => {
    expect(formatTags(['Fassade', 'Dach', 'Dach'])).toBe('fassade, dach');
  });

  it('drops empty / whitespace-only entries', () => {
    expect(formatTags(['Dach', '', '  ', 'Fassade'])).toBe('dach, fassade');
  });

  it('returns empty string for empty input', () => {
    expect(formatTags([])).toBe('');
    expect(formatTags(['', '  '])).toBe('');
  });
});

describe('arrayBufferToBase64', () => {
  it('encodes bytes as base64', () => {
    const bytes = new TextEncoder().encode('Hello');
    expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).toBe(btoa('Hello'));
  });

  it('handles empty buffers', () => {
    expect(arrayBufferToBase64(new ArrayBuffer(0))).toBe('');
  });

  it('handles buffers larger than one chunk', () => {
    const raw = 'x'.repeat(0x8000 + 100);
    const bytes = new TextEncoder().encode(raw);
    expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).toBe(btoa(raw));
  });
});

function mockImagesWithOutput(output: { response: () => Response } | { reject: unknown }) {
  const chain = {
    transform: vi.fn(() => chain),
    output: vi.fn(async () => {
      if ('reject' in output) throw output.reject;
      return output;
    }),
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
  return { images, chain };
}

function makeEnv(images: unknown, run: (inputs: unknown) => Promise<unknown>) {
  return {
    AI: { run: vi.fn(run) } as unknown as Ai,
    IMAGES: images as unknown as ImagesBinding,
  };
}

describe('analyzeImage', () => {
  it('downscales via the Images binding and sends a jpeg data-url to the AI', async () => {
    const { images, chain } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images, async () => ({
      response: JSON.stringify({ tags: ['Dach', 'Dachstuhl'], description: 'Dachstuhl im Bau' }),
    }));

    const result = await analyzeImage(env, new ReadableStream(), 'image/jpeg');

    expect(images.input).toHaveBeenCalledTimes(1);
    expect(chain.transform).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1024, height: 1024, fit: 'scale-down' })
    );
    expect(chain.output).toHaveBeenCalledWith({ format: 'image/jpeg', quality: 80 });

    const aiCall = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(aiCall[0]).toBe('@cf/meta/llama-3.2-11b-vision-instruct');
    expect(aiCall[1].image).toMatch(/^data:image\/jpeg;base64,AQID$/);

    expect(result).toEqual({ tags: ['Dach', 'Dachstuhl'], description: 'Dachstuhl im Bau' });
  });

  it('returns null for non-image mime types without calling the AI', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images, async () => ({ response: '{}' }));

    const result = await analyzeImage(env, new ReadableStream(), 'application/pdf');

    expect(result).toBeNull();
    expect(env.AI.run).not.toHaveBeenCalled();
    expect(images.input).not.toHaveBeenCalled();
  });

  it('returns null when the AI response is not parseable JSON', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images, async () => ({ response: 'kein JSON' }));

    const result = await analyzeImage(env, new ReadableStream(), 'image/jpeg');

    expect(result).toBeNull();
  });

  it('throws a descriptive German error when the Images binding fails', async () => {
    const { images } = mockImagesWithOutput({ reject: new Error('invalid image') });
    const env = makeEnv(images, async () => ({ response: '{}' }));

    await expect(analyzeImage(env, new ReadableStream(), 'image/jpeg')).rejects.toThrow(
      'Bild konnte nicht für die KI-Analyse aufbereitet werden'
    );
    expect(env.AI.run).not.toHaveBeenCalled();
  });
});

describe('classifyAiError', () => {
  it('returns rate_limited for 429 errors', () => {
    expect(classifyAiError({ status: 429 })).toBe('rate_limited');
    expect(classifyAiError(new Error('429 too many requests'))).toBe('rate_limited');
    expect(classifyAiError(new Error('rate limit exceeded'))).toBe('rate_limited');
  });

  it('returns capacity for 3040 errors', () => {
    expect(classifyAiError({ status: 3040 })).toBe('capacity');
    expect(classifyAiError(new Error('3040 out of capacity'))).toBe('capacity');
    expect(classifyAiError(new Error('no more data centers to forward'))).toBe('capacity');
  });

  it('returns model_unavailable for 5035 errors', () => {
    expect(classifyAiError({ status: 5035 })).toBe('model_unavailable');
    expect(classifyAiError(new Error('5035 requires workers paid'))).toBe('model_unavailable');
    expect(classifyAiError(new Error('model not available'))).toBe('model_unavailable');
  });

  it('returns unknown for other errors', () => {
    expect(classifyAiError(new Error('something went wrong'))).toBe('unknown');
    expect(classifyAiError(new Error(''))).toBe('unknown');
  });
});

describe('runWithRetry', () => {
  it('returns result on first attempt if successful', async () => {
    const fn = vi.fn(async () => 'ok');
    const result = await runWithRetry(fn, 2);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on rate_limited error (429)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce('ok');
    const result = await runWithRetry(fn, 2);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on capacity error (3040)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('3040 out of capacity'))
      .mockResolvedValueOnce('ok');
    const result = await runWithRetry(fn, 2);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on model_unavailable (5035)', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 5035 });
    await expect(runWithRetry(fn, 2)).rejects.toThrow(AiAnalysisError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on unknown errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('random failure'));
    await expect(runWithRetry(fn, 2)).rejects.toThrow(AiAnalysisError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries then throws AiAnalysisError', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 429 });
    await expect(runWithRetry(fn, 2)).rejects.toThrow(AiAnalysisError);
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('returns AiAnalysisError with correct errorType', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 429 });
    try {
      await runWithRetry(fn, 0);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AiAnalysisError);
      expect((err as AiAnalysisError).errorType).toBe('rate_limited');
    }
  });
});
