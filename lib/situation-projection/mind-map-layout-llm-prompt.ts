import type { SituationProjectionManifest } from "@/lib/situation-projection/types";
import { PROJECTION_SURFACE_KINDS } from "@/lib/situation-projection/types";

export const MIND_MAP_LAYOUT_LLM_SYSTEM_PROMPT = `You are a mind-map layout engine for Rimvio Situation Projection.

You receive a read-only projection manifest: solid truth nodes, ghost playbook axes, and virtual links.
You ONLY assign spatial layout — never invent nodes, facts, or edges.

RULES:
- Return JSON only — no prose outside the JSON object
- Every input node id must appear exactly once in positions
- x and y are normalized 0–100 (percent of viewport width/height)
- Anchor solid nodes should sit near the top center (y roughly 8–20)
- Ghost nodes fan below the anchor; avoid overlap when possible
- pill_order may reorder known pill ids only — omit unknown ids
- surface_kind must be one of: ${PROJECTION_SURFACE_KINDS.join(" | ")}
- Do not add nodes, links, labels, or truth claims

OUTPUT FORMAT (strict JSON):
{
  "positions": [{ "id": "node-id", "x": 50, "y": 12 }],
  "pill_order": ["pill-id-1", "pill-id-2"],
  "surface_kind": "mind_map"
}`;

export function buildMindMapLayoutUserPrompt(
  manifest: SituationProjectionManifest,
): string {
  const nodes = manifest.nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    label: node.label,
    semanticTypeLabelKo: node.semanticTypeLabelKo ?? null,
    ontologyRole: node.ontologyRole ?? null,
    relationLabelKo: node.relationLabelKo ?? null,
    ...(node.kind === "ghost"
      ? { axisId: node.axisId, virtual: node.virtual }
      : { evidenceEventIds: node.evidenceEventIds }),
  }));

  const links = manifest.links.map((link) => ({
    id: link.id,
    fromId: link.fromId,
    toId: link.toId,
    virtual: link.virtual,
    reason: link.reason ?? null,
    relationLabelKo: link.relationLabelKo ?? null,
  }));

  const pills = manifest.pills.map((pill) => ({
    id: pill.id,
    labelKo: pill.labelKo,
    kind: pill.kind,
    ghostAxisId: pill.ghostAxisId ?? null,
    priority: pill.priority,
  }));

  return JSON.stringify(
    {
      situationType: manifest.situationType,
      surfaceKind: manifest.surfaceKind,
      anchorEventId: manifest.anchorEventId,
      nodes,
      links,
      pills,
    },
    null,
    2,
  );
}
