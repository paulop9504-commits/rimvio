"use client";

import { useCallback, useMemo } from "react";
import { Brain, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { GlobeContextBrainPills } from "@/components/globe/globe-context-brain-pills";
import { useContextMediaGuides } from "@/hooks/use-context-media-guides";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { patchMediaGuidesToProjection } from "@/lib/situation-projection/compose-brain-projection";
import { resolveProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";
import type { HubRunnablePill } from "@/lib/situation-projection/types";
import { useContextBrainManifest } from "@/hooks/use-context-brain-manifest";
import { dispatchGlobeBrainProjectionRequest } from "@/lib/globe/brain/globe-brain-projection-bridge";
import { useGlobeContextBrainActions } from "@/hooks/use-globe-context-brain-actions";
import { cn } from "@/lib/utils";

export type GlobeContextBrainStripProps = {
  event: EventCandidate;
  tone?: "light" | "dark";
  variant?: "card" | "corner-pill";
  /** When set, primary tap binds context agent instead of opening brain sheet. */
  onContextAgentBind?: () => void;
  className?: string;
};

/** Brain ingress + Hub Runnable pills on connected personal context. */
export function GlobeContextBrainStrip({
  event,
  tone = "light",
  variant = "card",
  onContextAgentBind,
  className,
}: GlobeContextBrainStripProps) {
  const { manifest, pills, openBrain, tapPill } = useContextBrainManifest(event);
  const { guides, loading: guidesLoading } = useContextMediaGuides(event, {
    enabled: true,
    max: 2,
  });
  const runTapResult = useGlobeContextBrainActions(event);
  const rootNode = useMemo(
    () =>
      manifest?.nodes.find((node) => resolveProjectionNodeSemantic(node).ontologyRole === "root") ??
      manifest?.nodes[0] ??
      null,
    [manifest?.nodes],
  );
  const rootSemantic = rootNode ? resolveProjectionNodeSemantic(rootNode) : null;
  const ontologySummary = useMemo(() => {
    const labels: string[] = [];
    for (const node of manifest?.nodes ?? []) {
      const semantic = resolveProjectionNodeSemantic(node);
      if (semantic.ontologyRole === "root") {
        continue;
      }
      const label = semantic.relationLabelKo ?? semantic.semanticTypeLabelKo;
      if (!label || labels.includes(label)) {
        continue;
      }
      labels.push(label);
      if (labels.length >= 3) {
        break;
      }
    }
    return labels.join(" · ");
  }, [manifest?.nodes]);
  const rootTitle = rootNode?.label?.trim() || event.title.trim() || "맥락";

  const handlePillTap = useCallback(
    (pill: HubRunnablePill) => {
      const result = tapPill(pill);
      if (result) {
        runTapResult(result);
      }
    },
    [runTapResult, tapPill],
  );

  const handleOpenBrain = useCallback(() => {
    if (onContextAgentBind) {
      onContextAgentBind();
      return;
    }
    let projection = openBrain();
    if (!projection) {
      return;
    }
    if (guides.length > 0) {
      projection =
        patchMediaGuidesToProjection({
          event,
          guides,
          maxGuides: 2,
        }) ?? projection;
    }
    const hasProjectedNodes = projection.nodes.some(
      (node) => resolveProjectionNodeSemantic(node).ontologyRole !== "root",
    );
    if (!hasProjectedNodes && projection.pills.length === 0 && !guidesLoading) {
      toast.message(copy.globe.contextBrainSheetEmpty);
      return;
    }
    dispatchGlobeBrainProjectionRequest({ anchorEventId: projection.anchorEventId });
  }, [event, guides, guidesLoading, onContextAgentBind, openBrain]);

  const showPills = Boolean(manifest && pills.length > 0);
  const cornerPill = variant === "corner-pill";

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-globe-context-brain-strip
      data-globe-context-brain-open={manifest ? "true" : "false"}
      data-globe-context-brain-variant={variant}
    >
      <button
        type="button"
        onClick={handleOpenBrain}
        className={cn(
          "text-left active:scale-[0.98]",
          cornerPill
            ? [
                "flex max-w-[12.5rem] items-center gap-2 rounded-full px-2.5 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl",
                tone === "dark"
                  ? "bg-[#1c1c1e]/88 text-white ring-1 ring-white/15"
                  : "bg-white/92 text-[#1d1d1f] ring-1 ring-black/[0.06]",
              ]
            : [
                "flex items-center gap-2 rounded-full px-3 py-2",
                tone === "dark"
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-black/[0.06]",
              ],
        )}
        aria-label={copy.globe.contextBrainOpenAria}
        data-globe-context-brain-trigger
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            cornerPill ? "size-7" : "size-8",
            tone === "dark" ? "bg-white/15" : "bg-[#0071e3]/10 text-[#0071e3]",
          )}
        >
          <Brain className={cn(cornerPill ? "size-3.5" : "size-4")} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          {cornerPill ? (
            <span
              className={cn(
                "block truncate text-[11px] font-medium",
                tone === "dark" ? "text-white/60" : "text-[#86868b]",
              )}
            >
              {rootSemantic?.semanticTypeLabelKo ?? "주맥락"}
            </span>
          ) : (
            <span
              className={cn(
                "block text-[10px] font-semibold uppercase tracking-[0.08em]",
                tone === "dark" ? "text-white/60" : "text-[#86868b]",
              )}
            >
              {rootSemantic?.semanticTypeLabelKo ?? "주맥락"}
            </span>
          )}
          <span className={cn("block truncate font-semibold", cornerPill ? "text-[13px]" : "mt-0.5 text-[12px]")}>
            {rootTitle}
          </span>
          {!cornerPill && (showPills || ontologySummary) ? (
            <span
              className={cn(
                "mt-0.5 block truncate text-[10px]",
                tone === "dark" ? "text-white/70" : "text-[#86868b]",
              )}
            >
              {ontologySummary || copy.globe.contextBrainPillsAria}
            </span>
          ) : null}
        </span>
        <ChevronUp
          className={cn(
            "shrink-0",
            cornerPill ? "size-3.5" : "size-4",
            tone === "dark" ? "text-white/50" : "text-[#86868b]",
          )}
          aria-hidden
        />
      </button>

      {!cornerPill && showPills ? (
        <GlobeContextBrainPills pills={pills} onPillTap={handlePillTap} tone={tone} />
      ) : null}
    </div>
  );
}
