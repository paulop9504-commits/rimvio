import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";
import type { LinkActionItem } from "@/types/database";

const PLACE_URL_PATTERN =
  /map\.kakao|place\.map|map\.naver|naver\.me|google\.com\/maps|maps\.google|\/place\/|\/maps\//i;

export function isPlaceRelatedUrl(url: string) {
  return PLACE_URL_PATTERN.test(url);
}

export function buildKakaoMapHref(sourceUrl: string) {
  if (/map\.kakao/i.test(sourceUrl)) {
    return sourceUrl;
  }

  return `https://map.kakao.com/link/map/${encodeURIComponent(sourceUrl)}`;
}

export function buildKakaoMapSearchHref(query: string) {
  const q = encodeURIComponent(query.trim());
  return `kakaomap://search?q=${q}`;
}

export function buildKakaoMapSearchWebHref(query: string) {
  const q = encodeURIComponent(query.trim());
  return `http://m.map.kakao.com/scheme/search?q=${q}`;
}

export function buildNaverMapSearchHref(query: string) {
  const q = encodeURIComponent(query.trim());
  return `nmap://search?query=${q}&appname=Blink`;
}

export function buildNaverMapSearchWebHref(query: string) {
  const q = encodeURIComponent(query.trim());
  return `https://map.naver.com/p/search/${q}`;
}

export function buildKakaoMapAction(
  sourceUrl: string,
  copyText?: string | null
): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: "카카오맵 바로 열기",
    href: buildKakaoMapHref(sourceUrl),
    payload: {
      icon: "kakaomap",
      contextBoost: "installed-app",
      ...(copyText?.trim() ? { copyText: copyText.trim() } : {}),
    },
  };
}

export function buildKakaoMapSearchAction(
  query: string
): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: `🗺 ${query.trim().slice(0, 10)} 검색`,
    href: buildKakaoMapSearchHref(query),
    payload: {
      icon: "kakaomap",
      copyText: query.trim(),
      contextBoost: "installed-app",
    },
  };
}

export function buildNaverMapSearchAction(query: string): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: `📍 네이버지도 · ${query.trim().slice(0, 10)}`,
    href: buildNaverMapSearchHref(query),
    payload: {
      icon: "map",
      copyText: query.trim(),
    },
  };
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || null;
    }

    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/")[2] ?? null;
    }

    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

export function buildYouTubeAppHref(rawUrl: string): string | null {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    return null;
  }

  const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
  const start = parsed.searchParams.get("t") ?? parsed.searchParams.get("start");
  const suffix = start ? `&t=${encodeURIComponent(start)}` : "";

  return `youtube://watch?v=${videoId}${suffix}`;
}

export function buildGoogleMapsNavigateHref(sourceUrl: string) {
  try {
    const parsed = new URL(sourceUrl);
    const destination = `${parsed.pathname}${parsed.search}`;

    if (/google\.com\/maps/i.test(sourceUrl)) {
      const params = new URLSearchParams(parsed.search);
      const query = params.get("q") ?? params.get("query") ?? destination;

      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sourceUrl)}`;
  } catch {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sourceUrl)}`;
  }
}

export function parseGitHubCopyLabel(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\/([^/]+)(?:\/(pull|issues)\/(\d+))?/i);
  if (!match) {
    return null;
  }

  const [, owner, repo, kind, number] = match;
  if (kind && number) {
    return `${owner}/${repo}#${kind === "pull" ? "PR" : "issue"}-${number}`;
  }

  return `${owner}/${repo}`;
}
