export type ShopCandidate = {
  href: string;
  price: number;
  rating: number | null;
  reviewCount: number;
  rocket: boolean;
};

/** Cheapest among listings that look decent (rating + reviews). */
export function pickBestValueCandidate(
  items: readonly ShopCandidate[],
): ShopCandidate | null {
  const priced = items.filter((row) => row.price > 0 && row.href.trim().length > 0);
  if (priced.length === 0) {
    return null;
  }
  const wellRated = priced.filter(
    (row) => (row.rating ?? 0) >= 4 && row.reviewCount >= 30,
  );
  const okRated = priced.filter((row) => (row.rating ?? 0) >= 3.8);
  const rocket = priced.filter((row) => row.rocket);
  const pool =
    wellRated.length > 0
      ? wellRated
      : okRated.length > 0
        ? okRated
        : rocket.length > 0
          ? rocket
          : priced;
  return pool.reduce((best, row) => (row.price < best.price ? row : best));
}
