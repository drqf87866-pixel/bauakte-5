import { describe, it, expect, vi, afterEach } from 'vitest';
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

function makeGeminiResponse(tags: string[], description: string) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify({ tags, description }) }],
        },
        finishReason: 'STOP',
      },
    ],
  };
}

function makeEnv(
  images: unknown,
  fetchImpl?: typeof fetch
) {
  const fetchMock = vi.fn(fetchImpl ?? (async () => ({
    ok: true,
    json: async () => makeGeminiResponse(['Dach', 'Dachstuhl'], 'Dachstuhl im Bau'),
    text: async () => '',
  } as Response)));

  return {
    GEMINI_API_KEY: 'test-key',
    IMAGES: images as unknown as ImagesBinding,
    _fetchMock: fetchMock,
  };
}

describe('analyzeImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downscales via the Images binding and sends a jpeg data-url to the Gemini API', async () => {
    const { images, chain } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images);
    vi.stubGlobal('fetch', env._fetchMock);

    const result = await analyzeImage(env, new ReadableStream(), 'image/jpeg');

    expect(images.input).toHaveBeenCalledTimes(1);
    expect(chain.transform).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1024, height: 1024, fit: 'scale-down' })
    );
    expect(chain.output).toHaveBeenCalledWith({ format: 'image/jpeg', quality: 80 });

    const [url, options] = env._fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('gemini-3.5-flash-lite:generateContent');
    expect(url).toContain('key=test-key');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(options.body as string);
    expect(body.contents[0].parts[0].inline_data.mime_type).toBe('image/jpeg');
    expect(body.contents[0].parts[0].inline_data.data).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(body.contents[0].parts[1].text).toContain('Baustellenfoto');
    expect(body.generationConfig.response_mime_type).toBe('application/json');

    expect(result).toEqual({ tags: ['Dach', 'Dachstuhl'], description: 'Dachstuhl im Bau' });
  });

  it('returns null for non-image mime types without calling the API', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images);
    vi.stubGlobal('fetch', env._fetchMock);

    const result = await analyzeImage(env, new ReadableStream(), 'application/pdf');

    expect(result).toBeNull();
    expect(env._fetchMock).not.toHaveBeenCalled();
    expect(images.input).not.toHaveBeenCalled();
  });

  it('returns null when the AI response is not parseable JSON', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images, async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'kein JSON hier' }] } }],
      }),
      text: async () => '',
    } as Response));
    vi.stubGlobal('fetch', env._fetchMock);

    const result = await analyzeImage(env, new ReadableStream(), 'image/jpeg');

    expect(result).toBeNull();
  });

  it('throws a descriptive German error when the Images binding fails', async () => {
    const { images } = mockImagesWithOutput({ reject: new Error('invalid image') });
    const env = makeEnv(images);
    vi.stubGlobal('fetch', env._fetchMock);

    await expect(analyzeImage(env, new ReadableStream(), 'image/jpeg')).rejects.toThrow(
      'Bild konnte nicht für die KI-Analyse aufbereitet werden'
    );
    expect(env._fetchMock).not.toHaveBeenCalled();
  });

  it('throws when GEMINI_API_KEY is missing', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images);
    env.GEMINI_API_KEY = '';
    vi.stubGlobal('fetch', env._fetchMock);

    await expect(analyzeImage(env, new ReadableStream(), 'image/jpeg')).rejects.toThrow(
      'GEMINI_API_KEY'
    );
    expect(env._fetchMock).not.toHaveBeenCalled();
  });

  it('throws when Gemini returns HTTP 429', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images, async () => ({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    } as Response));
    vi.stubGlobal('fetch', env._fetchMock);

    await expect(analyzeImage(env, new ReadableStream(), 'image/jpeg')).rejects.toThrow(
      'Gemini API 429'
    );
  });

  it('throws when Gemini returns HTTP 503 (overloaded)', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images, async () => ({
      ok: false,
      status: 503,
      text: async () => 'Service overloaded',
    } as Response));
    vi.stubGlobal('fetch', env._fetchMock);

    await expect(analyzeImage(env, new ReadableStream(), 'image/jpeg')).rejects.toThrow(
      'Gemini API 503'
    );
  });

  it('handles Gemini response with safety block', async () => {
    const { images } = mockImagesWithOutput({
      response: () => new Response(new Uint8Array([1, 2, 3])),
    });
    const env = makeEnv(images, async () => ({
      ok: true,
      json: async () => ({
        promptFeedback: { blockReason: 'SAFETY' },
      }),
      text: async () => '',
    } as Response));
    vi.stubGlobal('fetch', env._fetchMock);

    await expect(analyzeImage(env, new ReadableStream(), 'image/jpeg')).rejects.toThrow(
      'blockiert'
    );
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

  it('returns capacity for 500/503 overloaded errors', () => {
    expect(classifyAiError({ status: 500 })).toBe('capacity');
    expect(classifyAiError({ status: 503 })).toBe('capacity');
    expect(classifyAiError(new Error('overloaded'))).toBe('capacity');
    expect(classifyAiError(new Error('service unavailable'))).toBe('capacity');
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

  it('retries on capacity error (503 overloaded)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 503 })
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
