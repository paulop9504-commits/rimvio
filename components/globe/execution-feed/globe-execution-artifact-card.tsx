"use client";

import type {
  ExecutionFeedArtifact,
  ExecutionFeedPill,
} from "@/lib/context-run/execution-feed-types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { Globe, MapPin, Store } from "lucide-react";

export type GlobeExecutionArtifactCardProps = {
  artifact: ExecutionFeedArtifact;
  pill?: ExecutionFeedPill | null;
  expanded?: boolean;
  className?: string;
  onTabChange?: (tabId: string) => void;
};

function SourceIcon({ icon }: { icon?: "globe" | "map" | "hub" | "field" | "memory" }) {
  if (icon === "field") {
    return <Store className="size-3" aria-hidden />;
  }
  if (icon === "map") {
    return <MapPin className="size-3" aria-hidden />;
  }
  return <Globe className="size-3" aria-hidden />;
}

const PRIORITY_CLASS = {
  high: "bg-[#ff453a]/18 text-[#ff6961] ring-[#ff453a]/25",
  medium: "bg-[#ff9f0a]/18 text-[#ffb340] ring-[#ff9f0a]/25",
  low: "bg-[#34c759]/18 text-[#5de37a] ring-[#34c759]/25",
} as const;

/** Claude artifact panel — metrics, sources, checklist, summary. */
export function GlobeExecutionArtifactCard({
  artifact,
  pill,
  expanded = true,
  className,
  onTabChange,
}: GlobeExecutionArtifactCardProps) {
  if (!expanded && pill?.status === "done") {
    return (
      <div
        className={cn(
          "rounded-[0.85rem] bg-[#121316]/72 px-3 py-2 ring-1 ring-white/10",
          className,
        )}
        data-globe-execution-artifact-collapsed
      >
        <p className="line-clamp-2 text-[10px] leading-snug text-white/75">
          {pill.resultKo || artifact.summaryLineKo || artifact.bodyKo}
        </p>
      </div>
    );
  }

  const activeTab = artifact.activeTabId ?? artifact.tabs?.[0]?.id ?? null;
  const showSummary =
    Boolean(artifact.summaryLineKo) &&
    (!artifact.tabs?.length ||
      activeTab === "summary" ||
      activeTab === "prep" ||
      activeTab === "checklist");
  const showChecklist =
    Boolean(artifact.checklist?.length) &&
    (!artifact.tabs?.length ||
      activeTab === "steps" ||
      activeTab === "checklist");
  const showMetrics =
    Boolean(artifact.metrics?.length) &&
    (!artifact.tabs?.length || activeTab !== "steps");

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[1rem] bg-[#121316]/88 px-3 py-2.5 ring-1 ring-white/12 backdrop-blur-xl",
        className,
      )}
      data-globe-execution-artifact
      data-globe-execution-artifact-kind={artifact.kind}
    >
      {artifact.titleKo ? (
        <p className="text-[11px] font-semibold text-white">{artifact.titleKo}</p>
      ) : null}

      {artifact.tabs && artifact.tabs.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {artifact.tabs.map((tab) => {
            const active = tab.id === (artifact.activeTabId ?? artifact.tabs?.[0]?.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold ring-1 transition-colors",
                  active
                    ? "bg-white/14 text-white ring-white/22"
                    : "bg-white/5 text-white/65 ring-white/10 hover:bg-white/10",
                )}
                data-globe-execution-artifact-tab={tab.id}
                aria-pressed={active}
              >
                {tab.labelKo}
              </button>
            );
          })}
        </div>
      ) : null}

      {showSummary && artifact.summaryLineKo ? (
        <div className="rounded-[0.7rem] bg-white/6 px-2.5 py-2 ring-1 ring-white/8">
          <p className="text-[9px] font-bold uppercase tracking-wide text-white/45">
            {copy.globe.executionFeed.summaryEyebrow}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/90">
            {artifact.summaryLineKo}
          </p>
        </div>
      ) : null}

      {showMetrics && artifact.metrics && artifact.metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {artifact.metrics.map((metric) => (
            <div
              key={metric.id}
              className="rounded-[0.75rem] bg-white/5 px-2 py-1.5 ring-1 ring-white/8"
            >
              <p className="text-[9px] text-white/50">{metric.labelKo}</p>
              <p
                className={cn(
                  "mt-0.5 text-[12px] font-bold",
                  metric.tone === "positive" ? "text-[#5de37a]" : "text-white",
                )}
              >
                {metric.valueKo}
              </p>
              {metric.hintKo ? (
                <p className="mt-0.5 line-clamp-2 text-[9px] text-white/55">{metric.hintKo}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {artifact.sources && artifact.sources.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {artifact.sources.map((source) => (
            <span
              key={source.id}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[9px] font-medium text-white/80 ring-1 ring-white/10"
            >
              <SourceIcon icon={source.icon} />
              <span className="max-w-[7rem] truncate">{source.labelKo}</span>
            </span>
          ))}
        </div>
      ) : null}

      {showChecklist && artifact.checklist && artifact.checklist.length > 0 ? (
        <div className="flex flex-col gap-1">
          {artifact.checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-[0.75rem] bg-white/4 px-2 py-1.5 ring-1 ring-white/6"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] ring-1",
                  item.done
                    ? "bg-[#34c759]/20 ring-[#34c759]/35 text-[#5de37a]"
                    : "bg-white/6 ring-white/12",
                )}
                aria-hidden
              >
                {item.done ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-white/92">{item.titleKo}</p>
                {item.bodyKo ? (
                  <p className="mt-0.5 text-[9px] leading-snug text-white/58">{item.bodyKo}</p>
                ) : null}
              </div>
              {item.priorityKo ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold ring-1",
                    PRIORITY_CLASS[item.priorityTone ?? "medium"],
                  )}
                >
                  {item.priorityKo}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {artifact.bodyKo && !artifact.summaryLineKo ? (
        <p className="line-clamp-3 text-[10px] leading-snug text-white/78">{artifact.bodyKo}</p>
      ) : null}
    </div>
  );
}
