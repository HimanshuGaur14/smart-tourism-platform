/**
 * Finds a freely licensed lead photo for a destination via its Wikipedia article and
 * Wikimedia Commons, with the author, licence and source page needed for attribution.
 * Only files hosted on Commons under an allowed free licence are accepted; fair-use
 * images (hosted on Wikipedia itself) and anything unlicensed are skipped.
 */
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface PhotoCandidate {
  url: string;
  credit: string;
  license: string;
  sourceUrl: string;
}

const USER_AGENT = 'SmartTourismPlatform/0.1 (local photo import; https://github.com)';
const FREE_LICENSE = /^(CC0|CC BY(-SA)? \d(\.\d)?|CC BY(-SA)?|Public domain|PD)/i;

/** "https://en.wikipedia.org/wiki/Hundru_Falls" -> "Hundru_Falls" */
export function wikipediaTitle(url: string): string | null {
  const m = /^https:\/\/en\.wikipedia\.org\/wiki\/([^?#]+)$/.exec(url);
  return m ? decodeURIComponent(m[1]!) : null;
}

/** Commons metadata is HTML; keep the visible text only. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getJson(fetchImpl: FetchLike, url: string): Promise<unknown> {
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

type Pages = { query?: { pages?: Record<string, Record<string, unknown>> } };
const firstPage = (body: unknown) => Object.values((body as Pages).query?.pages ?? {})[0];

export async function findPhoto(
  articleUrl: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<PhotoCandidate | { skipped: string }> {
  const title = wikipediaTitle(articleUrl);
  if (!title) return { skipped: 'not an English Wikipedia link' };

  const page = firstPage(
    await getJson(
      fetchImpl,
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&redirects=1&titles=${encodeURIComponent(title)}`,
    ),
  );
  const file = page?.pageimage;
  if (typeof file !== 'string') return { skipped: 'article has no lead image' };

  const info = firstPage(
    await getJson(
      fetchImpl,
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&titles=${encodeURIComponent(`File:${file}`)}`,
    ),
  );
  const ii = (info?.imageinfo as Array<Record<string, unknown>> | undefined)?.[0];
  if (!ii) return { skipped: 'lead image is not on Wikimedia Commons (possibly non-free)' };

  const meta = (ii.extmetadata ?? {}) as Record<string, { value?: string } | undefined>;
  const license = stripHtml(meta.LicenseShortName?.value ?? '');
  if (!FREE_LICENSE.test(license))
    return { skipped: `licence not allowed: "${license || 'none'}"` };
  const artist = stripHtml(meta.Artist?.value ?? '') || 'Unknown author';
  const url = (ii.thumburl ?? ii.url) as string | undefined;
  const sourceUrl = ii.descriptionurl as string | undefined;
  if (!url?.startsWith('https://upload.wikimedia.org/') || !sourceUrl)
    return { skipped: 'unexpected image URL' };

  return { url, credit: `${artist} / Wikimedia Commons`, license, sourceUrl };
}
