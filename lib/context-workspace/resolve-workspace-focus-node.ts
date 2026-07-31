/**
 * Resolve Workspace Entity from id / placeId / title (draft chip · Reality Jump).
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

function normalizeTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "")
    .replace(/재팬|japan|universalstudios?/giu, "usj");
}

export function resolveWorkspaceFocusNode(
  nodes: readonly ContextWorkspaceNode[],
  rawId: string,
  titleHint?: string | null,
): ContextWorkspaceNode | null {
  const id = rawId.trim();
  if (!id && !titleHint?.trim()) {
    return null;
  }

  if (id) {
    const exact =
      nodes.find((n) => n.id === id) ??
      nodes.find((n) => n.placeId === id) ??
      nodes.find(
        (n) =>
          n.id === `ws-node:${id}` ||
          n.placeId === id.replace(/^ws-node:/u, ""),
      );
    if (exact) {
      return exact;
    }
  }

  const hint = normalizeTitle(titleHint || id);
  if (!hint || hint.length < 2) {
    return null;
  }

  const byTitle = nodes.find((n) => {
    const title = normalizeTitle(n.title);
    return (
      title === hint ||
      title.includes(hint) ||
      hint.includes(title) ||
      (hint.includes("usj") && /유니버설|usj/iu.test(n.title)) ||
      (hint.includes("도톤") && /도톤/iu.test(n.title)) ||
      (hint.includes("난바") && /난바/iu.test(n.title))
    );
  });
  return byTitle ?? null;
}
