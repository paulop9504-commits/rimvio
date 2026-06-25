#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";
import { buildUserStateV1 } from "../lib/globe/opportunity-field/build-user-state";
import {
  listOpportunityPills,
  listOpportunityRows,
} from "../lib/globe/opportunity-field/list-opportunity-slots";
import { scoreMarketplaceOpportunityRow } from "../lib/globe/opportunity-field/score-marketplace-opportunity-row";
import type { OpportunityFieldCopy } from "../lib/globe/opportunity-field/types";

const COPY: OpportunityFieldCopy = {
  reasonBattery: "배터리 조건 일치",
  reasonStorage: "용량 조건 일치",
  reasonPrice: "가격 범위 일치",
  reasonDistance: "집 근처 거래 가능",
  reasonRecency: "최근 등록된 매물",
  reasonCondition: "상태 조건 일치",
  reasonFallback: "맞춤 조건에 가까워요",
};

function phoneIntent(
  partial: Partial<MarketIntentRecord> & Pick<MarketIntentRecord, "id" | "eventId" | "role">,
): MarketIntentRecord {
  return {
    categoryId: "market.phone",
    title: "아이폰 15",
    priceMinKrw: 650_000,
    priceMaxKrw: 750_000,
    radiusKm: 5,
    anchorLat: 37.544,
    anchorLng: 127.055,
    placeLabel: "성수동",
    peakHour: null,
    confirmedAtIso: "2026-06-23T10:00:00+09:00",
    active: true,
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      productName: "아이폰 15",
      publishedExternal: true,
      prioritySlots: {
        price: 700_000,
        battery_health: 85,
        cosmetic_grade: "good",
      },
    },
    ...partial,
  };
}

function main() {
  const seeking = phoneIntent({ id: "mi-s", eventId: "ev-s", role: "seeking" });
  const listing = phoneIntent({
    id: "mi-l",
    eventId: "ev-l",
    role: "listing",
    anchorLat: 37.545,
    anchorLng: 127.056,
    detail: {
      ...seeking.detail,
      prioritySlots: {
        price: 700_000,
        battery_health: 88,
        cosmetic_grade: "good",
      },
    },
  });

  const userState = buildUserStateV1({
    lat: 37.544,
    lng: 127.055,
    capturedAtIso: new Date().toISOString(),
    primaryEventId: seeking.eventId,
    now: new Date("2026-06-26T12:00:00+09:00"),
  });

  const row = scoreMarketplaceOpportunityRow({
    seeking,
    listing,
    userState,
    copy: COPY,
  });
  assert.ok(row);
  assert.ok(row.scorePct >= 70);
  assert.ok(row.reasonKo.length > 0);
  assert.equal(row.listingId, listing.id);

  const focusBoostRow = scoreMarketplaceOpportunityRow({
    seeking,
    listing,
    userState,
    copy: COPY,
  });
  const plainRow = scoreMarketplaceOpportunityRow({
    seeking,
    listing,
    userState: buildUserStateV1({
      lat: 37.544,
      lng: 127.055,
      capturedAtIso: new Date().toISOString(),
      primaryEventId: null,
      now: new Date("2026-06-26T12:00:00+09:00"),
    }),
    copy: COPY,
  });
  assert.ok(focusBoostRow && plainRow);
  assert.ok(focusBoostRow.scorePct >= plainRow.scorePct);

  const pills = listOpportunityPills({
    seekings: [seeking],
    pool: [listing],
    userState,
    copy: COPY,
  });
  assert.equal(pills.length, 1);
  assert.equal(pills[0]!.count, 1);

  const rows = listOpportunityRows({
    seeking,
    pool: [listing],
    userState,
    copy: COPY,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.listingEventId, listing.eventId);

  console.log("test-score-marketplace-opportunity: ok");
}

main();
