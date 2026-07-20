/**
 * Context Engine — which project/folder a graph node belongs to.
 * SSOT for move_context (NL / Graph Command OS call this, not applyMoveContext directly).
 */

import { applyGraphCommands } from "@/lib/graph-command/apply-graph-commands";
import { parseGraphCommands } from "@/lib/graph-command/parse-graph-commands";
import {
  ensureSessionGraph,
  listSessionGraphContextIds,
  readSessionGraph,
} from "@/lib/graph-command/session-graph-store";
import type {
  GraphCommandApplyResult,
  SessionGraphV1,
} from "@/lib/graph-command/types";

export function listContextProjectFolders(
  contextEventId: string,
): readonly string[] {
  return readSessionGraph(contextEventId)?.projectFolders ?? [];
}

export function listBoundContextGraphs(): readonly SessionGraphV1[] {
  return listSessionGraphContextIds()
    .map((id) => readSessionGraph(id))
    .filter((g): g is SessionGraphV1 => Boolean(g));
}

/**
 * Move a place into a travel/project folder (and optional other context event).
 */
export function moveNodeToProjectContext(input: {
  fromContextEventId: string;
  toContextEventId: string;
  labelKo: string;
  folderLabelKo?: string | null;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): SessionGraphV1 | null {
  ensureSessionGraph({
    contextEventId: input.toContextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  const result = applyGraphCommands({
    contextEventId: input.fromContextEventId,
    commands: [
      {
        op: "move_context",
        targetRef: { labelKo: input.labelKo },
        toContextEventId: input.toContextEventId,
        folderLabelKo: input.folderLabelKo ?? "여행",
      },
    ],
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  return result.ok ? result.graph : null;
}

/**
 * NL / Graph Command OS entry — parse utterance and run move via Context Engine.
 * Returns null when utterance is not a move_context command.
 */
export function tryRunMoveContextCommand(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): GraphCommandApplyResult | null {
  const graph = ensureSessionGraph({
    contextEventId: input.contextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  const commands = parseGraphCommands(input.utterance, graph);
  if (!commands.length || commands.some((c) => c.op !== "move_context")) {
    return null;
  }
  let lastGraph: SessionGraphV1 | null = null;
  for (const command of commands) {
    if (command.op !== "move_context") {
      continue;
    }
    lastGraph = moveNodeToProjectContext({
      fromContextEventId: input.contextEventId,
      toContextEventId: command.toContextEventId,
      labelKo: command.targetRef.labelKo,
      folderLabelKo: command.folderLabelKo,
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
    });
  }
  if (!lastGraph) {
    return null;
  }
  const folder =
    commands[0] && "folderLabelKo" in commands[0]
      ? commands[0].folderLabelKo?.trim() || "여행"
      : "여행";
  const folders = listContextProjectFolders(input.contextEventId);
  return {
    ok: true,
    contextEventId: input.contextEventId.trim(),
    commands,
    graph: lastGraph,
    assistantReplyKo:
      folders.length > 0
        ? `${folder} 맥락으로 옮겼어요 · 폴더 ${folders.join(" · ")}`
        : `${folder} 맥락으로 옮겼어요`,
    reservedOpIds: [],
  };
}
