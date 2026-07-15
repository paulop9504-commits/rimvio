import type { FastScanCandidate } from "@/engines/research/schema";

export type ResearchCandidateProvider = {
  readonly id: string;
  listCandidates(input: {
    queries: readonly string[];
    limit?: number;
  }): Promise<readonly FastScanCandidate[]> | readonly FastScanCandidate[];
};

/** Test / offline fixture provider — no network. */
export function createFixtureCandidateProvider(
  rows: readonly FastScanCandidate[],
): ResearchCandidateProvider {
  return {
    id: "fixture",
    listCandidates(input) {
      const q = input.queries.join(" ").toLowerCase();
      const limit = input.limit ?? 24;
      const filtered = rows.filter((row) => {
        if (!q.trim()) {
          return true;
        }
        const blob = `${row.title} ${row.snippet} ${row.domain}`.toLowerCase();
        return input.queries.some((query) =>
          blob.includes(query.trim().toLowerCase().slice(0, 12)),
        );
      });
      const pool = filtered.length > 0 ? filtered : rows;
      return pool.slice(0, limit);
    },
  };
}

/**
 * Map discovery inventory-like rows → Fast Scan candidates (snippet only).
 * No full-page fetch.
 */
export function candidatesFromInventorySnippets(
  rows: readonly {
    id: string;
    title: string;
    snippet?: string | null;
    domain?: string | null;
    priceKrw?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    kind?: string | null;
    lat?: number | null;
    lng?: number | null;
  }[],
): FastScanCandidate[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    snippet: (row.snippet ?? "").trim() || `${row.title} 후보`,
    domain: (row.domain ?? "inventory.rimvio").trim() || "inventory.rimvio",
    reviewCount: row.reviewCount ?? null,
    popularity:
      row.rating != null && Number.isFinite(row.rating)
        ? Math.min(1, Math.max(0, row.rating / 5))
        : null,
    mediaType: "listing" as const,
    language: "ko",
    metadata: {
      priceKrw: row.priceKrw ?? null,
      kind: row.kind ?? null,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
    },
  }));
}

export function mergeProviders(
  providers: readonly ResearchCandidateProvider[],
): ResearchCandidateProvider {
  return {
    id: "merged",
    async listCandidates(input) {
      const chunks = await Promise.all(
        providers.map((p) => Promise.resolve(p.listCandidates(input))),
      );
      const byId = new Map<string, FastScanCandidate>();
      for (const chunk of chunks) {
        for (const row of chunk) {
          if (!byId.has(row.id)) {
            byId.set(row.id, row);
          }
        }
      }
      return [...byId.values()].slice(0, input.limit ?? 48);
    },
  };
}
