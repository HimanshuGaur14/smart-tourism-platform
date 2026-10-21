import { describe, expect, it } from 'vitest';
import { findPhoto, stripHtml, wikipediaTitle, type FetchLike } from '../scripts/photos.js';

/** Fake Wikipedia + Commons APIs keyed by host. */
function fakeFetch(lead: string | null, commons: Record<string, unknown> | null): FetchLike {
  return async (url) => {
    const body = url.startsWith('https://en.wikipedia.org/')
      ? { query: { pages: { '1': lead ? { pageimage: lead } : {} } } }
      : { query: { pages: { '-1': commons ? { imageinfo: [commons] } : { missing: '' } } } };
    return { ok: true, status: 200, json: async () => body };
  };
}

const commonsInfo = (license: string) => ({
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Hundru.jpg',
  thumburl:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Hundru.jpg/1280px-Hundru.jpg',
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Hundru.jpg',
  extmetadata: {
    Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Ravi">Ravi &amp; Co</a>' },
    LicenseShortName: { value: license },
  },
});

describe('photo import', () => {
  it('parses Wikipedia links and strips HTML credits', () => {
    expect(wikipediaTitle('https://en.wikipedia.org/wiki/Hundru_Falls')).toBe('Hundru_Falls');
    expect(wikipediaTitle('https://example.com/wiki/X')).toBeNull();
    expect(stripHtml('<a href="x">Ravi &amp; Co</a>')).toBe('Ravi & Co');
  });

  it('returns a credited, freely licensed Commons photo', async () => {
    const photo = await findPhoto(
      'https://en.wikipedia.org/wiki/Hundru_Falls',
      fakeFetch('Hundru.jpg', commonsInfo('CC BY-SA 4.0')),
    );
    expect(photo).toEqual({
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Hundru.jpg/1280px-Hundru.jpg',
      credit: 'Ravi & Co / Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hundru.jpg',
    });
  });

  it('skips non-free, missing and unlicensed images', async () => {
    const url = 'https://en.wikipedia.org/wiki/Hundru_Falls';
    expect(await findPhoto(url, fakeFetch(null, null))).toHaveProperty('skipped');
    // Fair-use files live on Wikipedia, not Commons.
    expect(await findPhoto(url, fakeFetch('Poster.jpg', null))).toHaveProperty('skipped');
    expect(await findPhoto(url, fakeFetch('X.jpg', commonsInfo('Fair use')))).toHaveProperty(
      'skipped',
    );
    expect(await findPhoto(url, fakeFetch('X.jpg', commonsInfo('')))).toHaveProperty('skipped');
  });
});
