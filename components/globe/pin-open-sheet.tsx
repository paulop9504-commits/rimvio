"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { EvidenceList } from "@/components/experience/evidence-list";
import { ExperienceHeroCard } from "@/components/experience/experience-hero-card";
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
import { projectExperienceHeroFromEvent } from "@/lib/globe/project-experience-hero";
import {
  buildExperienceRoomHref,
  projectExperienceConversation,
} from "@/lib/globe/project-experience-conversation";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";
import { projectRepresentativeMoments } from "@/lib/globe/project-representative-moments";
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
};

/** Pin = experience entrance — hero + people + moments + conversation + evidence. */
export function PinOpenSheet({ open, onOpenChange, cluster }: PinOpenSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [opened, setOpened] = useState(false);
  const [revision, setRevision] = useState(0);
  const gpsPings = useFeedGpsPings();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setOpened(false);
    }
  }, [open]);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const allEvents = useMemo(() => listLifeEventCandidates(), [revision]);
  const eventsById = useMemo(() => indexEventsById(allEvents), [allEvents]);
  const { volumesByEventId } = useExperienceGraph(eventsById);

  const event = cluster ? eventsById.get(cluster.eventId) : null;
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

  const hero = useMemo(
    () =>
      projectExperienceHeroFromEvent({
        event,
        volume,
        allEvents,
      }),
    [event, volume, allEvents],
  );

  const people = useMemo(
    () => experienceRoom?.participants.map((row) => row.displayName) ?? [],
    [experienceRoom],
  );

  const moments = useMemo(
    () => projectRepresentativeMoments({ event, volume }),
    [event, volume],
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
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[90] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={hero.title}
            className="fixed inset-x-0 bottom-0 z-[91] mx-auto flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-border bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            data-pin-open-sheet
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-foreground/15" aria-hidden />
            <header className="flex items-center justify-end px-4 pt-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full active:bg-foreground/5"
                aria-label="닫기"
              >
                <X className="size-5 text-muted-foreground" aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <PeopleStrip names={people} />
              <RepresentativeMomentsRow moments={moments} />
              {conversation ? (
                <RecentConversationStrip
                  conversation={conversation}
                  onOpenRoom={openExperienceRoom}
                />
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
                onClick={() => setOpened((value) => !value)}
                data-pin-open-primary
              >
                {opened ? "닫기" : "열기"}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
