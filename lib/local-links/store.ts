import type { LinkActionItem, LinkRow } from "@/types/database";
import { resolveCategory } from "@/lib/categories/resolve-category";
import type { EnrichedLink } from "@/lib/enrichers/types";
import { sharedLinkExpiresAt } from "@/lib/share/scrape-shared-link";

const STORAGE_KEY = "blink-local-links";

export function readLocalLinks(): LinkRow[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LinkRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLocalLink(link: LinkRow) {
  const existing = readLocalLinks().filter(
    (item) => item.original_url !== link.original_url
  );

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([link, ...existing])
  );
}

function defaultActions(originalUrl: string): LinkActionItem[] {
  return [
    {
      id: crypto.randomUUID(),
      label: "원본 열기",
      kind: "open",
      href: originalUrl,
      payload: { icon: "external-link" },
    },
  ];
}

export function buildLocalLink(input: {
  originalUrl: string;
  title: string;
  category?: string | null;
  thumbnailUrl?: string | null;
  expiresAt?: string | null;
  actions?: LinkActionItem[];
}): LinkRow {
  const now = new Date().toISOString();

  let domain = "link";
  try {
    domain = new URL(input.originalUrl).hostname.replace(/^www\./, "");
  } catch {
    // Keep fallback domain.
  }

  return {
    id: `local-${crypto.randomUUID()}`,
    user_id: null,
    original_url: input.originalUrl,
    title: input.title,
    thumbnail_url: input.thumbnailUrl ?? null,
    domain,
    category: input.category ?? "uncategorized",
    actions: input.actions?.length
      ? input.actions
      : defaultActions(input.originalUrl),
    created_at: now,
    expires_at: input.expiresAt ?? null,
  };
}

export function buildLocalLinkFromEnriched(enriched: EnrichedLink): LinkRow {
  return buildLocalLink({
    originalUrl: enriched.url,
    title: enriched.title,
    thumbnailUrl: enriched.image,
    category: resolveCategory(enriched),
    expiresAt: sharedLinkExpiresAt(),
    actions: enriched.actions,
  });
}
