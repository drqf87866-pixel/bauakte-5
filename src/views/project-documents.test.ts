import { describe, it, expect } from 'vitest';
import { documentsUrl } from './project-documents';

const BASE = '/projects/p1/documents';

describe('documentsUrl', () => {
  it('sets a tag without injecting it into the phase filter (regression)', () => {
    // Bug: the tag string used to leak into phases=, which filtered by a
    // non-existent phase id and always returned an empty grid.
    const url = documentsUrl(BASE, [], undefined, undefined, { tag: 'innenausbau' });
    expect(url).toBe(BASE + '?tag=innenausbau');
    expect(url).not.toContain('phases=');
  });

  it('keeps active phases when setting a tag', () => {
    const url = documentsUrl(BASE, ['ph-1'], undefined, undefined, { tag: 'bad' });
    expect(url).toBe(BASE + '?phases=ph-1&tag=bad');
  });

  it('encodes umlauts in tags', () => {
    const url = documentsUrl(BASE, [], undefined, undefined, { tag: 'sanitär' });
    expect(url).toBe(BASE + '?tag=sanit%C3%A4r');
  });

  it('deactivates the tag when clicking the active tag again', () => {
    const url = documentsUrl(BASE, ['ph-1'], 'bad', undefined, { tag: 'bad' });
    expect(url).toBe(BASE + '?phases=ph-1');
  });

  it('clears the tag via clearTag and keeps phases', () => {
    const url = documentsUrl(BASE, ['ph-1'], 'bad', 'suche', { clearTag: true });
    expect(url).toBe(BASE + '?phases=ph-1&q=suche');
  });

  it('adds a phase via toggle', () => {
    const url = documentsUrl(BASE, ['ph-1'], undefined, undefined, { phase: 'ph-2' });
    expect(url).toBe(BASE + '?phases=' + encodeURIComponent('ph-1,ph-2'));
  });

  it('removes a phase via toggle', () => {
    const url = documentsUrl(BASE, ['ph-1', 'ph-2'], undefined, undefined, { phase: 'ph-1' });
    expect(url).toBe(BASE + '?phases=ph-2');
  });

  it('returns plain base url without any filters', () => {
    const url = documentsUrl(BASE, [], undefined, undefined);
    expect(url).toBe(BASE);
  });
});
