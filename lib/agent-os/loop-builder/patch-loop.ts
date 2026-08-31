/**
 * AI patch — deterministic NL edits to existing Loop graph (MVP).
 */

import { autoLayoutLoop } from "@/lib/agent-os/loop-builder/graph-layout";
import { createLoopNode } from "@/lib/agent-os/loop-builder/nodes";
import type { LoopDefinition, LoopEdge, LoopGraphPatch, LoopNode } from "@/lib/agent-os/loop-builder/types";

function edge(from: string, to: string, kind: LoopEdge["kind"] = "next"): LoopEdge {
  return { from, to, kind };
}

function findNode(loop: LoopDefinition, pred: (n: LoopNode) => boolean): LoopNode | null {
  return loop.nodes.find(pred) ?? null;
}

export function patchLoopFromUtterance(loop: LoopDefinition, utterance: string): LoopGraphPatch | null {
  const text = utterance.trim();
  if (!text) return null;

  const changes: { kind: "add" | "remove" | "connect"; label: string }[] = [];
  const highlightNodeIds: string[] = [];
  const highlightEdgeKeys: string[] = [];

  let nodes = [...loop.nodes];
  let edges = [...loop.edges];

  const wantsWait = /(\d+)\s*분|wait|대기/i.test(text);
  const wantsNotify = /알림|notify|담당자|manager/i.test(text);
  const wantsRetryBack = /다시|재확인|loop back|돌아/i.test(text);

  const waitMinMatch = text.match(/(\d+)\s*분/);
  const waitMs = waitMinMatch ? Number(waitMinMatch[1]) * 60_000 : 30 * 60_000;

  const inventory = findNode(loop, (n) => /inventory|재고/i.test(n.label) || n.config.target === "inventory");
  const condition = findNode(loop, (n) => n.kind === "CONDITION" || n.kind === "DECIDE");
  const noTarget = condition
    ? edges.find((e) => e.from === condition.id && (e.kind === "no" || e.kind === "fail"))?.to
    : null;

  if (wantsWait) {
    const id = `n_wait_${Date.now()}`;
    nodes.push(
      createLoopNode("WAIT", id, `Wait ${Math.round(waitMs / 60_000)}m`, {
        delayMs: waitMs,
        description: "AI suggested wait",
      }),
    );
    changes.push({ kind: "add", label: `Wait ${Math.round(waitMs / 60_000)} minutes` });
    highlightNodeIds.push(id);

    if (noTarget) {
      edges = edges.filter((e) => !(e.from === condition!.id && e.kind === "no"));
      edges.push(edge(condition!.id, id, "no"));
      if (wantsRetryBack && inventory) {
        edges.push(edge(id, inventory.id));
        highlightEdgeKeys.push(`${id}->${inventory.id}`);
        changes.push({ kind: "connect", label: "Connect back to Check Inventory" });
      } else if (noTarget) {
        edges.push(edge(id, noTarget));
      }
    }
  }

  if (wantsNotify) {
    const id = `n_notify_${Date.now()}`;
    nodes.push(
      createLoopNode("CAPABILITY", id, "Notify Manager", {
        capabilityId: "notification.send",
        toolId: "capability.create",
        description: "AI suggested notify",
      }),
    );
    changes.push({ kind: "add", label: "Notify Manager" });
    highlightNodeIds.push(id);

    if (condition) {
      const prevNo = edges.find((e) => e.from === condition.id && e.kind === "no");
      if (prevNo) {
        edges = edges.filter((e) => !(e.from === condition.id && e.kind === "no"));
        edges.push(edge(condition.id, id, "no"));
        edges.push(edge(id, prevNo.to));
        highlightEdgeKeys.push(`${condition.id}->${id}`, `${id}->${prevNo.to}`);
        changes.push({ kind: "connect", label: "NO branch → Notify → downstream" });
      }
    }
  }

  if (changes.length === 0) return null;

  const next = autoLayoutLoop({
    ...loop,
    nodes,
    edges,
    source: "ai",
  });

  return {
    summaryKo: changes.map((c) => c.label).join(" · "),
    loop: next,
    highlightNodeIds,
    highlightEdgeKeys,
    changes,
  };
}
