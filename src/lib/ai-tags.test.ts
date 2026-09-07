import { describe, it, expect } from 'vitest';
import { normalizeTag, formatTags } from './ai-tags';

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
