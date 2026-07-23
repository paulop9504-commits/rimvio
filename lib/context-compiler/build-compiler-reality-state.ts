/**
 * Reality State slice at compile time — weather · inventory (ADR-023 §5).
 * Deterministic from utterance cues + Workspace inventory; no Commit.
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { CompilerRealityState } from "@/lib/context-compiler/types";

function weatherFromCue(cue: string | null | undefined): string | null {
  const raw = cue?.trim().toLowerCase() ?? "";
  if (!raw) {
    return null;
  }
  if (raw === "rain" || /비|rain|우천/.test(raw)) {
    return "rain";
  }
  if (/맑|clear|sunny/.test(raw)) {
    return "clear";
  }
  if (/흐림|cloud|cloudy/.test(raw)) {
    return "cloudy";
  }
  return raw.slice(0, 24);
}

/** Inventory hints from provisional Workspace nodes (stay · eatery stock). */
export function inventoryHintsFromWorkspace(
  workspace: ContextWorkspaceState | null | undefined,
): string[] {
  if (!workspace) {
    return [];
  }
  const visible = workspace.nodes.filter((n) => n.visible);
  if (visible.length === 0) {
    return [];
  }

  const hints: string[] = [];
  const byKind = new Map<string, number>();
  for (const node of visible) {
    byKind.set(node.kind, (byKind.get(node.kind) ?? 0) + 1);
  }
  for (const [kind, count] of byKind) {
    hints.push(`${kind}:${count}`);
  }

  const reservable = visible.filter((n) => n.tags.includes("reservable")).length;
  if (reservable > 0) {
    hints.push(`reservable:${reservable}`);
  }

  const selected = workspace.nodes.filter((n) =>
    workspace.selectedIds.includes(n.id),
  );
  for (const node of selected.slice(0, 3)) {
    hints.push(`selected:${node.title.slice(0, 32)}`);
  }

  const priced = visible.filter((n) => n.amountLabel?.trim()).length;
  if (priced > 0) {
    hints.push(`priced:${priced}`);
  }

  return hints.slice(0, 12);
}

export function buildCompilerRealityState(input: {
  readonly weatherCue?: string | null;
  readonly weatherOverride?: string | null;
  readonly workspace?: ContextWorkspaceState | null;
  readonly asOfIso?: string;
  readonly priorWeather?: string | null;
}): CompilerRealityState {
  const asOfIso = input.asOfIso ?? new Date().toISOString();
  const weather =
    weatherFromCue(input.weatherOverride) ??
    weatherFromCue(input.weatherCue) ??
    weatherFromCue(input.priorWeather) ??
    null;
  const inventoryHints = inventoryHintsFromWorkspace(input.workspace);
  if (weather === "rain" && !inventoryHints.some((h) => h.startsWith("weather:"))) {
    inventoryHints.unshift("weather:rain_prep");
  }
  return {
    asOfIso,
    weather,
    inventoryHints,
  };
}
