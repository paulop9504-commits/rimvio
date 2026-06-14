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
import { ExperienceBridgeMediaShell } from "@/components/globe/experience-bridge-media-shell";
import { PinOpenContextDetailsPanel } from "@/components/globe/pin-open-context-details-panel";
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
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";
import { useAuth } from "@/hooks/use-auth";
import { MEDIA_SPACETIME_UPDATED, hydrateMediaContextStore } from "@/lib/location-ping/media-context-store";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";

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
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [opened, setOpened] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editKind, setEditKind] = useState<PinContextFieldKind | null>(null);
  const [contextDetailsExpanded, setContextDetailsExpanded] = useState(false);
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
    let cancelled = false;
    let debounceTimer: number | null = null;

    const runSync = () => {
      if (cancelled) {
        return;
      }
      void syncBridgeSharedMediaFromRemote(eventId, user?.id)
        .then((merged) => {
          if (!cancelled && merged) {
            setRevision((value) => value + 1);
          }
        })
        .catch(() => {
          if (!cancelled) {
            toast.error("공유 사진·동영상을 불러오지 못했어요.");
          }
        });
    };

    runSync();
    const retry = window.setTimeout(runSync, 2000);

    const onCandidatesUpdated = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        runSync();
      }, 1200);
    };
    window.addEventListener(EVENT_CANDIDATES_UPDATED, onCandidatesUpdated);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, onCandidatesUpdated);
    };
  }, [open, cluster?.eventId, user?.id]);

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
  }, [open, cluster?.eventId, event]);

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
    () => projectContextMediaReel({ event, volume, viewerUserId: user?.id }),
    [event, volume, revision, user?.id],
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

  const bridgeMediaDeletable = useMemo(() => {
    const id = cluster?.eventId?.trim();
    return Boolean(id && isBridgeLinkedEventId(id));
  }, [cluster?.eventId]);

  const isBridgeContext = useMemo(() => {
    if (bridgeMediaDeletable || isBridgeSharedEvent(event)) {
      return true;
    }
    const viewerId = user?.id?.trim();
    if (!viewerId) {
      return false;
    }
    return reelItems.some(
      (row) => row.ownerUserId?.trim() && row.ownerUserId.trim() !== viewerId,
    );
  }, [bridgeMediaDeletable, event, reelItems, user?.id]);

  const contextDetailsSummary = useMemo(() => {
    const parts: string[] = [];
    if (moments.length > 0) {
      parts.push("대표 장면");
    }
    if (shareEvent) {
      parts.push(copy.globe.bridgeShareSectionTitle);
    }
    for (const row of evidence) {
      if ((row.kind === "photo" || row.kind === "video") && row.count > 0) {
        parts.push(`${row.label} ${row.count}`);
      }
    }
    if (people.length > 0) {
      parts.push(`함께 ${people.length}명`);
    }
    return parts.length > 0 ? parts.join(" · ") : copy.globe.pinContextDetailsFallback;
  }, [moments.length, shareEvent, evidence, people.length]);

  useEffect(() => {
    if (!open || !cluster?.eventId) {
      return;
    }
    setContextDetailsExpanded(reelItems.length === 0);
    // Reset only when the sheet or pin changes — not on every media sync.
  }, [open, cluster?.eventId]);

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
                <div
                  className={cn(
                    "relative flex min-h-0 flex-1 flex-col overflow-hidden",
                    isBridgeContext && "bg-[#0a0c10]",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start gap-2 px-4 pb-3 pt-3",
                      isBridgeContext
                        ? "bg-gradient-to-b from-[#0a0c10] via-[#0a0c10]/95 to-transparent"
                        : "bg-gradient-to-b from-background via-background/95 to-transparent",
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p
                        className={cn(
                          "px-2 text-[10px] font-semibold uppercase tracking-wide",
                          isBridgeContext ? "text-white/50" : "text-muted-foreground",
                        )}
                      >
                        {isBridgeContext ? copy.globe.bridgeMediaEyebrow : `장소 · ${hero.place}`}
                      </p>
                      <p
                        className={cn(
                          "line-clamp-1 px-2 text-[15px] font-bold",
                          isBridgeContext ? "text-white" : "text-foreground",
                        )}
                      >
                        {hero.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "pointer-events-auto flex size-9 shrink-0 items-center justify-center rounded-full active:opacity-80",
                        isBridgeContext
                          ? "bg-white/10 text-white"
                          : "bg-background/80 active:bg-foreground/5",
                      )}
                      aria-label="닫기"
                    >
                      <X
                        className={cn(
                          "size-5",
                          isBridgeContext ? "text-white/80" : "text-muted-foreground",
                        )}
                        aria-hidden
                      />
                    </button>
                  </div>

                  <div
                    className={cn(
                      "relative z-0 flex min-h-0 flex-col overflow-hidden",
                      contextDetailsExpanded
                        ? "h-[min(44dvh,400px)] shrink-0"
                        : "min-h-0 flex-1",
                    )}
                  >
                    {isBridgeContext ? (
                      <ExperienceBridgeMediaShell
                        items={reelItems}
                        title={hero.title}
                        place={hero.place}
                        eventId={cluster.eventId}
                        viewerUserId={user?.id}
                        deletable={bridgeMediaDeletable}
                        onMediaDeleted={() => {
                          setRevision((value) => value + 1);
                          toast.success("삭제했어요");
                        }}
                      />
                    ) : (
                      <div className="flex h-full min-h-0 flex-col overflow-hidden pt-[3.75rem]">
                        <div className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          <GlobeContextMediaShortsReel
                            key={cluster.eventId}
                            items={reelItems}
                            title={hero.title}
                            place={hero.place}
                            fillViewport
                            embedded
                            eventId={cluster.eventId}
                            viewerUserId={user?.id}
                            deletable={bridgeMediaDeletable}
                            onMediaDeleted={() => {
                              setRevision((value) => value + 1);
                              toast.success("삭제했어요");
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <PinOpenContextDetailsPanel
                    summary={contextDetailsSummary}
                    expanded={contextDetailsExpanded}
                    onExpandedChange={setContextDetailsExpanded}
                  >
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
                  </PinOpenContextDetailsPanel>
                </div>

                <div className="shrink-0 space-y-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <GlobeContextPhotoButton
                    eventId={cluster.eventId}
                    eventTitle={hero.title}
                    variant="secondary"
                    onIngested={() => {
                      setRevision((value) => value + 1);
                      const eventId = cluster.eventId.trim();
                      void syncBridgeSharedMediaFromRemote(eventId, user?.id).then(
                        (merged) => {
                          if (merged) {
                            setRevision((value) => value + 1);
                          }
                        },
                      );
                    }}
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
