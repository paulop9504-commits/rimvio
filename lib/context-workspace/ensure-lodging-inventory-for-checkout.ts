/**
 * Ensure a lodging inventory row exists for Workspace Approve → Hub checkout.
 * Normalizes liteapi:/maps: placeId mismatch and synthesizes a row from the node when missing.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  isLodgingHubEnabled,
  readLodgingInventoryRows,
} from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { findLifeEventCandidate } from "@/lib/life-read-model";

/** Strip provider prefixes so Workspace placeId matches Hub inventory. */
export function normalizeLodgingPlaceIdKey(placeId: string): string {
  const id = placeId.trim();
  if (id.startsWith("liteapi:")) return id.slice("liteapi:".length);
  if (id.startsWith("maps:")) return id.slice("maps:".length);
  if (id.startsWith("ws-node:")) return id.slice("ws-node:".length);
  return id;
}

export function lodgingPlaceIdsMatch(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (left === right) return true;
  return normalizeLodgingPlaceIdKey(left) === normalizeLodgingPlaceIdKey(right);
}

export function findLodgingInventoryRowByPlaceId(
  rows: readonly ContextLodgingInventoryRow[],
  placeId: string,
): ContextLodgingInventoryRow | null {
  const needle = placeId.trim();
  if (!needle) return null;
  return (
    rows.find((row) => lodgingPlaceIdsMatch(row.placeId, needle)) ??
    rows.find(
      (row) =>
        row.liteapiHotelId != null &&
        lodgingPlaceIdsMatch(row.liteapiHotelId, needle),
    ) ??
    null
  );
}

function parsePriceKrwFromLabel(label: string | null | undefined): number | null {
  const t = label?.trim() ?? "";
  if (!t) return null;
  const m = /([\d,]+)\s*원/u.exec(t);
  if (!m) return null;
  const n = Number(m[1]!.replace(/,/gu, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rowFromWorkspaceNode(input: {
  readonly placeId: string;
  readonly node: ContextWorkspaceNode;
}): ContextLodgingInventoryRow {
  const placeId = input.placeId.trim();
  const liteKey = normalizeLodgingPlaceIdKey(placeId);
  const images = [
    input.node.thumbnailUrl?.trim() || null,
    ...(input.node.galleryUrls ?? []).map((u) => u.trim()),
  ].filter((u): u is string => Boolean(u));
  const priceKrw = parsePriceKrwFromLabel(input.node.amountLabel);
  return {
    placeId: placeId.startsWith("liteapi:") ? placeId : `liteapi:${liteKey}`,
    name: input.node.title.trim() || "숙소",
    images,
    priceKrw,
    rating: input.node.rating,
    reviewCount: input.node.reviewCount,
    lat: input.node.lat,
    lng: input.node.lng,
    provider: placeId.includes("liteapi") || liteKey.length > 8 ? "liteapi" : "mock",
    partnerLabel: "Workspace",
    liteapiHotelId: liteKey,
    photoSource: images.length > 0 ? "liteapi" : "mock",
    photoConfidence: images.length > 0 ? "strong_identity" : "mock",
  };
}

/**
 * Returns the inventory placeId to pass into openLodgingHubCheckout.
 */
export function ensureLodgingInventoryForWorkspaceCheckout(input: {
  readonly contextEventId: string;
  readonly placeId: string;
  readonly node?: ContextWorkspaceNode | null;
}): string | null {
  const contextEventId = input.contextEventId.trim();
  const placeId = input.placeId.trim();
  if (!contextEventId || !placeId) return null;

  const event = findLifeEventCandidate(contextEventId);
  if (!event) return null;

  const existing = findLodgingInventoryRowByPlaceId(
    readLodgingInventoryRows(event),
    placeId,
  );
  if (existing) {
    return existing.placeId;
  }

  const node = input.node;
  if (!node || node.kind !== "lodging") {
    return null;
  }

  const row = rowFromWorkspaceNode({ placeId, node });
  if (row.priceKrw == null || row.priceKrw <= 0) {
    // Checkout sheet requires a positive amount — refuse rather than invent.
    return null;
  }
  const prev = isLodgingHubEnabled(event)
    ? [...readLodgingInventoryRows(event)]
    : [];
  const withoutDup = prev.filter((r) => !lodgingPlaceIdsMatch(r.placeId, row.placeId));
  commitLodgingInventoryToEvent({
    event,
    inventory: [...withoutDup, row],
    inventorySource: "workspace_checkout_ensure",
  });
  return row.placeId;
}
