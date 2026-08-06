/**
 * After lodging scout over trip_prep: hotels lead peek; USJ draft survives.
 * Run: npx tsx scripts/test-scout-focus-over-trip-prep.ts
 */
import assert from "node:assert/strict";
import {
  mergePreservePinnedNodes,
  mergeScoutInventoryNodes,
} from "@/lib/context-workspace/merge-preserve-pinned";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

function node(
  partial: Partial<ContextWorkspaceNode> &
    Pick<ContextWorkspaceNode, "id" | "placeId" | "title" | "kind" | "source">,
): ContextWorkspaceNode {
  return {
    summaryKo: partial.title,
    lat: 34.66,
    lng: 135.5,
    rating: 4,
    priceBand: 2,
    amountLabel: null,
    thumbnailUrl: null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    ...partial,
  };
}

const usj = node({
  id: "usj",
  placeId: "usj",
  title: "유니버설 스튜디오 재팬",
  kind: "poi",
  source: "trip_prep_draft",
  selected: true,
});
const usjDinner = node({
  id: "usj_dinner",
  placeId: "usj_dinner",
  title: "2일차 저녁 · 유니버설 맛집",
  kind: "eatery",
  source: "trip_prep_draft",
});
const hotel = node({
  id: "mystays",
  placeId: "mystays",
  title: "HOTEL MYSTAYS Shinsaibashi",
  kind: "lodging",
  source: "maps",
});

{
  const merged = mergePreservePinnedNodes([usj], [hotel], 36);
  assert.equal(merged[0]!.placeId, "mystays", "incoming hotel leads");
  assert.ok(merged.some((n) => n.placeId === "usj"), "USJ preserved");
}

{
  const out = mergeScoutInventoryNodes({
    previous: [usj, usjDinner],
    incoming: [hotel],
    domain: "lodging",
    mode: "replace",
  });
  assert.equal(out[0]!.kind, "lodging", "lodging scout domain leads peek order");
  assert.equal(out[0]!.placeId, "mystays");
  assert.ok(out.some((n) => /유니버설/u.test(n.title)), "USJ draft still in Workspace");
  assert.ok(
    out.some((n) => n.placeId === "usj_dinner"),
    "draft dinner survives",
  );
  assert.equal(
    out.find((n) => n.placeId === "usj")?.visible,
    false,
    "USJ demoted (not bookmarked)",
  );
  assert.equal(
    out.find((n) => n.placeId === "usj_dinner")?.visible,
    false,
    "draft dinner demoted",
  );
  const focus =
    out.find(
      (n) =>
        n.visible &&
        n.kind === "lodging" &&
        n.source !== "trip_prep_draft" &&
        !n.source.startsWith("trip_prep_"),
    ) ?? null;
  assert.ok(focus);
  assert.equal(focus!.placeId, "mystays");
}

{
  const pinnedUsj = { ...usj, bookmarked: true };
  const out = mergeScoutInventoryNodes({
    previous: [pinnedUsj, usjDinner],
    incoming: [hotel],
    domain: "lodging",
    mode: "replace",
  });
  assert.equal(
    out.find((n) => n.placeId === "usj")?.visible,
    true,
    "bookmarked USJ stays visible",
  );
}

console.log("ok — scout hotel leads peek; trip_prep demoted unless bookmarked");
