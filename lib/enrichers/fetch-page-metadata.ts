import * as cheerio from "cheerio";
import { buildDomainFallback } from "@/lib/utils/domain-gradient";
import type { PageMetadata } from "@/lib/enrichers/types";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HEAD_BYTES = 192 * 1024;

const META_KEYS = {
  title: ["og:title", "twitter:title"],
  image: ["og:image", "twitter:image", "twitter:image:src"],
  description: ["og:description", "twitter:description", "description"],
} as const;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function extractMetaContent(html: string, keys: readonly string[]) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["']`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return decodeHtmlEntities(match[1]);
      }
    }
  }

  return null;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function readMeta($: cheerio.CheerioAPI, names: string[]): string | null {
  for (const name of names) {
    const value =
      $(`meta[property="${name}"]`).attr("content") ??
      $(`meta[name="${name}"]`).attr("content");

    if (value?.trim()) {
      return decodeHtmlEntities(value);
    }
  }

  return null;
}

function extractJsonLdMetadata(headHtml: string) {
  const scripts = headHtml.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];

      for (const node of nodes) {
        if (!node || typeof node !== "object") {
          continue;
        }

        const record = node as Record<string, unknown>;
        const title =
          typeof record.name === "string"
            ? record.name
            : typeof record.headline === "string"
              ? record.headline
              : null;
        const description =
          typeof record.description === "string" ? record.description : null;
        const image = extractJsonLdImage(record.image);

        if (title || description || image) {
          return { title, description, image };
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return null;
}

function extractJsonLdImage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = extractJsonLdImage(item);
      if (image) {
        return image;
      }
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string") {
      return record.url;
    }
  }

  return null;
}

function parseHeadMetadata(headHtml: string) {
  const regexTitle =
    extractMetaContent(headHtml, META_KEYS.title) ?? extractTitleTag(headHtml);

  const regexImage = extractMetaContent(headHtml, META_KEYS.image);
  const regexDescription = extractMetaContent(headHtml, META_KEYS.description);

  if (regexTitle && regexImage && regexDescription) {
    return {
      title: regexTitle,
      image: regexImage,
      description: regexDescription,
    };
  }

  const $ = cheerio.load(headHtml, { scriptingEnabled: false });
  const jsonLd = extractJsonLdMetadata(headHtml);

  return {
    title:
      regexTitle ??
      readMeta($, [...META_KEYS.title]) ??
      jsonLd?.title ??
      $("title").first().text().trim() ??
      null,
    image: regexImage ?? readMeta($, [...META_KEYS.image]) ?? jsonLd?.image ?? null,
    description:
      regexDescription ??
      readMeta($, [...META_KEYS.description]) ??
      jsonLd?.description ??
      null,
  };
}

function resolveUrl(base: string, maybeRelative?: string | null) {
  if (!maybeRelative?.trim()) {
    return null;
  }

  try {
    return new URL(maybeRelative.trim(), base).href;
  } catch {
    return null;
  }
}

export function normalizeInputUrl(raw: string) {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http(s) URLs are allowed.");
  }

  return parsed;
}

async function readHeadSnippet(
  response: Response,
  outerSignal: AbortSignal
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    const headEnd = text.search(/<\/head>/i);
    return headEnd === -1 ? text.slice(0, MAX_HEAD_BYTES) : text.slice(0, headEnd + 7);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let html = "";
  let bytesRead = 0;

  try {
    while (!outerSignal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      bytesRead += value.byteLength;
      html += decoder.decode(value, { stream: true });

      const headEnd = html.search(/<\/head>/i);
      if (headEnd !== -1) {
        html = html.slice(0, headEnd + 7);
        await reader.cancel();
        break;
      }

      if (bytesRead >= MAX_HEAD_BYTES) {
        html = html.slice(0, MAX_HEAD_BYTES);
        await reader.cancel();
        break;
      }
    }
  } catch {
    // Use buffered head HTML.
  } finally {
    html += decoder.decode();
  }

  return html;
}

export async function fetchPageMetadata(rawUrl: string): Promise<PageMetadata> {
  const parsed = normalizeInputUrl(rawUrl);
  const url = parsed.href;
  const domain = parsed.hostname.replace(/^www\./, "");
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html;q=0.9,application/xhtml+xml;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.5",
        "User-Agent":
          "Mozilla/5.0 (compatible; BlinkEnricher/1.0; +https://blink.app)",
      },
      redirect: "follow",
      signal: timeoutSignal,
      cache: "no-store",
    });

    if (!response.ok) {
      return { url, domain, title: null, image: null, description: null };
    }

    const headHtml = await readHeadSnippet(response, timeoutSignal);
    const metadata = parseHeadMetadata(headHtml);

    return {
      url,
      domain,
      title: metadata.title,
      image: resolveUrl(url, metadata.image),
      description: metadata.description,
    };
  } catch {
    return { url, domain, title: null, image: null, description: null };
  }
}

export function withDomainFallback(
  metadata: PageMetadata,
  partial: {
    title?: string | null;
    image?: string | null;
    description?: string | null;
  } = {}
) {
  const domainFallback = buildDomainFallback(metadata.domain);
  const title = partial.title?.trim() || domainFallback.title;
  const image = partial.image?.trim() || null;

  return {
    url: metadata.url,
    domain: domainFallback.domain,
    title,
    image,
    description: partial.description?.trim() || null,
    fallback: {
      gradient: domainFallback.gradient,
      initial: domainFallback.initial,
      titleFromDomain: !partial.title?.trim(),
      imageFromFallback: !partial.image?.trim(),
    },
  };
}
