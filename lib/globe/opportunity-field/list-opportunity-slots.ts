import { filterPublishedMarketIntents } from "@/lib/globe/market/filter-published-market-intents";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { OPPORTUNITY_FIELD_MIN_FIELD_SCORE } from "@/lib/globe/opportunity-field/observation-constants";
import type {
  OpportunityFieldCopy,
  OpportunityPill,
  OpportunityRow,
  UserStateV1,
} from "@/lib/globe/opportunity-field/types";

function readPillTitle(seeking: MarketIntentRecord): string {
  const name =
    seeking.detail.productName.trim() ||
    seeking.title.trim() ||
    "맞춤";
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

export function listOpportunityPills(input: {
  seekings: readonly MarketIntentRecord[];
  pool: readonly MarketIntentRecord[];
  userState: UserStateV1;
  copy: OpportunityFieldCopy;
}): OpportunityPill[] {
  const published = filterPublishedMarketIntents(
    input.seekings.filter((row) => row.role === "seeking"),
  );

  return published
    .map((seeking) => {
      const rows = listOpportunityRows({
        seeking,
        pool: input.pool,
        userState: input.userState,
        copy: input.copy,
      });
      const bestScore = rows[0]?.fieldScore ?? 0;
      return {
        contextId: seeking.eventId,
        title: readPillTitle(seeking),
        count: rows.length,
        bestScore,
        seeking,
      };
    })
    .sort((a, b) => b.bestScore - a.bestScore || b.count - a.count);
}

export function listOpportunityRows(input: {
  seeking: MarketIntentRecord;
  pool: readonly MarketIntentRecord[];
  userState: UserStateV1;
  copy: OpportunityFieldCopy;
  minFieldScore?: number;
}): OpportunityRow[] {
  const listings = input.pool.filter((row) => row.role === "listing");
  const rows: OpportunityRow[] = [];

  for (const listing of listings) {
    const row = scoreMarketplaceOpportunityRow({
      seeking: input.seeking,
      listing,
      userState: input.userState,
      copy: input.copy,
    });
    if (!row) {
      continue;
    }
    const min = input.minFieldScore ?? OPPORTUNITY_FIELD_MIN_FIELD_SCORE;
    if (row.fieldScore < min) {
      continue;
    }
    rows.push(row);
  }

  return rows.sort((a, b) => b.fieldScore - a.fieldScore || b.scorePct - a.scorePct);
}
