/**
 * Wikipedia (ko) place summary — Reality Provider for hangul queries
 * Nominatim often misses (e.g. 츠텐카쿠 → 쓰텐카쿠). Not a landmark seed catalog.
 */

const WIKI_SUMMARY_BASE =
  "https://ko.wikipedia.org/api/rest_v1/page/summary/";
const USER_AGENT = "RimvioLocationEngine/1.0 (https://rimvio.com; location-os)";

export type WikipediaPlaceHit = {
  readonly titleKo: string;
  readonly displayTitle: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly pageUrl: string | null;
  readonly description: string | null;
};

/**
 * Resolve hangul (or any) place name via Korean Wikipedia summary.
 * May return a canonical title without coordinates (caller can re-query Nominatim).
 */
export async function wikipediaPlaceSummary(
  query: string,
): Promise<WikipediaPlaceHit | null> {
  const q = query.trim();
  if (!q || q.length < 2) return null;

  try {
    const url = `${WIKI_SUMMARY_BASE}${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      title?: string;
      displaytitle?: string;
      description?: string;
      coordinates?: { lat?: number; lon?: number };
      content_urls?: { desktop?: { page?: string } };
      type?: string;
    };
    if (json.type === "disambiguation") return null;
    const title = json.title?.trim();
    if (!title) return null;
    const lat = json.coordinates?.lat;
    const lng = json.coordinates?.lon;
    return {
      titleKo: title,
      displayTitle: json.displaytitle?.replace(/<[^>]+>/gu, "").trim() || title,
      lat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
      lng: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
      pageUrl: json.content_urls?.desktop?.page ?? null,
      description: json.description?.trim() || null,
    };
  } catch {
    return null;
  }
}
