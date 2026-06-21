"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  ChevronDown,
  ImagePlus,
  MapPin,
  MessageCircle,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useBridgeContextEnvironment } from "@/hooks/use-bridge-context-environment";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { buildBridgeContextRecallLine } from "@/lib/globe/build-bridge-context-recall-line";
import { countEventMediaPoolMatches } from "@/lib/globe/count-event-media-pool-matches";
import { readPinContextNote } from "@/lib/globe/pin-context-note";
import { patchExperiencePinContext } from "@/lib/globe/patch-experience-pin-context";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import type { ExperienceHeroProjection } from "@/lib/globe/project-experience-hero";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { isDomesticMapPlace } from "@/lib/resolvers/place-map-region";
import { buildEntityNavigateHref } from "@/lib/resolvers/map-app-launch";
import { readMapApp } from "@/lib/preferences/map-app";
import { GlobeContextHubPanel } from "@/components/globe/globe-context-hub-panel";
import { GlobeContextShareFriendsPanel } from "@/components/globe/globe-context-share-friends-panel";
import { RecentConversationStrip } from "@/components/experience/recent-conversation-strip";
import { ExperienceBridgeJourneyTimeline } from "@/components/globe/experience-bridge-journey-timeline";
import type { ExperienceBridgeTimelineItem } from "@/lib/experience-bridge/experience-bridge-types";
import type { ExperienceWindow } from "@/lib/experience-window/experience-window-types";
import type { ExperienceConversationProjection } from "@/lib/globe/experience-conversation-types";
import { copy } from "@/lib/copy/human-ko";
import {
  RIMVIO_RADIUS,
  RIMVIO_TYPE,
  rimvioTalkRowClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type BridgeContextParticipant = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  status?: "pending" | "accepted" | "declined" | "left" | "removed";
  role?: "host" | "member";
};

export type BridgeContextPanelProps = {
  event: EventCandidate;
  hero: ExperienceHeroProjection;
  allEvents: readonly EventCandidate[];
  reelItems: readonly ContextMediaReelItem[];
  volume?: ExperienceVolume | null;
  viewerUserId?: string | null;
  participants: readonly BridgeContextParticipant[];
  activeAuthorFilter: string | null;
  onAuthorFilterChange: (userId: string | null) => void;
  onShowFilteredMedia: () => void;
  onOpenTalk: () => void;
  onOpenMediaPool: () => void;
  onNoteSaved?: () => void;
  onHubUpdated?: () => void;
  conversation?: ExperienceConversationProjection | null;
  isBridgeHost?: boolean;
  journeyTimeline?: readonly ExperienceBridgeTimelineItem[];
  experienceWindow?: ExperienceWindow | null;
  className?: string;
};

function buildCalendarHref(input: { title: string; place: string }): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title.trim() || "다시 만나기",
    location: input.place.trim(),
    details: input.place.trim(),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function BridgeToolButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  badge?: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 active:bg-muted/80"
    >
      <span className="relative flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
        {icon}
        {badge != null && badge > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    </button>
  );
}

