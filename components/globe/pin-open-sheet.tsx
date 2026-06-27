"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  PinContextFieldSheet,
  type PinContextFieldKind,
} from "@/components/globe/pin-context-field-sheet";
import { PinContextTappableField } from "@/components/globe/pin-context-tappable-field";
import { GlobeContextSendRail } from "@/components/globe/globe-context-send-rail";
import { MarketplacePinContextPanel } from "@/components/globe/marketplace-pin-context-panel";
import { GlobeContextPhotoButton } from "@/components/globe/globe-context-photo-button";
import { GlobeContextMediaShortsReel } from "@/components/globe/globe-context-media-shorts-reel";
import { ExperienceBridgeMediaShell, type BridgeMediaArrivalHint } from "@/components/globe/experience-bridge-media-shell";
import { BridgeContextPanel } from "@/components/globe/bridge-context-panel";
import { BridgePinSheetFooter } from "@/components/globe/bridge-pin-sheet-footer";
import { GlobeContextLineageChip } from "@/components/globe/globe-context-lineage-chip";
import { GlobeMediaPoolSheet } from "@/components/globe/globe-media-pool-sheet";
import { PinOpenMediaContextPager, PinOpenMediaContextPageTabs, type PinMediaContextPage } from "@/components/globe/pin-open-media-context-pager";
import { patchExperiencePinContext } from "@/lib/globe/patch-experience-pin-context";
import { recordExperienceBehavior } from "@/lib/meaning/record-experience-behavior";
import { isGlobeManualContextEvent } from "@/lib/events/event-lifecycle";
import { EvidenceList } from "@/components/experience/evidence-list";
import { ExperienceHeroCard } from "@/components/experience/experience-hero-card";
import { ExperienceTripLegBar } from "@/components/experience/experience-trip-leg-bar";
import { GlobeContextHubPanel } from "@/components/globe/globe-context-hub-panel";
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
import { resolveExperienceTalkThreadId } from "@/lib/globe/resolve-experience-peer-thread-id";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { projectPinClustersFromGraph } from "@/lib/globe/project-pin-clusters";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import { projectTripLegBar } from "@/lib/globe/project-trip-leg-arcs";
import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";
import { projectRepresentativeMoments } from "@/lib/globe/project-representative-moments";
import { BridgeCompanionStatusStrip } from "@/components/globe/bridge-companion-status-strip";
import { projectBridgeCompanionStatus } from "@/lib/experience-bridge/project-bridge-companion-status";
import { useBridgeSyncPhase } from "@/hooks/use-bridge-stack-prep";
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";
import { listReadableBridgeParticipants } from "@/lib/experience-bridge";
import { useExperienceBridge } from "@/hooks/use-experience-bridge";
import { resolveExperienceWindow } from "@/lib/experience-window";
import { attachPoolMediaBatch } from "@/lib/media-pool/attach-pool-media-to-event";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";
import { useAuth } from "@/hooks/use-auth";
import { MEDIA_SPACETIME_UPDATED, hydrateMediaContextStore } from "@/lib/location-ping/media-context-store";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import {
  RIMVIO_TYPE,
  rimvioHeroCtaClass,
  rimvioPinOpenSheetClass,
  rimvioSecondaryCtaClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  rimvioSheetFooterClass,
  rimvioSheetGrabberClass,
  rimvioSheetHeaderClass,
  rimvioTalkRowClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";
import { resolveRimvioHonorific } from "@/lib/copy/rimvio-honorific";
import { PinPulseContextStrip } from "@/components/globe/pin-pulse-context-strip";
import { PortalMarketSuggestionCard } from "@/components/portal/portal-market-suggestion-card";
import { usePinPulseContext } from "@/hooks/use-pin-pulse-context";
import { dispatchGlobeContextShareRequest } from "@/lib/globe/globe-context-share-request";
import {
  findMarketIntentByEventId,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { readBridgeTypeFromMetadata, isMarketplaceBridgeType } from "@/lib/bridge/bridge-type";
import { publishMarketIntentExternal } from "@/lib/globe/market/publish-market-intent-external";
import { dispatchGlobePortalOpen } from "@/lib/portal/globe-portal-open-bridge";
import {
  dismissPortalMarketSuggestion,
  shouldShowPortalMarketSuggestion,
} from "@/lib/portal/portal-market-suggestion-policy";
import { resolvePortalMarketSuggestionFromEvent } from "@/lib/portal/resolve-portal-market-suggestion";

export type PinOpenSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: PinCluster | null;
  /** First tab when sheet opens — e.g. map media tap → 맥락. */
  initialPage?: PinMediaContextPage;
  /** Zoom globe to street altitude when user opens full detail. */
  onOpenDetail?: () => void;
};

/** Pin = experience entrance — hero + people + moments + conversation + evidence. */
export function PinOpenSheet({
  open,
  onOpenChange,
  cluster,
  initialPage = "media",
  onOpenDetail,
}: PinOpenSheetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const rimvioHonorific = resolveRimvioHonorific(user);
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editKind, setEditKind] = useState<PinContextFieldKind | null>(null);
  const [sheetPage, setSheetPage] = useState<PinMediaContextPage>("media");
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [mediaPoolOpen, setMediaPoolOpen] = useState(false);
  const [talkOpening, setTalkOpening] = useState(false);
  const [mediaArrivalHint, setMediaArrivalHint] = useState<BridgeMediaArrivalHint | null>(
    null,
  );
  const reelSnapshotRef = useRef({ count: 0 });
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
    const retry = window.setTimeout(runSync, 900);

    const onCandidatesUpdated = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        runSync();
      }, 450);
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

  const bridge = useExperienceBridge({
    event: event ?? null,
    peerThreadId: threadId,
    enabled: Boolean(event),
  });

  const journeyExperienceWindow = useMemo(() => {
    if (bridge.experienceWindow) {
      return bridge.experienceWindow;
    }
    if (!event) {
      return null;
    }
    return resolveExperienceWindow({
      event,
      bridge: bridge.state?.bridge ?? null,
    });
  }, [bridge.experienceWindow, bridge.state?.bridge, event]);

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

  const filteredReelItems = useMemo(() => {
    if (!authorFilter) {
      return reelItems;
    }
    return reelItems.filter((row) => {
      const owner = row.ownerUserId?.trim();
      const author = row.authorDisplayName?.trim();
      return owner === authorFilter || author === authorFilter;
    });
  }, [authorFilter, reelItems]);

  const bridgeParticipants = useMemo(() => {
    const rows = listReadableBridgeParticipants(bridge.state?.participants ?? []);
    const avatarByUserId = new Map<string, string | null>();
    for (const item of reelItems) {
      const id = item.ownerUserId?.trim();
      if (id && item.authorAvatarUrl) {
        avatarByUserId.set(id, item.authorAvatarUrl);
      }
    }
    return rows.map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      status: row.status,
      role: row.role,
      avatarUrl: avatarByUserId.get(row.userId) ?? null,
    }));
  }, [bridge.state?.participants, reelItems]);

  const isBridgeHost = useMemo(() => {
    const viewerId = user?.id?.trim();
    if (!viewerId || !bridge.state) {
      return false;
    }
    if (bridge.state.bridge.hostUserId === viewerId) {
      return true;
    }
    return bridge.state.participants.some(
      (row) => row.userId === viewerId && row.role === "host",
    );
  }, [bridge.state, user?.id]);

  useEffect(() => {
    if (!open) {
      reelSnapshotRef.current = { count: 0 };
      setMediaArrivalHint(null);
      return;
    }
    const prevCount = reelSnapshotRef.current.count;
    if (reelItems.length > prevCount && prevCount > 0) {
      const newItems = reelItems.slice(prevCount);
      const friendNew = newItems.filter(
        (item) =>
          item.ownerUserId?.trim() &&
          item.ownerUserId.trim() !== user?.id?.trim(),
      );
      if (friendNew.length > 0) {
        const author =
          friendNew[0]?.authorDisplayName?.trim() ||
          copy.globe.bridgeInviteHostFallback;
        setMediaArrivalHint({
          count: friendNew.length,
          authorName: author,
          targetIndex: reelItems.length - 1,
        });
      }
    }
    reelSnapshotRef.current = { count: reelItems.length };
  }, [open, reelItems, user?.id]);

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

  const [marketRevision, setMarketRevision] = useState(0);

  useEffect(() => {
    return subscribeMarketIntents(() => setMarketRevision((value) => value + 1));
  }, []);

  const marketIntent = useMemo(() => {
    void marketRevision;
    const eventId = cluster?.eventId?.trim();
    if (!eventId) {
      return null;
    }
    return findMarketIntentByEventId(eventId);
  }, [cluster?.eventId, marketRevision]);

  const shareEvent = useMemo(() => {
    if (event) {
      return event;
    }
    if (!cluster?.eventId) {
      return null;
    }
    return recoverGlobeContextEventFromPin(cluster.eventId);
  }, [event, cluster?.eventId]);

  const portalMarketSuggestion = useMemo(() => {
    void marketRevision;
    return resolvePortalMarketSuggestionFromEvent(shareEvent);
  }, [marketRevision, shareEvent]);

  const [portalSuggestVisible, setPortalSuggestVisible] = useState(true);
  const [portalSuggestBusy, setPortalSuggestBusy] = useState(false);

  useEffect(() => {
    const eventId = shareEvent?.id?.trim();
    if (!eventId) {
      setPortalSuggestVisible(false);
      return;
    }
    setPortalSuggestVisible(shouldShowPortalMarketSuggestion({ eventId }));
  }, [shareEvent?.id]);

  const isMarketplaceContext = useMemo(() => {
    if (cluster?.marketRole) {
      return true;
    }
    if (marketIntent) {
      return true;
    }
    const bridgeType = readBridgeTypeFromMetadata(event?.metadata ?? shareEvent?.metadata);
    return isMarketplaceBridgeType(bridgeType);
  }, [cluster?.marketRole, event?.metadata, marketIntent, shareEvent?.metadata]);

  const bridgeMediaDeletable = useMemo(() => {
    const id = cluster?.eventId?.trim();
    return Boolean(id && isBridgeLinkedEventId(id));
  }, [cluster?.eventId]);

  const isBridgeContext = useMemo(() => {
    if (isMarketplaceContext) {
      return false;
    }
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
  }, [bridgeMediaDeletable, event, isMarketplaceContext, reelItems, user?.id]);

  const bridgeSyncPhase = useBridgeSyncPhase(
    isBridgeContext ? cluster?.eventId : null,
  );

  const bridgeCompanionStatus = useMemo(() => {
    if (!isBridgeContext || !event) {
      return null;
    }
    return projectBridgeCompanionStatus({
      event,
      viewerUserId: user?.id,
      syncPhase: bridgeSyncPhase,
    });
  }, [bridgeSyncPhase, event, isBridgeContext, revision, user?.id]);

  const pinPulseContextQuery = usePinPulseContext({
    enabled: open && Boolean(cluster) && !isBridgeContext && !isMarketplaceContext,
    lat: cluster?.lat ?? null,
    lng: cluster?.lng ?? null,
    placeLabel: hero?.place ?? cluster?.placeLabel ?? null,
    userCaptureAt: cluster?.startedAtIso ?? event?.datetime ?? null,
  });

  const contextDetailsSummary = useMemo(() => {
    if (isMarketplaceContext && cluster) {
      const role = cluster.marketRole === "seeking" ? "구하기" : "내놓기";
      return [role, cluster.title, cluster.placeLabel].filter(Boolean).join(" · ");
    }
    if (isBridgeContext) {
      const parts = [copy.globe.bridgeContextRecallEyebrow];
      if (people.length > 0) {
        parts.push(`함께 ${people.length}명`);
      }
      parts.push(copy.globe.bridgeContextActionsEyebrow);
      return parts.join(" · ");
    }
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
  }, [cluster, isBridgeContext, isMarketplaceContext, moments.length, shareEvent, evidence, people.length]);

  useEffect(() => {
    if (!open || !cluster?.eventId) {
      return;
    }
    setSheetPage(initialPage);
    setAuthorFilter(null);
  }, [open, cluster?.eventId, initialPage]);

  const openedBehaviorRef = useRef<string | null>(null);
  useEffect(() => {
    const eventId = cluster?.eventId?.trim();
    if (!open || !eventId) {
      openedBehaviorRef.current = null;
      return;
    }
    if (openedBehaviorRef.current === eventId) {
      return;
    }
    openedBehaviorRef.current = eventId;
    recordExperienceBehavior({ eventId, kind: "open" });
  }, [open, cluster?.eventId]);

  const openExperienceRoom = () => {
    void (async () => {
      if (!event || !hero || talkOpening) {
        return;
      }

      let peerThreadId = resolveExperienceTalkThreadId({
        event,
        bridgePeerThreadId: bridge.state?.bridge.peerThreadId,
        conversationPeerThreadId: conversation?.peerThreadId,
        experienceRoomThreadId: threadId,
      });

      if (!peerThreadId) {
        setTalkOpening(true);
        try {
          peerThreadId = await bridge.ensureTalkRoom({ talkTitle: hero.title });
        } catch {
          toast.error(copy.globe.bridgeContextTalkEnsureFail);
          return;
        } finally {
          setTalkOpening(false);
        }
      }

      if (!peerThreadId) {
        toast.message(copy.globe.bridgeTalkUnavailable, {
          action: isBridgeHost
            ? {
                label: copy.globe.bridgeTalkInviteFriendsCta,
                onClick: () => setSheetPage("context"),
              }
            : {
                label: copy.globe.utilityMenuPeers,
                onClick: () => {
                  onOpenChange(false);
                  router.push("/peers");
                },
              },
        });
        return;
      }

      onOpenChange(false);
      router.push(
        buildExperienceRoomHref({
          peerThreadId,
          eventId: event.id,
          title: hero.title,
          date: hero.date,
          place: hero.place,
        }),
      );
    })();
  };

  const talkThreadId = resolveExperienceTalkThreadId({
    event,
    bridgePeerThreadId: bridge.state?.bridge.peerThreadId,
    conversationPeerThreadId: conversation?.peerThreadId,
    experienceRoomThreadId: threadId,
  });
  const canOpenTalk = Boolean(talkThreadId && event && hero);
  const showTalkCta = Boolean(
    event && hero && (canOpenTalk || isBridgeContext) && !isMarketplaceContext,
  );

  const acceptPortalMarketSuggestion = () => {
    if (!portalMarketSuggestion || portalSuggestBusy) {
      return;
    }
    void (async () => {
      setPortalSuggestBusy(true);
      try {
        if (portalMarketSuggestion.kind === "publish_external") {
          const saved = await publishMarketIntentExternal(portalMarketSuggestion.eventId);
          if (saved) {
            toast.success(
              copy.portal.marketSuggestPublishedToast(
                saved.detail.productName.trim() || saved.title.trim(),
              ),
            );
            dismissPortalMarketSuggestion({ eventId: portalMarketSuggestion.eventId });
            setPortalSuggestVisible(false);
            setMarketRevision((value) => value + 1);
            return;
          }
        }
        dispatchGlobePortalOpen({
          eventId: portalMarketSuggestion.eventId,
          composeText: portalMarketSuggestion.seedText,
          initialIntentId: portalMarketSuggestion.portalIntentId,
          source: "context",
        });
        dismissPortalMarketSuggestion({ eventId: portalMarketSuggestion.eventId });
        setPortalSuggestVisible(false);
        onOpenChange(false);
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : copy.globe.ingestAttachFail,
        );
      } finally {
        setPortalSuggestBusy(false);
      }
    })();
  };

  const portalSuggestionCard =
    portalMarketSuggestion &&
    portalSuggestVisible &&
    shouldShowPortalMarketSuggestion({ eventId: portalMarketSuggestion.eventId }) ? (
      <PortalMarketSuggestionCard
        suggestion={portalMarketSuggestion}
        headline={
          portalMarketSuggestion.kind === "publish_external"
            ? copy.portal.marketSuggestPublishHeadline(portalMarketSuggestion.productName)
            : copy.portal.marketSuggestCreateHeadline(portalMarketSuggestion.productName)
        }
        body={
          portalMarketSuggestion.kind === "publish_external"
            ? copy.portal.marketSuggestPublishBody
            : copy.portal.marketSuggestCreateBody
        }
        cta={
          portalMarketSuggestion.kind === "publish_external"
            ? copy.portal.marketSuggestPublishCta
            : copy.portal.marketSuggestCreateCta
        }
        dismissAria={copy.portal.marketSuggestDismissAria}
        busy={portalSuggestBusy}
        onAccept={acceptPortalMarketSuggestion}
        onDismiss={() => {
          dismissPortalMarketSuggestion({ eventId: portalMarketSuggestion.eventId });
          setPortalSuggestVisible(false);
        }}
        className="mb-3"
      />
    ) : null;

  if (!mounted) {
    return null;
  }

  const contextDetailsBody = isMarketplaceContext && cluster ? (
    <>
      {portalSuggestionCard}
      <MarketplacePinContextPanel cluster={cluster} intent={marketIntent} />
    </>
  ) : (
    <>
      {portalSuggestionCard}
      {tripLeg ? <ExperienceTripLegBar trip={tripLeg} /> : null}
      {shareEvent ? (
        <GlobeContextHubPanel
          event={shareEvent}
          destinationLabel={hero?.place ?? null}
          onUpdated={() => setRevision((value) => value + 1)}
        />
      ) : null}
      <PeopleStrip names={people} />
      <RepresentativeMomentsRow moments={moments} />
      {conversation ? (
        <RecentConversationStrip
          conversation={conversation}
          onOpenRoom={openExperienceRoom}
        />
      ) : canOpenTalk || isBridgeContext ? (
        <button
          type="button"
          onClick={openExperienceRoom}
          disabled={talkOpening}
          className={rimvioTalkRowClass()}
        >
          <MessageCircle className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className={cn("block", RIMVIO_TYPE.body, "font-semibold")}>
              {talkOpening
                ? copy.globe.bridgeContextTalkOpening
                : canOpenTalk
                  ? copy.globe.bridgeContextTalkCta
                  : copy.globe.bridgeContextTalkStartCta}
            </span>
            <span className={cn("block", RIMVIO_TYPE.caption)}>
              {canOpenTalk
                ? copy.globe.bridgeContextTalkPreviewEmpty
                : copy.globe.bridgeContextTalkStartHint}
            </span>
          </span>
        </button>
      ) : null}
      <EvidenceList rows={evidence} />
    </>
  );

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
            className={cn(rimvioSheetBackdropClass(), "z-[10061]")}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            role="dialog"
            aria-label={hero.title}
            className={cn(rimvioPinOpenSheetClass(), "z-[10062]")}
            initial={{ y: "100%", x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: "100%", x: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            data-pin-open-sheet
            data-pin-open-ui="split-v2"
          >
            <div className={rimvioSheetGrabberClass(isBridgeContext ? "opacity-0" : undefined)} aria-hidden />
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <header
                className={cn(
                  rimvioSheetHeaderClass(),
                  isBridgeContext && "border-b border-border/50 px-3.5 pb-2 pt-1.5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "line-clamp-1",
                      isBridgeContext ? "text-[16px] font-bold tracking-tight" : RIMVIO_TYPE.headline,
                    )}
                  >
                    {hero.title}
                  </p>
                  {!isBridgeContext || sheetPage === "context" ? (
                    <p className={cn("mt-0.5 line-clamp-1", RIMVIO_TYPE.caption)}>
                      {hero.place}
                    </p>
                  ) : null}
                  {cluster?.eventId ? (
                    <GlobeContextLineageChip
                      eventId={cluster.eventId}
                      className="mt-2"
                    />
                  ) : null}
                </div>
                <PinOpenMediaContextPageTabs
                  page={sheetPage}
                  onPageChange={setSheetPage}
                  variant={isBridgeContext ? "bridge" : "personal"}
                />
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={rimvioSheetCloseBtnClass("bg-muted/80")}
                  aria-label="닫기"
                >
                  <X className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </header>

              {bridgeCompanionStatus &&
              (bridgeCompanionStatus.tone === "syncing" ||
                bridgeCompanionStatus.tone === "uploading" ||
                bridgeCompanionStatus.tone === "pending") ? (
                <div className="shrink-0 px-4 pb-2 pt-1">
                  <BridgeCompanionStatusStrip
                    status={bridgeCompanionStatus}
                    participants={bridgeParticipants}
                    viewerUserId={user?.id}
                    compact
                  />
                </div>
              ) : null}

              <PinOpenMediaContextPager
                summary={contextDetailsSummary}
                page={sheetPage}
                onPageChange={setSheetPage}
                variant={isBridgeContext ? "bridge" : "personal"}
                className="min-h-0 flex-1"
                media={
                  isBridgeContext && filteredReelItems.length > 0 ? (
                    <ExperienceBridgeMediaShell
                      items={filteredReelItems}
                      title={hero.title}
                      place={hero.place}
                      eventId={cluster.eventId}
                      viewerUserId={user?.id}
                      deletable={bridgeMediaDeletable}
                      arrivalHint={mediaArrivalHint}
                      onDismissArrival={() => setMediaArrivalHint(null)}
                      onMediaDeleted={() => {
                        setRevision((value) => value + 1);
                        toast.success("삭제했어요");
                      }}
                    />
                  ) : reelItems.length > 0 ? (
                    <div className="flex h-full min-h-0 flex-col overflow-hidden">
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
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      {volume ? (
                        <div className="mt-4">
                          <SpatialMediaSyncPlayer
                            volume={volume}
                            classifiedPins={classifiedPins}
                            experienceOpen
                            initialItemId={openMomentItemId}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                }
              >
                {isBridgeContext && event && hero ? (
                  <BridgeContextPanel
                    event={event}
                    hero={hero}
                    allEvents={allEvents}
                    reelItems={reelItems}
                    volume={volume}
                    viewerUserId={user?.id}
                    participants={bridgeParticipants}
                    activeAuthorFilter={authorFilter}
                    onAuthorFilterChange={setAuthorFilter}
                    onShowFilteredMedia={() => setSheetPage("media")}
                    onOpenTalk={openExperienceRoom}
                    onOpenMediaPool={() => setMediaPoolOpen(true)}
                    onNoteSaved={() => setRevision((value) => value + 1)}
                    onHubUpdated={() => setRevision((value) => value + 1)}
                    conversation={conversation}
                    isBridgeHost={isBridgeHost}
                    journeyTimeline={bridge.timeline}
                    experienceWindow={journeyExperienceWindow}
                  />
                ) : (
                  <>
                    <div className="space-y-3">
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
                      <PinPulseContextStrip
                        honorific={rimvioHonorific}
                        context={pinPulseContextQuery.context}
                        loading={pinPulseContextQuery.loading}
                      />
                    </div>
                    {contextDetailsBody}
                  </>
                )}
              </PinOpenMediaContextPager>
            </div>

            {isBridgeContext && shareEvent && hero ? (
              <BridgePinSheetFooter
                event={shareEvent}
                eventId={cluster.eventId}
                eventTitle={hero.title}
                delivery={{
                  title: hero.title,
                  date: hero.date,
                  place: hero.place,
                }}
                talkOpening={talkOpening}
                showTalk={showTalkCta}
                onOpenTalk={openExperienceRoom}
                onOpenShareMore={() => {
                  dispatchGlobeContextShareRequest({
                    eventId: shareEvent.id,
                    pinId: cluster.pinId,
                  });
                }}
                onPhotoIngested={() => {
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
            ) : (
            <div className={rimvioSheetFooterClass()}>
              {shareEvent && hero && !isMarketplaceContext ? (
                <GlobeContextSendRail
                  event={shareEvent}
                  delivery={{
                    title: hero.title,
                    date: hero.date,
                    place: hero.place,
                  }}
                  onOpenMore={() => {
                    dispatchGlobeContextShareRequest({
                      eventId: shareEvent.id,
                      pinId: cluster.pinId,
                    });
                  }}
                />
              ) : null}
              {showTalkCta ? (
                <button
                  type="button"
                  onClick={openExperienceRoom}
                  disabled={talkOpening}
                  className={rimvioHeroCtaClass()}
                  data-pin-open-talk
                >
                  <MessageCircle className="size-5" aria-hidden />
                  {talkOpening
                    ? copy.globe.bridgeContextTalkOpening
                    : canOpenTalk
                      ? copy.globe.bridgeContextTalkCta
                      : copy.globe.bridgeContextTalkStartCta}
                </button>
              ) : null}
              {!isMarketplaceContext ? (
              <GlobeContextPhotoButton
                eventId={cluster.eventId}
                eventTitle={hero.title}
                variant={showTalkCta ? "secondary" : photoPrimary ? "primary" : "secondary"}
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
              ) : null}
              <button
                type="button"
                className={rimvioSecondaryCtaClass()}
                onClick={() => onOpenChange(false)}
                data-pin-open-close
              >
                닫기
              </button>
            </div>
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
                    : editKind === "note"
                      ? event?.metadata?.globeContextNote?.toString() ?? ""
                      : ""
              }
              onSave={async (next) => {
                if (!cluster?.eventId || !editKind) {
                  return;
                }
                try {
                  await patchExperiencePinContext(cluster.eventId, {
                    ...(editKind === "place" ? { place: next } : {}),
                    ...(editKind === "title" ? { title: next } : {}),
                    ...(editKind === "note" ? { note: next } : {}),
                  });
                  setRevision((value) => value + 1);
                  toast.success(
                    editKind === "place"
                      ? "장소를 고쳤어요"
                      : editKind === "title"
                        ? "제목을 고쳤어요"
                        : copy.globe.bridgeContextNoteSaved,
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

            <GlobeMediaPoolSheet
              open={mediaPoolOpen}
              onOpenChange={setMediaPoolOpen}
              activeContextTitle={hero.title}
              onAttachToActive={
                cluster?.eventId
                  ? async (contextIds) => {
                      const summary = await attachPoolMediaBatch({
                        contextIds,
                        eventId: cluster.eventId,
                        hintTitle: hero.title,
                      });
                      toast.success(summary.toastLine);
                      setRevision((value) => value + 1);
                      void syncBridgeSharedMediaFromRemote(
                        cluster.eventId,
                        user?.id,
                      ).then((merged) => {
                        if (merged) {
                          setRevision((value) => value + 1);
                        }
                      });
                    }
                  : undefined
              }
              onCreateContext={() => {
                setMediaPoolOpen(false);
              }}
            />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
