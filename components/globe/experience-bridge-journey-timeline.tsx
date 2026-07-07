"use client";

import { MapPin, MessageCircle, Sparkles } from "lucide-react";
import type { ExperienceBridgeTimelineItem } from "@/lib/experience-bridge/experience-bridge-types";
import type { ExperienceWindow } from "@/lib/experience-window/experience-window-types";
import {
  groupBridgeTimelineByPhase,
  isBridgeTimelineMediaKind,
} from "@/lib/experience-window";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO_RADIUS } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_ITEMS = 5;

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
  if (item.kind === "bridge_prep_marker") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2",
          RIMVIO_RADIUS.lg,
        )}
        data-bridge-journey-prep-marker
      >
        <Sparkles className="size-4 shrink-0 text-primary/80" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
          {copy.globe.bridgeJourneyPrepMarker}
        </p>
      </div>
    );
  }

  if (item.kind === "planning_commit" || item.kind === "planning_proposal") {
    const isProposal = item.kind === "planning_proposal";
    return (
      <div
        className={cn(
          "rounded-xl border px-3 py-2",
          isProposal
            ? "border-primary/20 bg-primary/5"
            : "border-border/60 bg-muted/30",
          RIMVIO_RADIUS.lg,
        )}
        data-bridge-journey-planning={item.kind}
      >
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary/80" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            {item.body?.trim() || item.authorDisplayName}
          </p>
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
          "flex w-full items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2 text-left active:bg-muted/80",
          RIMVIO_RADIUS.lg,
        )}
        data-bridge-journey-chat
      >
        <MessageCircle className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/90">
          {item.body?.trim() || item.authorDisplayName}
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
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="size-9 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="size-9 shrink-0 rounded-lg bg-muted" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {item.authorDisplayName}
        </span>
      </button>
    );
  }

  return null;
}

/** Bridge context — compact time-aligned strip (no section chrome). */
export function ExperienceBridgeJourneyTimeline({
  timeline,
  experienceWindow: _experienceWindow,
  onOpenTalk,
  onOpenMedia,
  onAcceptPlanningProposal,
  onRejectPlanningProposal,
  showPlanningProposalAccept = false,
  className,
}: ExperienceBridgeJourneyTimelineProps) {
  const groups = groupBridgeTimelineByPhase(timeline);
  const flatItems = groups.flatMap((group) => group.items).slice(0, MAX_VISIBLE_ITEMS);

  if (flatItems.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-1.5", className)} data-bridge-journey-timeline>
      {flatItems.map((item) => (
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
    </section>
  );
}
