"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  PinContextFieldSheet,
  type PinContextFieldKind,
} from "@/components/globe/pin-context-field-sheet";
import { PinContextTappableField } from "@/components/globe/pin-context-tappable-field";
import { GlobeContextPhotoButton } from "@/components/globe/globe-context-photo-button";
import { GlobeContextShareFriendsPanel } from "@/components/globe/globe-context-share-friends-panel";
import { GlobeContextMediaShortsReel } from "@/components/globe/globe-context-media-shorts-reel";
import { patchExperiencePinContext } from "@/lib/globe/patch-experience-pin-context";
import { isGlobeManualContextEvent } from "@/lib/events/event-lifecycle";
import { EvidenceList } from "@/components/experience/evidence-list";
import { ExperienceHeroCard } from "@/components/experience/experience-hero-card";
import { ExperienceTripLegBar } from "@/components/experience/experience-trip-leg-bar";
import { PeopleStrip } from "@/components/experience/people-strip";
import { RecentConversationStrip } from "@/components/experience/recent-conversation-strip";
import { RepresentativeMomentsRow } from "@/components/experience/representative-moments-row";
import { SpatialMediaSyncPlayer } from "@/components/experience/spatial-media-sync-player";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { useFeedGpsPings } from "@/hooks/use-feed-gps-pings";
import {
  PEER_MESSAGE_LOG_UPDATED,
  readPeerMessageLog,
} from "@/lib/context/peer-message-log";
import { projectExperienceClassifiedGlobePings } from "@/lib/feed/project-experience-classified-globe-pings";
import { projectEvidenceSummary } from "@/lib/globe/project-evidence-summary";
import {
  projectExperienceHeroFromCluster,
  projectExperienceHeroFromEvent,
} from "@/lib/globe/project-experience-hero";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import {
  buildExperienceRoomHref,
  projectExperienceConversation,
} from "@/lib/globe/project-experience-conversation";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { projectPinClustersFromGraph } from "@/lib/globe/project-pin-clusters";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import { projectTripLegBar } from "@/lib/globe/project-trip-leg-arcs";
import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";
import { projectRepresentativeMoments } from "@/lib/globe/project-representative-moments";
import { syncBridgeParticipantMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";
import { MEDIA_SPACETIME_UPDATED, hydrateMediaContextStore } from "@/lib/location-ping/media-context-store";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import { cn } from "@/lib/utils";

export type PinOpenSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: PinCluster | null;
  /** Zoom globe to street altitude when user opens full detail. */
  onOpenDetail?: () => void;
};

