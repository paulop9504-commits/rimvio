/**
 * Map Context Workspace nodes → Mobile Workspace entities / relations.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type {
  MobileWorkspaceEntity,
  MobileWorkspaceEntityKind,
  MobileWorkspaceRelation,
} from "@/lib/mobile-workspace/types";

function kindFromNode(node: ContextWorkspaceNode): MobileWorkspaceEntityKind {
  if (node.kind === "lodging") return "hotel";
  if (node.kind === "eatery") return "restaurant";
  if (node.kind === "poi") return "attraction";
  if (node.kind === "amenity") return "station";
  return "other";
}

export function mobileEntitiesFromWorkspaceNodes(
  nodes: readonly ContextWorkspaceNode[],
): readonly MobileWorkspaceEntity[] {
  return nodes
    .filter((n) => n.visible && Number.isFinite(n.lat) && Number.isFinite(n.lng))
    .map((n) => ({
      id: n.id,
      kind: kindFromNode(n),
      title: n.title,
      lat: n.lat,
      lng: n.lng,
      score: typeof n.rating === "number" ? Math.round(n.rating * 10) : null,
      subtitleKo: n.summaryKo?.trim() || null,
      priceLabelKo: n.amountLabel?.trim() || null,
      thumbnailUrl: n.thumbnailUrl?.trim() || null,
      galleryUrls: n.galleryUrls ?? null,
      judgmentKo: null,
    }));
}

/** Lightweight nearby relations from selected/anchor hotel to other venues. */
export function buildNearbyRelationsFromAnchor(input: {
  readonly anchorId: string;
  readonly entities: readonly MobileWorkspaceEntity[];
  readonly maxMeters?: number;
}): readonly MobileWorkspaceRelation[] {
  const anchor = input.entities.find((e) => e.id === input.anchorId);
  if (!anchor) return [];
  const max = input.maxMeters ?? 2500;
  const out: MobileWorkspaceRelation[] = [];

  for (const e of input.entities) {
    if (e.id === anchor.id) continue;
    if (e.kind === "hotel") continue;
    const meters = approxMeters(anchor.lat, anchor.lng, e.lat, e.lng);
    if (meters > max) continue;
    const walkMinutes = Math.max(1, Math.round(meters / 80));
    out.push({
      id: `rel_${anchor.id}_${e.id}`,
      kind: "nearby",
      fromId: anchor.id,
      toId: e.id,
      labelKo: "Nearby",
      meters: Math.round(meters),
      walkMinutes,
    });
  }
  return out.slice(0, 24);
}

function approxMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function parseMobileWorkspaceCommand(text: string): {
  readonly action: string;
  readonly target: string;
  readonly constraint: Readonly<Record<string, unknown>>;
} {
  const t = text.trim();

  // Osaka Metro polyline overlay (2D Workspace only — not Commit).
  {
    const {
      resolveOsakaMetroOverlayCommand,
    } = require("@/lib/geo/osaka-metro/resolve-metro-overlay-command") as typeof import("@/lib/geo/osaka-metro/resolve-metro-overlay-command");
    const metro = resolveOsakaMetroOverlayCommand(t);
    if (metro) {
      if (metro.op === "show_all") {
        return {
          action: "toggle_metro_overlay",
          target: "map",
          constraint: { lineId: "all", visible: true },
        };
      }
      if (metro.op === "hide_all") {
        return {
          action: "toggle_metro_overlay",
          target: "map",
          constraint: { lineId: "all", visible: false },
        };
      }
      return {
        action: "toggle_metro_overlay",
        target: "map",
        constraint: {
          lineId: metro.lineId,
          visible: metro.op === "show",
        },
      };
    }
  }

  if (/캡슐|capsule/iu.test(t) && /호텔|hotel|보여|보고/iu.test(t)) {
    return {
      action: "filter",
      target: "hotel",
      constraint: { type: "capsule", hotelType: "capsule" },
    };
  }
  if (/맛집|식당|먹을|restaurant|food/iu.test(t)) {
    return {
      action: "discover",
      target: "restaurant",
      constraint: { near: "anchor", relation: "nearby" },
    };
  }
  if (/아이|가족|family|유모차/iu.test(t)) {
    return {
      action: "rank",
      target: "attraction",
      constraint: { familyFriendly: true },
    };
  }
  if (/싸|저렴|싼|cheap/iu.test(t)) {
    return {
      action: "replace",
      target: "hotel",
      constraint: { cheaper: true },
    };
  }
  if (/일정|day\s*\d|넣어/iu.test(t)) {
    return {
      action: "schedule",
      target: "active",
      constraint: {},
    };
  }
  if (/기준|기준으로/iu.test(t)) {
    return {
      action: "set_anchor",
      target: "active",
      constraint: {},
    };
  }
  return {
    action: "discover",
    target: "place",
    constraint: {},
  };
}
