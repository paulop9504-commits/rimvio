import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

export function isYouTubeDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  return normalized === "youtu.be" || normalized.endsWith("youtube.com");
}

function preserveWatchParams(source: URL, target: URL) {
  for (const key of ["t", "start", "list", "si"]) {
    const value = source.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  }
}

export function normalizeYouTubeUrl(rawUrl: string) {
  const parsed = normalizeInputUrl(rawUrl);
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
    if (videoId) {
      const watch = new URL(`https://www.youtube.com/watch?v=${videoId}`);
      preserveWatchParams(parsed, watch);
      return watch.href;
    }
  }

  if (parsed.pathname.startsWith("/shorts/")) {
    const videoId = parsed.pathname.split("/")[2];
    if (videoId) {
      const watch = new URL(`https://www.youtube.com/watch?v=${videoId}`);
      preserveWatchParams(parsed, watch);
      return watch.href;
    }
  }

  return parsed.href;
}

export function isYouTubeShortsUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    return parsed.pathname.startsWith("/shorts/");
  } catch {
    return false;
  }
}
