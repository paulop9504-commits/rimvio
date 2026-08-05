/**
 * P3 — add-without-wipe · title delete · ordinal delete.
 * Run: npx tsx scripts/test-workspace-add-without-wipe-p3.ts
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import {
  isAdditiveScoutUtterance,
  mergeScoutInventoryNodes,
} from "@/lib/context-workspace/merge-preserve-pinned";
import {
  applyWorkspacePatch,
  parseWorkspacePatch,
} from "@/lib/context-workspace/workspace-patch";

function node(
  id: string,
  kind: "lodging" | "eatery",
  title: string,
): ContextWorkspaceNode {
  return {
    id,
    kind,
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.66,
    lng: 135.5,
    rating: 4.2,
    priceBand: 2,
    amountLabel: null,
    thumbnailUrl: null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "search",
  };
}

assert.equal(isAdditiveScoutUtterance("호텔도 추가해줘"), true);
assert.equal(isAdditiveScoutUtterance("맛집도 찾아줘"), true);
assert.equal(isAdditiveScoutUtterance("난바역 근처 호텔 찾아줘"), false);

const eateries = [
  node("e1", "eatery", "Ramen A"),
  node("e2", "eatery", "Sushi B"),
];
const hotels = [
  node("h1", "lodging", "Hotel Value"),
  node("h2", "lodging", "Hotel Mid"),
];

{
  const merged = mergeScoutInventoryNodes({
    previous: eateries,
    incoming: hotels,
    domain: "lodging",
    mode: "add",
  });
  assert.equal(merged.length, 4);
  assert.ok(merged.some((n) => n.id === "e1"));
  assert.ok(merged.some((n) => n.id === "h1"));
}

{
  const merged = mergeScoutInventoryNodes({
    previous: [...eateries, node("h0", "lodging", "Old Hotel")],
    incoming: hotels,
    domain: "lodging",
    mode: "replace",
  });
  assert.ok(merged.some((n) => n.id === "e1"), "replace keeps other domain");
  assert.ok(merged.some((n) => n.id === "h1"));
  assert.ok(!merged.some((n) => n.id === "h0"), "replace drops old lodging");
}

const CTX = "ctx_p3_add";
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "eatery",
  query: "후쿠오카 맛집",
  summaryKo: "Fukuoka",
  candidates: [],
});
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: eateries,
  domain: "eatery",
});

openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "호텔도",
  candidates: [
    {
      id: "h1",
      labelKo: "Hotel Value",
      lat: 34.66,
      lng: 135.5,
      rating: 4.2,
      walkMinutes: null,
      priceBand: 2,
      reservable: true,
      localFavorite: false,
      source: "maps",
      amountLabel: null,
    },
  ],
  inventoryMode: "add",
});

{
  const after = readContextWorkspace(CTX)!;
  assert.ok(after.nodes.some((n) => n.kind === "eatery"));
  assert.ok(after.nodes.some((n) => n.kind === "lodging"));
}

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [...eateries, ...hotels],
  selectedIds: [],
});

{
  const del = applyWorkspacePatch({
    contextEventId: CTX,
    patch: parseWorkspacePatch("Hotel Value 빼줘")!,
    utterance: "Hotel Value 빼줘",
  });
  assert.equal(del.ok, true);
  assert.equal(del.record?.kind, "delete_entity");
  const after = readContextWorkspace(CTX)!;
  assert.ok(!after.nodes.some((n) => n.id === "h1"));
  assert.ok(after.nodes.some((n) => n.id === "e1"));
}

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: hotels.map((n, i) => ({ ...n, selected: i === 0 })),
  selectedIds: [],
});

{
  const del = applyWorkspacePatch({
    contextEventId: CTX,
    patch: parseWorkspacePatch("2번 빼줘")!,
    utterance: "2번 빼줘",
  });
  assert.equal(del.ok, true);
  const after = readContextWorkspace(CTX)!;
  assert.ok(!after.nodes.some((n) => n.id === "h2"));
  assert.ok(after.nodes.some((n) => n.id === "h1"));
}

clearContextWorkspace(CTX);
console.log("ok — P3 add-without-wipe · title/ordinal delete");