/** Pin = experience entrance — hero + people + moments + conversation + evidence. */
export function PinOpenSheet({
  open,
  onOpenChange,
  cluster,
  onOpenDetail,
}: PinOpenSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [opened, setOpened] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editKind, setEditKind] = useState<PinContextFieldKind | null>(null);
  const gpsPings = useFeedGpsPings();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void hydrateMediaContextStore().then(() => setRevision((value) => value + 1));
  }, [open]);

  useEffect(() => {
    const eventId = cluster?.eventId?.trim();
    if (!open || !eventId) {
      return;
    }
    void syncBridgeParticipantMediaFromRemote(eventId).then((merged) => {
      if (merged) {
        setRevision((value) => value + 1);
      }
    });
  }, [open, cluster?.eventId]);

  useEffect(() => {
    if (!open) {
      setOpened(false);
    }
  }, [open]);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
    };
  }, []);

  const allEvents = useMemo(() => listLifeEventCandidates(), [revision]);
  const eventsById = useMemo(() => indexEventsById(allEvents), [allEvents]);
  const event = cluster ? eventsById.get(cluster.eventId) : null;
  const { graph, volumesByEventId } = useExperienceGraph(eventsById);
  const clusters = useMemo(
    () =>
      projectPinClustersFromGraph({
        volumes: graph.volumes,
        eventsById,
      }),
    [graph.volumes, eventsById],
  );
  const tripLeg = useMemo(
    () => projectTripLegBar({ event, eventsById, clusters }),
    [event, eventsById, clusters],
  );
  const volume = cluster ? volumesByEventId.get(cluster.eventId) ?? null : null;
  const experienceRoom = useMemo(
    () => (event ? projectExperienceRoom({ primaryEvent: event }) : null),
    [event],
  );

  const threadId = experienceRoom?.threadIds[0] ?? null;

  useEffect(() => {
    if (!open || !threadId) {
      return;
    }
    const bump = (event: Event) => {
      const detail = (event as CustomEvent<{ peerThreadId?: string }>).detail;
      if (!detail?.peerThreadId || detail.peerThreadId === threadId) {
        setRevision((value) => value + 1);
      }
    };
    window.addEventListener(PEER_MESSAGE_LOG_UPDATED, bump);
    return () => window.removeEventListener(PEER_MESSAGE_LOG_UPDATED, bump);
  }, [open, threadId]);

  useEffect(() => {
    if (!open || !cluster?.eventId || event) {
      return;
    }
    const recovered = recoverGlobeContextEventFromPin(cluster.eventId);
    if (recovered) {
      setRevision((value) => value + 1);
    }
  }, [open, cluster, event]);

  const hero = useMemo(() => {
    const fromEvent = projectExperienceHeroFromEvent({
      event,
      volume,
      allEvents,
    });
    if (fromEvent) {
      return fromEvent;
    }
    if (cluster) {
      return projectExperienceHeroFromCluster(cluster);
    }
    return null;
  }, [event, volume, allEvents, cluster]);

  const photoPrimary =
    (event != null && isGlobeManualContextEvent(event)) ||
    (hero != null && hero.photoCount === 0 && hero.videoCount === 0);

  const people = useMemo(
    () => experienceRoom?.participants.map((row) => row.displayName) ?? [],
    [experienceRoom],
  );

  const moments = useMemo(
    () => projectRepresentativeMoments({ event, volume }),
    [event, volume],
  );

  const reelItems = useMemo(
    () => projectContextMediaReel({ event, volume }),
    [event, volume, revision],
  );

  const conversation = useMemo(() => {
    if (!event) {
      return null;
    }
    const threadId = experienceRoom?.threadIds[0] ?? null;
    const messages = threadId ? readPeerMessageLog(threadId).messages : [];
    return projectExperienceConversation({
      event,
      messages,
      participants: experienceRoom?.participants ?? [],
    });
  }, [event, experienceRoom]);

  const evidence = useMemo(
    () => projectEvidenceSummary({ event, volume }),
    [event, volume],
  );

  const classifiedPins = useMemo(() => {
    if (!cluster || !volume) {
      return [];
    }
    return projectExperienceClassifiedGlobePings({
      volume,
      event,
      gpsPings,
      emphasis: "primary",
    });
  }, [cluster, volume, event, gpsPings]);

  const openMomentItemId = moments[0]?.spatialItemId ?? null;

  const shareEvent = useMemo(() => {
    if (event) {
      return event;
    }
    if (!cluster?.eventId) {
      return null;
    }
    return recoverGlobeContextEventFromPin(cluster.eventId);
  }, [event, cluster?.eventId]);

  const openExperienceRoom = () => {
    if (!conversation?.peerThreadId || !event || !hero) {
      return;
    }
    onOpenChange(false);
    router.push(
      buildExperienceRoomHref({
        peerThreadId: conversation.peerThreadId,
        eventId: event.id,
        title: hero.title,
        date: hero.date,
        place: hero.place,
      }),
    );
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && cluster && hero ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10061] bg-black/35"
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            role="dialog"
            aria-label={hero.title}
            className={cn(
              "fixed z-[10062] flex w-full flex-col overflow-hidden border border-border bg-background shadow-2xl",
              reelItems.length > 0
                ? "inset-x-0 bottom-0 h-[min(96dvh,820px)] max-h-[96dvh] rounded-t-[24px]"
                : "inset-x-0 bottom-0 max-h-[min(96vh,820px)] rounded-t-[24px]",
              "md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:max-w-[min(92vw,420px)] md:rounded-none md:rounded-l-[24px]",
            )}
            initial={{ y: "100%", x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: "100%", x: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            data-pin-open-sheet
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-foreground/15 md:hidden" aria-hidden />
            {reelItems.length > 0 ? (
              <>
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 bg-gradient-to-b from-background via-background/95 to-transparent px-4 pb-3 pt-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        장소 · {hero.place}
                      </p>
                      <p className="line-clamp-1 px-2 text-[15px] font-bold text-foreground">
                        {hero.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/80 active:bg-foreground/5"
                      aria-label="닫기"
                    >
                      <X className="size-5 text-muted-foreground" aria-hidden />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain pt-[4.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <GlobeContextMediaShortsReel
                      items={reelItems}
                      title={hero.title}
                      place={hero.place}
                      fillViewport
                    />
                    <section className="snap-start space-y-4 bg-background px-4 py-5">
                      <p className="text-center text-[11px] font-medium text-muted-foreground">
                        맥락 정보 · 아래로 더 보기
                      </p>
                      {tripLeg ? <ExperienceTripLegBar trip={tripLeg} /> : null}
                      <PeopleStrip names={people} />
                      <RepresentativeMomentsRow moments={moments} />
                      {conversation ? (
                        <RecentConversationStrip
                          conversation={conversation}
                          onOpenRoom={openExperienceRoom}
                        />
                      ) : null}
                      {shareEvent ? (
                        <GlobeContextShareFriendsPanel event={shareEvent} />
                      ) : null}
                      <EvidenceList rows={evidence} />
                    </section>
                  </div>
                </div>

                <div className="shrink-0 space-y-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <GlobeContextPhotoButton
                    eventId={cluster.eventId}
                    eventTitle={hero.title}
                    variant="secondary"
                    onIngested={() => setRevision((value) => value + 1)}
                  />
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-border bg-background py-3.5 text-[15px] font-semibold text-foreground active:opacity-85"
                    onClick={() => onOpenChange(false)}
                    data-pin-open-close
                  >
                    닫기
                  </button>
                </div>
              </>
            ) : (
              <>
            <header className="flex items-start gap-2 px-4 pb-3 pt-3">
              <div className="min-w-0 flex-1 space-y-1">
                <PinContextTappableField
                  label="장소"
                  value={hero.place}
                  onPress={() => setEditKind("place")}
                />
                <PinContextTappableField
                  label="경험 제목"
                  value={hero.title}
                  onPress={() => setEditKind("title")}
                />
                <p className="px-2 text-[11px] text-muted-foreground">
                  틀린 이름은 탭해서 바로 고쳐요
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full active:bg-foreground/5"
                aria-label="닫기"
              >
                <X className="size-5 text-muted-foreground" aria-hidden />
              </button>
            </header>

            {cluster && hero ? (
              <div className="shrink-0 px-4 pb-3">
                <GlobeContextPhotoButton
                  eventId={cluster.eventId}
                  eventTitle={hero.title}
                  variant={photoPrimary ? "primary" : "secondary"}
                  onIngested={() => setRevision((value) => value + 1)}
                />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="snap-start space-y-5 px-4 pt-2">
                {tripLeg ? <ExperienceTripLegBar trip={tripLeg} /> : null}
                {reelItems.length === 0 ? (
                  <ExperienceHeroCard
                    title={hero.title}
                    date={hero.date}
                    place={hero.place}
                    peopleCount={hero.peopleCount}
                    photoCount={hero.photoCount}
                    videoCount={hero.videoCount}
                    heroImageContextId={hero.heroImageContextId}
                    recallLine={hero.recallLine}
                  />
                ) : null}
                <PeopleStrip names={people} />
                <RepresentativeMomentsRow moments={moments} />
                {conversation ? (
                  <RecentConversationStrip
                    conversation={conversation}
                    onOpenRoom={openExperienceRoom}
                  />
                ) : null}
                {shareEvent ? (
                  <GlobeContextShareFriendsPanel event={shareEvent} />
                ) : null}
                <EvidenceList rows={evidence} />
                {opened && volume ? (
                  <SpatialMediaSyncPlayer
                    volume={volume}
                    classifiedPins={classifiedPins}
                    experienceOpen
                    initialItemId={openMomentItemId}
                  />
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-2xl py-4 text-[16px] font-semibold transition-opacity active:opacity-85",
                    opened
                      ? "border border-border bg-background text-foreground"
                      : "bg-foreground text-background",
                    !volume && !opened && "opacity-40",
                  )}
                  disabled={!opened && !volume}
                  onClick={() => {
                    setOpened((value) => {
                      const next = !value;
                      if (next) {
                        onOpenDetail?.();
                      }
                      return next;
                    });
                  }}
                  data-pin-open-primary
                >
                  {opened ? "닫기" : "열기"}
                </button>
            </div>
              </>
            )}

            <PinContextFieldSheet
              open={editKind !== null}
              onOpenChange={(next) => {
                if (!next) {
                  setEditKind(null);
                }
              }}
              kind={editKind ?? "place"}
              value={
                editKind === "title"
                  ? hero.title
                  : editKind === "place"
                    ? hero.place
                    : ""
              }
              onSave={async (next) => {
                if (!cluster?.eventId || !editKind || editKind === "note") {
                  return;
                }
                try {
                  await patchExperiencePinContext(cluster.eventId, {
                    ...(editKind === "place" ? { place: next } : {}),
                    ...(editKind === "title" ? { title: next } : {}),
                  });
                  setRevision((value) => value + 1);
                  toast.success(
                    editKind === "place" ? "장소를 고쳤어요" : "제목을 고쳤어요",
                  );
                } catch (caught) {
                  const message =
                    caught instanceof Error
                      ? caught.message
                      : "저장하지 못했어요.";
                  toast.error(message);
                  throw caught;
                }
              }}
            />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
