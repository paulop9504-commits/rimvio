/**
 * Multi-platform capability output → Rimvio canonical cards + quality gate.
 */

export type RimvioCanonicalPrice = {
  readonly amount: number;
  readonly currency: string;
  readonly basis?: "unit" | "total" | "nightly";
};

export type RimvioCanonicalLocation = {
  readonly label: string;
  readonly lat?: number;
  readonly lng?: number;
};

export type RimvioCanonicalSeller = {
  readonly id: string;
  readonly name: string;
};

export type RimvioCanonicalItem = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly price?: RimvioCanonicalPrice;
  readonly location?: RimvioCanonicalLocation;
  readonly seller?: RimvioCanonicalSeller;
  readonly platformId: string;
  readonly platformName?: string;
  readonly capabilityId: string;
  readonly qualityScore: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

function parsePrice(row: Record<string, unknown>): RimvioCanonicalPrice | undefined {
  const nested = asRecord(row.price);
  const source = nested ?? row;
  const amount =
    readNumber(source, "amount", "value", "totalPriceKrw", "priceKrw", "price") ??
    readNumber(row, "totalPriceKrw", "priceKrw", "price");
  if (amount === undefined) return undefined;

  const currency =
    readString(source, "currency", "currencyCode") ??
    (readNumber(row, "totalPriceKrw") !== undefined || readNumber(row, "priceKrw") !== undefined
      ? "KRW"
      : "USD");

  const basisRaw = readString(source, "basis");
  const basis =
    basisRaw === "nightly" || basisRaw === "total" || basisRaw === "unit" ? basisRaw : undefined;

  return { amount, currency, basis };
}

function parseLocation(row: Record<string, unknown>): RimvioCanonicalLocation | undefined {
  const nested = asRecord(row.location) ?? asRecord(row.place);
  const source = nested ?? row;
  const label =
    readString(source, "label", "name", "address", "city") ??
    readString(row, "locationLabel", "address");
  if (!label) return undefined;
  return {
    label,
    lat: readNumber(source, "lat", "latitude"),
    lng: readNumber(source, "lng", "longitude", "lon"),
  };
}

function parseSeller(
  row: Record<string, unknown>,
  platformName?: string,
): RimvioCanonicalSeller | undefined {
  const nested = asRecord(row.seller) ?? asRecord(row.vendor);
  const source = nested ?? row;
  const name = readString(source, "name", "sellerName", "vendorName") ?? platformName;
  const id = readString(source, "id", "sellerId", "vendorId") ?? name;
  if (!id || !name) return undefined;
  return { id, name };
}

function scoreCanonicalItem(item: Omit<RimvioCanonicalItem, "qualityScore">): number {
  let score = 0.35;
  if (item.title.length >= 2) score += 0.25;
  if (item.price && item.price.amount > 0) score += 0.2;
  if (item.location?.label) score += 0.1;
  if (item.seller?.name) score += 0.1;
  return Math.min(1, score);
}

function normalizeRow(
  row: Record<string, unknown>,
  meta: {
    readonly platformId: string;
    readonly capabilityId: string;
    readonly platformName?: string;
    readonly index: number;
  },
): RimvioCanonicalItem | null {
  const title =
    readString(row, "title", "name", "label", "productName", "hotelName") ??
    readString(asRecord(row.item) ?? {}, "title", "name");
  if (!title) return null;

  const id =
    readString(row, "id", "itemId", "listingId", "placeId") ??
    `${meta.platformId}:${meta.capabilityId}:${meta.index}`;

  const draft: Omit<RimvioCanonicalItem, "qualityScore"> = {
    id,
    title,
    subtitle: readString(row, "subtitle", "description", "summary"),
    price: parsePrice(row),
    location: parseLocation(row),
    seller: parseSeller(row, meta.platformName),
    platformId: meta.platformId,
    platformName: meta.platformName,
    capabilityId: meta.capabilityId,
  };

  const qualityScore = scoreCanonicalItem(draft);
  if (qualityScore < 0.45) return null;

  return { ...draft, qualityScore };
}

/** Map raw platform invoke output to canonical Rimvio cards. */
export function normalizeCapabilityOutput(
  output: Record<string, unknown> | undefined,
  meta: {
    readonly platformId: string;
    readonly capabilityId: string;
    readonly platformName?: string;
  },
): readonly RimvioCanonicalItem[] {
  if (!output) return [];

  const listCandidate =
    (Array.isArray(output.items) && output.items) ||
    (Array.isArray(output.results) && output.results) ||
    (Array.isArray(output.listings) && output.listings) ||
    (Array.isArray(output.hotels) && output.hotels) ||
    null;

  if (listCandidate) {
    return listCandidate
      .map((entry, index) => normalizeRow(asRecord(entry) ?? {}, { ...meta, index }))
      .filter((item): item is RimvioCanonicalItem => item !== null)
      .sort((a, b) => b.qualityScore - a.qualityScore);
  }

  const single = normalizeRow(output, { ...meta, index: 0 });
  return single ? [single] : [];
}

/** Merge multi-platform batches — dedupe by id, rank by quality. */
export function fuseCanonicalResults(
  batches: readonly { readonly items: readonly RimvioCanonicalItem[] }[],
): readonly RimvioCanonicalItem[] {
  const byId = new Map<string, RimvioCanonicalItem>();
  for (const batch of batches) {
    for (const item of batch.items) {
      const prev = byId.get(item.id);
      if (!prev || item.qualityScore > prev.qualityScore) {
        byId.set(item.id, item);
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.qualityScore - a.qualityScore);
}
