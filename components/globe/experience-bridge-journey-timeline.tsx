"use client";

import { MapPin, MessageCircle, Sparkles } from "lucide-react";
import type { ExperienceBridgeTimelineItem } from "@/lib/experience-bridge/experience-bridge-types";
import type { ExperienceWindow } from "@/lib/experience-window/experience-window-types";
import {
  formatExperiencePhaseLabel,
  formatExperienceTripTimingLabel,
  formatExperienceWindowRangeLabel,
  formatTimelineOccurredLabel,
  groupBridgeTimelineByPhase,
  isBridgeTimelineMediaKind,
} from "@/lib/experience-window";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO_TYPE, RIMVIO_RADIUS } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type ExperienceBridgeJourneyTimelineProps = {
  timeline: readonly ExperienceBridgeTimelineItem[];
  experienceWindow?: ExperienceWindow | null;
  onOpenTalk?: () => void;
  onOpenMedia?: () => void;
  onAcceptPlanningProposal?: () => void;
  onRejectPlanningProposal?: () => void;
  showPlanningProposalAccept?: boolean;
  className?: string;
};

function phaseCopy(phase: NonNullable<ExperienceBridgeTimelineItem["phase"]>): string {
  switch (phase) {
    case "prep":
      return copy.globe.bridgeJourneyPhasePrep;
    case "live":
      return copy.globe.bridgeJourneyPhaseLive;
    case "recall":
      return copy.globe.bridgeJourneyPhaseRecall;
    default:
      return formatExperiencePhaseLabel(phase);
  }
}

function tripTimingCopy(timing: ExperienceWindow["tripTiming"]): string {
  switch (timing) {
    case "future":
      return copy.globe.bridgeJourneyTripFuture;
    case "present":
      return copy.globe.bridgeJourneyTripPresent;
    case "past":
      return copy.globe.bridgeJourneyTripPast;
    default:
      return formatExperienceTripTimingLabel(timing);
  }
}

function TimelineRow({
  item,
  onOpenTalk,
  onOpenMedia,
  onAcceptPlanningProposal,
  onRejectPlanningProposal,
  showPlanningProposalAccept,
}: {
  item: ExperienceBridgeTimelineItem;
  onOpenTalk?: () => void;
  onOpenMedia?: () => void;
  onAcceptPlanningProposal?: () => void;
  onRejectPlanningProposal?: () => void;
  showPlanningProposalAccept?: boolean;
}) {
  const occurred = formatTimelineOccurredLabel(item.capturedAtIso);

  if (item.kind === "bridge_prep_marker") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3 py-2.5",
          RIMVIO_RADIUS.lg,
        )}
        data-bridge-journey-prep-marker
      >
        <Sparkles className="size-4 shrink-0 text-primary/80" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">
            {copy.globe.bridgeJourneyPrepMarker}
          </p>
          {occurred ? (
            <p className="text-[11px] text-muted-foreground">{occurred}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (item.kind === "planning_commit" || item.kind === "planning_proposal") {
    const isProposal = item.kind === "planning_proposal";
    return (
      <div
        className={cn(
          "rounded-xl border px-3 py-2.5",
          isProposal
            ? "border-primary/20 bg-primary/5"
            : "border-border/60 bg-muted/30",
          RIMVIO_RADIUS.lg,
        )}
        data-bridge-journey-planning={item.kind}
      >
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary/80" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-snug text-foreground">
              {item.body?.trim() || item.authorDisplayName}
            </p>
            {occurred ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{occurred}</p>
            ) : null}
          </div>
        </div>
        {isProposal && showPlanningProposalAccept && item.planningProposalIsHead && onAcceptPlanningProposal ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onAcceptPlanningProposal}
              className="min-w-0 flex-1 rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground active:opacity-90"
            >
              {copy.globe.bridgePlanningProposalAccept}
            </button>
            {onRejectPlanningProposal ? (
              <button
                type="button"
                onClick={onRejectPlanningProposal}
                className="shrink-0 rounded-full border border-border/70 bg-background px-3 py-1.5 text-[12px] font-semibold text-muted-foreground active:bg-muted/60"
              >
                {copy.globe.bridgePlanningProposalReject}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (item.kind === "chat_message") {
    return (
      <button
        type="button"
        onClick={onOpenTalk}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5 text-left active:bg-muted/80",
          RIMVIO_RADIUS.lg,
        )}
        data-bridge-journey-chat
      >
        <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[12px] font-semibold text-foreground">
              {item.authorDisplayName}
            </span>
            {occurred ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">{occurred}</span>
            ) : null}
          </span>
          <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-foreground/90">
            {item.body?.trim() || "…"}
          </span>
        </span>
      </button>
    );
  }

  if (isBridgeTimelineMediaKind(item.kind)) {
    const src = item.imageUrl?.trim() || null;
    return (
      <button
        type="button"
        onClick={onOpenMedia}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2 text-left active:bg-muted/70",
          RIMVIO_RADIUS.lg,
        )}
        data-bridge-journey-media
      >
        <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="flex size-full items-center justify-center text-[10px] font-bold text-muted-foreground">
              {item.kind.includes("video") ? "▶" : "◆"}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {item.authorDisplayName}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {item.placeLabel?.trim() || copy.globe.bridgeJourneyMediaOpen}
            {occurred ? ` · ${occurred}` : ""}
          </span>
        </span>
      </button>
    );
  }

  return null;
}