/** Bridge 맥락 탭 — recall · people · talk · tools (minimal). */
export function BridgeContextPanel({
  event,
  hero,
  allEvents,
  reelItems,
  volume,
  viewerUserId,
  participants,
  activeAuthorFilter,
  onAuthorFilterChange,
  onShowFilteredMedia,
  onOpenTalk,
  onOpenMediaPool,
  onNoteSaved,
  onHubUpdated,
  conversation = null,
  isBridgeHost = false,
  journeyTimeline = [],
  experienceWindow = null,
  className,
}: BridgeContextPanelProps) {
  const environment = useBridgeContextEnvironment(event, true);
  const savedNote = readPinContextNote(event);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(Boolean(savedNote.trim()));

  const noteValue = noteDraft ?? savedNote;

  const recall = useMemo(
    () =>
      buildBridgeContextRecallLine({
        event,
        allEvents,
        reelItems,
        volume,
        viewerUserId,
      }),
    [event, allEvents, reelItems, volume, viewerUserId],
  );

  const poolMatchCount = useMemo(
    () => countEventMediaPoolMatches(event),
    [event, reelItems.length],
  );

  const people = useMemo(() => {
    const byId = new Map<string, BridgeContextParticipant>();
    for (const row of participants) {
      const id = row.userId.trim();
      if (!id) {
        continue;
      }
      byId.set(id, row);
    }
    for (const item of reelItems) {
      const id = item.ownerUserId?.trim();
      if (!id || byId.has(id)) {
        continue;
      }
      byId.set(id, {
        userId: id,
        displayName: item.authorDisplayName?.trim() || "친구",
        avatarUrl: item.authorAvatarUrl ?? null,
      });
    }
    return [...byId.values()].filter(
      (row) => !viewerUserId || row.userId !== viewerUserId,
    );
  }, [participants, reelItems, viewerUserId]);

  const mapApp = readMapApp(
    isDomesticMapPlace({ placeName: hero.place, title: hero.title, sourceUrl: hero.place }),
  );

  const selectAuthor = (userId: string | null) => {
    onAuthorFilterChange(userId);
    if (userId) {
      onShowFilteredMedia();
    }
  };

  const handleSaveNote = async () => {
    const trimmed = noteValue.trim();
    if (!trimmed || trimmed === savedNote.trim()) {
      return;
    }
    setNoteBusy(true);
    try {
      await patchExperiencePinContext(event.id, { note: trimmed });
      setNoteDraft(null);
      onNoteSaved?.();
      toast.success(copy.globe.bridgeContextNoteSaved);
    } catch {
      toast.error("저장하지 못했어요");
    } finally {
      setNoteBusy(false);
    }
  };

  const envLine =
    environment.weatherLine?.trim() ||
    environment.trafficLine?.trim() ||
    null;

  return (
    <div className={cn("space-y-4 pb-1", className)} data-bridge-context-panel>
      <div className="space-y-1 px-0.5">
        <p className="text-[18px] font-semibold leading-snug tracking-tight text-foreground">
          {recall.primary}
        </p>
        {recall.secondary ? (
          <p className="text-[13px] text-muted-foreground">{recall.secondary}</p>
        ) : null}
        {envLine ? (
          <p className="text-[12px] font-medium text-muted-foreground/90">{envLine}</p>
        ) : null}
        {recall.dateLabel ? (
          <p className="pt-0.5 text-[11px] font-semibold text-primary/75">
            {recall.dateLabel}
          </p>
        ) : null}
      </div>

      {journeyTimeline.length > 0 || experienceWindow ? (
        <ExperienceBridgeJourneyTimeline
          timeline={journeyTimeline}
          experienceWindow={experienceWindow}
          onOpenTalk={onOpenTalk}
          onOpenMedia={onShowFilteredMedia}
        />
      ) : null}

      {people.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => selectAuthor(null)}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-[10px] font-bold",
                activeAuthorFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              ALL
            </span>
          </button>
          {people.map((row) => {
            const selected = activeAuthorFilter === row.userId;
            return (
              <button
                key={row.userId}
                type="button"
                onClick={() => selectAuthor(row.userId)}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <PeerProfileAvatar
                  displayName={row.displayName}
                  avatarUrl={row.avatarUrl}
                  size="md"
                  className={cn(
                    "size-11 ring-2",
                    selected ? "ring-primary" : "ring-transparent",
                  )}
                />
                <span className="max-w-[3.5rem] truncate text-[10px] font-medium text-foreground">
                  {row.displayName}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {conversation && conversation.previews.length > 0 ? (
        <RecentConversationStrip conversation={conversation} onOpenRoom={onOpenTalk} />
      ) : (
        <button
          type="button"
          onClick={onOpenTalk}
          className={rimvioTalkRowClass()}
        >
          <MessageCircle className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className={cn("block font-semibold", RIMVIO_TYPE.body)}>
              {copy.globe.bridgeContextTalkCta}
            </span>
            <span className={cn("block", RIMVIO_TYPE.caption)}>
              {copy.globe.bridgeContextTalkPreviewEmpty}
            </span>
          </span>
        </button>
      )}

      <div className={cn("flex items-stretch justify-between gap-1 px-1 py-1", RIMVIO_RADIUS.lg, "bg-muted/40")}>
        <BridgeToolButton
          icon={<MapPin className="size-4" aria-hidden />}
          label={copy.globe.bridgeContextNavCta}
          onPress={() => {
            openSpawnAction({
              deeplink: buildEntityNavigateHref(mapApp, { placeName: hero.place }),
            });
          }}
        />
        <BridgeToolButton
          icon={<CalendarPlus className="size-4" aria-hidden />}
          label={copy.globe.bridgeContextScheduleCta}
          onPress={() => {
            openSpawnAction({
              deeplink: buildCalendarHref({ title: hero.title, place: hero.place }),
            });
          }}
        />
        <BridgeToolButton
          icon={<ImagePlus className="size-4" aria-hidden />}
          label={copy.globe.bridgeContextPoolCta}
          badge={poolMatchCount}
          onPress={onOpenMediaPool}
        />
        <BridgeToolButton
          icon={<StickyNote className="size-4" aria-hidden />}
          label={copy.globe.bridgeContextNoteCta}
          onPress={() => setNoteOpen((value) => !value)}
        />
      </div>

      {noteOpen ? (
        <textarea
          value={noteValue}
          onChange={(event) => setNoteDraft(event.target.value)}
          onBlur={() => void handleSaveNote()}
          placeholder={copy.globe.bridgeContextNoteEmpty}
          rows={2}
          disabled={noteBusy}
          data-bridge-context-note
          className={cn("w-full resize-none px-3.5 py-3 outline-none", RIMVIO_RADIUS.lg, RIMVIO_TYPE.body, "bg-muted placeholder:text-muted-foreground/70")}
        />
      ) : null}

      <button
        type="button"
        onClick={() => setHubOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl px-1 py-1 text-left active:opacity-80"
      >
        <span className="text-[12px] font-semibold text-muted-foreground">
          {copy.globe.mainActionEyebrow}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition",
            hubOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {hubOpen ? (
        <GlobeContextHubPanel
          event={event}
          destinationLabel={hero.place}
          onUpdated={onHubUpdated}
        />
      ) : null}

      {isBridgeHost ? (
        <GlobeContextShareFriendsPanel event={event} />
      ) : null}
    </div>
  );
}
