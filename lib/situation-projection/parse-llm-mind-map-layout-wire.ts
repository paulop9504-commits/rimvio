import type { LlmMindMapLayoutWire } from "@/lib/situation-projection/mind-map-layout-llm-types";
import {
  PROJECTION_SURFACE_KINDS,
  type ProjectionSurfaceKind,
  type SituationProjectionManifest,
} from "@/lib/situation-projection/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampPercent(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.max(0, Math.min(100, num));
}

function asSurfaceKind(value: unknown): ProjectionSurfaceKind | undefined {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }
  return PROJECTION_SURFACE_KINDS.includes(raw as ProjectionSurfaceKind)
    ? (raw as ProjectionSurfaceKind)
    : undefined;
}

export function parseLlmMindMapLayoutWire(
  raw: string | null | undefined,
): LlmMindMapLayoutWire | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    if (!Array.isArray(payload.positions)) {
      return null;
    }

    const positions: LlmMindMapLayoutWire["positions"][number][] = [];
    const seenIds = new Set<string>();

    for (const item of payload.positions) {
      if (!isRecord(item)) {
        return null;
      }
      const id = asString(item.id);
      const x = clampPercent(item.x);
      const y = clampPercent(item.y);
      if (!id || x === null || y === null || seenIds.has(id)) {
        return null;
      }
      seenIds.add(id);
      positions.push({ id, x, y });
    }

    if (positions.length === 0) {
      return null;
    }

    const pillOrderRaw = payload.pill_order ?? payload.pillOrder;
    const pillOrder = Array.isArray(pillOrderRaw)
      ? pillOrderRaw
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean)
      : undefined;

    const surfaceKind =
      asSurfaceKind(payload.surface_kind) ?? asSurfaceKind(payload.surfaceKind);

    return {
      positions,
      pillOrder,
      surfaceKind,
    };
  } catch {
    return null;
  }
}

export function validateLlmMindMapLayoutWire(
  wire: LlmMindMapLayoutWire,
  manifest: SituationProjectionManifest,
): string[] {
  const failures: string[] = [];
  const nodeIds = new Set(manifest.nodes.map((node) => node.id));
  const pillIds = new Set(manifest.pills.map((pill) => pill.id));
  const positionIds = new Set(wire.positions.map((row) => row.id));

  if (wire.positions.length !== manifest.nodes.length) {
    failures.push("position_count_mismatch");
  }

  for (const nodeId of nodeIds) {
    if (!positionIds.has(nodeId)) {
      failures.push(`missing_position:${nodeId}`);
    }
  }

  for (const position of wire.positions) {
    if (!nodeIds.has(position.id)) {
      failures.push(`unknown_position:${position.id}`);
    }
  }

  if (wire.pillOrder) {
    for (const pillId of wire.pillOrder) {
      if (!pillIds.has(pillId)) {
        failures.push(`unknown_pill:${pillId}`);
      }
    }
  }

  return failures;
}