/** Bridge context — time-aligned talk · media · prep on one line. */
export function ExperienceBridgeJourneyTimeline({
  timeline,
  experienceWindow,
  onOpenTalk,
  onOpenMedia,
  onAcceptPlanningProposal,
  onRejectPlanningProposal,
  showPlanningProposalAccept = false,
  className,
}: ExperienceBridgeJourneyTimelineProps) {
  const groups = groupBridgeTimelineByPhase(timeline);
  const rangeLabel = experienceWindow
    ? formatExperienceWindowRangeLabel(experienceWindow)
    : null;
  const tripLabel = experienceWindow
    ? tripTimingCopy(experienceWindow.tripTiming)
    : null;

  if (groups.length === 0) {
    return (
      <section className={cn("space-y-2", className)} data-bridge-journey-empty>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 px-0.5">
          <p className={RIMVIO_TYPE.eyebrow}>{copy.globe.bridgeJourneyEyebrow}</p>
          {tripLabel ? (
            <p className="text-[11px] font-semibold text-primary/80">{tripLabel}</p>
          ) : null}
        </div>
        {rangeLabel ? (
          <p className="px-0.5 text-[12px] font-medium text-muted-foreground">{rangeLabel}</p>
        ) : null}
        <div className="rounded-2xl bg-muted/30 px-3.5 py-3">
          <p className={RIMVIO_TYPE.caption}>{copy.globe.bridgeJourneyEmpty}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-3", className)} data-bridge-journey-timeline>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 px-0.5">
        <p className={RIMVIO_TYPE.eyebrow}>{copy.globe.bridgeJourneyEyebrow}</p>
        {tripLabel ? (
          <p className="text-[11px] font-semibold text-primary/80">{tripLabel}</p>
        ) : null}
      </div>
      {rangeLabel ? (
        <p className="px-0.5 text-[12px] font-medium text-muted-foreground">{rangeLabel}</p>
      ) : null}

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.phase} className="space-y-2" data-bridge-journey-phase={group.phase}>
            <p className="px-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/90">
              {phaseCopy(group.phase)}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <TimelineRow
                  key={item.id}
                  item={item}
                  onOpenTalk={onOpenTalk}
                  onOpenMedia={onOpenMedia}
                  onAcceptPlanningProposal={onAcceptPlanningProposal}
                  onRejectPlanningProposal={onRejectPlanningProposal}
                  showPlanningProposalAccept={showPlanningProposalAccept}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
