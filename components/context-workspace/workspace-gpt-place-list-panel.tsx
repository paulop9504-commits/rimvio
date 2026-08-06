"use client";

/**
 * GPT Maps–style place list — right rail over Workspace map.
 * Hierarchy: title → ★ · category → price → judgment blurb (never meta echo).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ContextWorkspaceNode, ContextWorkspaceState } from "@/lib/context-workspace";
import { buildNodePreview } from "@/lib/context-workspace/build-node-preview";
import {
  buildPlaceBriefFactPack,
  resolveLodgingInventoryForNode,
} from "@/lib/context-workspace/place-brief";
import {
  layerLabelKo,
  resolveWorkspaceObjectLayer,
} from "@/lib/context-workspace/workspace-object-layer";
import { sanitizePlaceListBlurb } from "@/lib/context-workspace/place-list/sanitize-place-list-blurb";
import { WorkspaceRemoteImage } from "@/components/context-workspace/workspace-remote-image";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceGptPlaceListPanelProps = {
  readonly open: boolean;
  readonly contextEventId: string;
  readonly nodes: readonly ContextWorkspaceNode[];
  readonly workspace: Pick<
    ContextWorkspaceState,
    "nodes" | "relationshipEdges" | "compareIds" | "selectedIds" | "realityDraft" | "query"
  >;
  readonly selectedId?: string | null;
  readonly searching?: boolean;
  readonly onSelect: (nodeId: string) => void;
  readonly onClose: () => void;
  readonly className?: string;
};

function formatRating(rating: number | null | undefined): string | null {
  if (rating == null || !Number.isFinite(rating)) return null;
  // Google 0–5 · vendor 0–10 · never treat 9.4 as /20 → 0.5
  if (rating > 10) {
    return `★ ${(rating / 20).toFixed(1)}`;
  }
  return `★ ${rating.toFixed(1)}`;
}

function formatPrice(node: ContextWorkspaceNode): string | null {
  const label = node.amountLabel?.trim();
  return label || null;
}

function resolveCardBlurb(input: {
  readonly placeId: string;
  readonly node: ContextWorkspaceNode;
  readonly blurbsById: Record<string, string>;
  readonly whyChosen: string | null | undefined;
  readonly layerLabel: string;
}): string | null {
  const priced = formatPrice(input.node);
  const extras = [
    priced ?? "",
    input.layerLabel,
    input.node.title,
  ];
  const fromMap = sanitizePlaceListBlurb(
    input.blurbsById[input.placeId],
    extras,
  );
  if (fromMap) return fromMap;
  const fromWhy = sanitizePlaceListBlurb(input.whyChosen, extras);
  if (fromWhy) return fromWhy;
  return sanitizePlaceListBlurb(input.node.summaryKo, extras);
}

export function WorkspaceGptPlaceListPanel({
  open,
  contextEventId,
  nodes,
  workspace,
  selectedId = null,
  searching = false,
  onSelect,
  onClose,
  className,
}: WorkspaceGptPlaceListPanelProps) {
  const destinationKo = workspace.realityDraft?.destinationKo?.trim() || null;
  const queryHintKo = workspace.query?.trim() || null;
  const [blurbsById, setBlurbsById] = useState<Record<string, string>>({});
  const [blurbLoading, setBlurbLoading] = useState(false);
  const fetchedKeyRef = useRef<string>("");

  const placeIdsKey = useMemo(
    () =>
      nodes
        .map((n) => (n.placeId || n.id).trim())
        .filter(Boolean)
        .slice(0, 12)
        .join("|"),
    [nodes],
  );

  useEffect(() => {
    if (!open || nodes.length === 0) return;
    if (fetchedKeyRef.current === placeIdsKey) return;
    fetchedKeyRef.current = placeIdsKey;

    const packs = nodes.slice(0, 12).map((node) => {
      const inventory = resolveLodgingInventoryForNode({
        contextEventId,
        node,
      });
      return buildPlaceBriefFactPack({
        node,
        inventory,
        destinationKo,
      });
    });

    const seeds: Record<string, string> = {};
    for (const pack of packs) {
      const kindLabel =
        pack.kind === "lodging"
          ? "호텔"
          : pack.kind === "eatery"
            ? "맛집"
            : pack.kind === "poi"
              ? "명소"
              : "";
      const note = sanitizePlaceListBlurb(pack.summaryKo, [
        pack.amountLabel ?? "",
        pack.title,
        kindLabel,
      ]);
      if (note) seeds[pack.placeId] = note;
    }
    setBlurbsById((prev) => ({ ...seeds, ...prev }));
    setBlurbLoading(true);

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/workspace/place-list-blurbs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packs,
            destinationKo,
            queryHintKo,
            allowLlm: true,
          }),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          ok?: boolean;
          blurbs?: Array<{ placeId: string; blurbKo: string }>;
        };
        if (!json.ok || !json.blurbs || cancelled) return;
        setBlurbsById((prev) => {
          const next = { ...prev };
          for (const row of json.blurbs!) {
            const cleaned = sanitizePlaceListBlurb(row.blurbKo);
            if (row.placeId && cleaned) next[row.placeId] = cleaned;
          }
          return next;
        });
      } catch {
        // Keep fact seeds.
      } finally {
        if (!cancelled) setBlurbLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, placeIdsKey, contextEventId, destinationKo, queryHintKo, nodes]);

  if (!open) return null;

  const showSkeleton = searching && nodes.length === 0;

  return (
    <aside
      className={cn(
        "pointer-events-auto flex h-full max-h-full w-[min(360px,42vw)] flex-col overflow-hidden rounded-[18px] bg-white/97 shadow-[0_12px_40px_rgba(25,31,40,0.16)] ring-1 ring-black/[0.06] backdrop-blur-md",
        className,
      )}
      data-workspace-gpt-place-list
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3.5 pb-1.5 pt-3">
        <p className="truncate text-[15px] font-semibold tracking-tight text-[#191f28]">
          {showSkeleton
            ? copy.globe.workspaceGptPlaceListEmptyTitle
            : copy.globe.workspaceGptPlaceListTitle(nodes.length)}
        </p>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8b95a1] transition-colors hover:bg-[#f2f4f6]"
          onClick={onClose}
          aria-label={copy.globe.workspaceGptPlaceListCloseAria}
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-0.5">
        {showSkeleton
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="flex gap-3 rounded-xl px-2 py-3"
                data-workspace-place-list-skeleton
              >
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-[#eef1f4]" />
                <div className="min-w-0 flex-1 space-y-2 py-0.5">
                  <div className="h-3.5 w-[78%] animate-pulse rounded bg-[#eef1f4]" />
                  <div className="h-2.5 w-[42%] animate-pulse rounded bg-[#eef1f4]" />
                  <div className="h-2.5 w-[28%] animate-pulse rounded bg-[#eef1f4]" />
                  <div className="h-2.5 w-[92%] animate-pulse rounded bg-[#eef1f4]" />
                </div>
              </div>
            ))
          : nodes.map((node) => {
              const preview = buildNodePreview(node, workspace);
              const placeId = (node.placeId || node.id).trim();
              const layer = resolveWorkspaceObjectLayer(node);
              const layerKo = layerLabelKo(layer);
              const rating = formatRating(node.rating);
              const price = formatPrice(node);
              const blurb = resolveCardBlurb({
                placeId,
                node,
                blurbsById,
                whyChosen: preview.whyChosen,
                layerLabel: layerKo,
              });
              const selected = selectedId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={cn(
                    "flex w-full gap-3 rounded-xl px-2 py-3 text-left transition-colors",
                    selected ? "bg-[#e8f3ff]" : "hover:bg-[#f7f8fa]",
                  )}
                  onClick={() => onSelect(node.id)}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-[#f2f4f6]">
                    {preview.heroImage ? (
                      <WorkspaceRemoteImage
                        src={preview.heroImage}
                        sizes="64px"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[20px] text-[#c4c9d0]">
                        {layer === "hotel"
                          ? "🏨"
                          : layer === "food"
                            ? "🍜"
                            : layer === "play"
                              ? "🎢"
                              : "📍"}
                      </span>
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-[#191f28]">
                      {node.title}
                    </span>
                    {/* GPT: ★ · category on one muted line */}
                    {(rating || layerKo) && (
                      <span className="mt-0.5 block text-[12px] font-medium leading-snug text-[#6b7684]">
                        {[rating, layerKo].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {/* GPT: price alone under meta */}
                    {price ? (
                      <span className="mt-0.5 block text-[13px] font-semibold tabular-nums leading-snug text-[#191f28]">
                        {price}
                      </span>
                    ) : null}
                    {/* Judgment only — never ★ / price / category echo */}
                    {blurb ? (
                      <span className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#4e5968]">
                        {blurb}
                      </span>
                    ) : blurbLoading ? (
                      <span className="mt-1.5 block h-2.5 w-[88%] animate-pulse rounded bg-[#eef1f4]" />
                    ) : null}
                  </span>
                </button>
              );
            })}
      </div>
    </aside>
  );
}
