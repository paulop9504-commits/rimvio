"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUp,
  ImagePlus,
  Loader2,
  Mic,
  Plus,
  SendHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { GLOBE_CONTEXT_MEDIA_ACCEPT } from "@/lib/feed/ingest-globe-context-capture";
import { validateIngestMediaFiles } from "@/lib/globe/validate-ingest-media-files";
import { canQuickListMarketCompose } from "@/lib/globe/market/build-market-quick-list-draft";
import { dispatchContextRun } from "@/lib/context-run/dispatch-context-run";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { isPcPurchaseContinuityUtterance } from "@/lib/pc-local-agent/purchase-intent";
import { startPcPurchaseAgentRun } from "@/lib/pc-local-agent/run-purchase-agent";
import { isPcProgramInstallUtterance } from "@/lib/pc-local-agent/program-install-catalog";
import { appendContextAgentComposeTurn } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import {
  readAgentActivityTranscript,
  subscribeAgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { isAgentExecuteVerbUtterance } from "@/lib/context-run/is-agent-execute-verb";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";
import { offerIngressConvergeChipsClient } from "@/lib/globe-ingress/offer-ingress-converge-chips-client";
import { interpretMessyForGlobeComposer } from "@/lib/messy-prompt-interpreter/adapters/globe-composer-adapter";
import { readActiveRunState } from "@/lib/context-run/run-state-store";
import { ensureGlobeChatGraphId } from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import {
  syncPortalComposeProgramInstallToChat,
  syncPortalComposeTurnToChat,
} from "@/lib/globe/chat/sync-portal-compose-to-chat";
import { composeTripFlowChatAssistantLine } from "@/lib/globe/trip-situation-router/build-trip-flow-chat-lines";
import { ingestComposeChatPhoto } from "@/lib/globe/chat/globe-chat-session-bridge";
import type { ContextRunEffectHandlers } from "@/lib/context-run/ingress-types";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import {
  rimvioComposerFieldClass,
  rimvioIconBtnClass,
} from "@/lib/brand/rimvio-neon-theme";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { copy } from "@/lib/copy/human-ko";
import { resolveRimvioCommandPlaceholder } from "@/lib/rimvio-command";
import { cn } from "@/lib/utils";
import { GlobeContextTravelGpsChip } from "@/components/globe/globe-context-travel-gps-chip";
import { GlobeComposerHintStrip } from "@/components/globe/globe-composer-hint-strip";
import {
  GlobeOperatorChoiceChips,
  type OperatorChoiceChip,
} from "@/components/globe/globe-operator-choice-chips";
import { useAskSpeechRecognition } from "@/hooks/use-ask-speech-recognition";
import { useComposerHint } from "@/hooks/use-composer-hint";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import {
  softenComposerStatusLine,
  softenComposerSuccessLine,
} from "@/lib/globe/composer-hint-copy";

export type GlobeContextIngestBarHandle = {
  openPhotoPicker: () => void;
  submitComposerText: (value: string) => Promise<void>;
  focusComposer: () => void;
  /** 「기타」— empty composer with city-fill hint (Cursor blank). */
  promptCityFill: (hintKo: string) => void;
};

export type GlobeContextIngestBarProps = {
  className?: string;
  targetEventId?: string | null;
  targetTitle?: string | null;
  forceAttachToTarget?: boolean;
  onAttached?: (
    eventId: string,
    options?: { needsPlaceVerify?: boolean },
  ) => void;
  onPhotoDraftReady?: (files: File[]) => void | Promise<void>;
  onOpenPortal?: (input: {
    eventId?: string | null;
    composeText?: string;
  }) => void;
  onQuickListMarket?: (input: {
    composeText: string;
    eventId?: string | null;
  }) => Promise<boolean>;
  onLaunchMarketProjection?: (input: {
    draft: import("@/lib/globe/market/market-intent-types").MarketIntentDraft;
    eventId: string;
    composeText: string;
  }) => void;
  onMarketComposeFeedReady?: (input: {
    kind: "wizard" | "quick_list";
    draft?: import("@/lib/globe/market/market-intent-types").MarketIntentDraft;
    eventId: string;
    composeText: string;
  }) => void;
  onOpenMarketManage?: () => void;
  marketRoleBusy?: boolean;
  layerMode?: GlobeLayerMode;
  onDiscoveryMarketBrowse?: () => void;
  onComposeFocus?: () => void;
  onComposeBlur?: () => void;
  onComposeOpen?: () => void;
  userLat?: number | null;
  userLng?: number | null;
  onLodgingDiscovery?: (input: {
    eventId: string;
    summaryKo: string;
  }) => void;
  onEateryDiscovery?: (input: {
    eventId: string;
    summaryKo: string;
  }) => void;
  /** Map-native prompt — frosted dark bar over globe. */
  mapPromptMode?: boolean;
  /** Compact rounded-full pill (default on map prompt). */
  compactPill?: boolean;
  /** Chat-only placeholder override (compose flow next step). */
  chatPlaceholderOverride?: string | null;
  onWorkSurfaceClassified?: (
    classification: import("@/lib/work-queue/classify-globe-work-surface").GlobeWorkSurfaceClassification,
  ) => void;
  onWorkQueueChanged?: () => void;
  onKnowledgePlacementPending?: (
    pending: import("@/lib/globe/globe-knowledge-placement-pending").GlobeKnowledgePlacementPending,
  ) => void;
  onGlobeIngressCompiled?: (input: {
    compiled: import("@/lib/globe-ingress/types").GlobeIngressCompileResult;
    eventId: string;
  }) => void;
  /** Rare ambiguous converge — chips hosted on top hit. */
  onIngressConvergeAttachFocus?: (eventId: string) => void;
  /** Operator gate — block dispatch when phase forbids request (Blueprint stays off UI). */
  gateOperatorBeforeDispatch?: (
    message: string,
  ) => import("@/lib/container-ai/types").ContainerAIGateOutcome | null;
  /** Pure destination confirm — returns assistant chat line (headline + next step). */
  tryAdvanceDestinationFromMessage?: (message: string) => string | null;
  onOperatorDestinationChoice?: (choice: OperatorChoiceChip) => void;
  /** 2-tap trip router — idle → destination → domain chips above compose. */
  tripSituationRouter?: import("@/lib/globe/trip-situation-router").TripSituationRouterState | null;
  onTripSituationSelect?: (
    chip: import("@/lib/globe/trip-situation-router").TripSituationRouterChip,
  ) => void;
};

/** Globe home — one frosted composer; photo action lives inside the + menu. */
export const GlobeContextIngestBar = forwardRef<
  GlobeContextIngestBarHandle,
  GlobeContextIngestBarProps
>(function GlobeContextIngestBar(
  {
    className,
    targetEventId,
    targetTitle,
    forceAttachToTarget = false,
    onAttached,
    onPhotoDraftReady,
    onOpenPortal,
    onQuickListMarket,
    onLaunchMarketProjection,
    onMarketComposeFeedReady,
    onOpenMarketManage: _onOpenMarketManage,
    marketRoleBusy = false,
    layerMode = "personal",
    onDiscoveryMarketBrowse,
    onComposeFocus,
    onComposeBlur,
    onComposeOpen,
    userLat = null,
    userLng = null,
    onLodgingDiscovery,
    onEateryDiscovery,
    mapPromptMode = true,
    compactPill: compactPillProp,
    chatPlaceholderOverride,
    onWorkSurfaceClassified,
    onWorkQueueChanged,
    onKnowledgePlacementPending,
    onGlobeIngressCompiled,
    onIngressConvergeAttachFocus,
    gateOperatorBeforeDispatch,
    tryAdvanceDestinationFromMessage,
    onOperatorDestinationChoice,
    tripSituationRouter,
    onTripSituationSelect,
  },
  ref,
) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trailRunning, setTrailRunning] = useState(false);
  const [clarifyPlaceholder, setClarifyPlaceholder] = useState<string | null>(null);
  const [operatorChoices, setOperatorChoices] = useState<{
    reasonKo: string;
    choices: OperatorChoiceChip[];
  } | null>(null);
  const [offerTravelGps, setOfferTravelGps] = useState(false);
  const { hint: composerHint, showHint: showComposerHint, clearHint: clearComposerHint } =
    useComposerHint();
  const photoRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveLocation = useLiveLocationSnapshot();
  const isDiscovery = layerMode === "discovery";
  const isPill = compactPillProp ?? (mapPromptMode && !isDiscovery);
  const isChatPill = isPill && !mapPromptMode;
  const isLightPill = isPill && !isDiscovery;

  const finish = useCallback(
    (eventId: string, line: string, options?: { needsPlaceVerify?: boolean }) => {
      showComposerHint(softenComposerSuccessLine(line), {
        tone: "success",
        durationMs: 3000,
      });
      onAttached?.(eventId, options);
      setText("");
      setMenuOpen(false);
    },
    [onAttached, showComposerHint],
  );

  useEffect(() => {
    const sync = () => {
      setTrailRunning(Boolean(readAgentActivityTranscript()?.running));
    };
    sync();
    return subscribeAgentActivityTranscript(sync);
  }, []);

  const attachHintId = forceAttachToTarget ? targetEventId?.trim() || null : null;
  const routingContextEventId = targetEventId?.trim() || null;
  const attachHintTitle = forceAttachToTarget ? targetTitle?.trim() || null : null;
  const inputPlaceholder = clarifyPlaceholder ?? (isChatPill
    ? chatPlaceholderOverride ?? copy.globe.chatInputPlaceholder
    : isDiscovery
      ? copy.globe.ingestDiscoveryPlaceholder
      : mapPromptMode
        ? copy.globe.mapIntentPromptPlaceholder
          : attachHintTitle
          ? copy.globe.ingestAttachPlaceholder(attachHintTitle)
          : resolveRimvioCommandPlaceholder("globe"));
  const marketComposeBusy = busy || marketRoleBusy;
  const canSend = Boolean(text.trim() || offerTravelGps);

  const tryQuickListMarket = useCallback(
    async (composeText: string): Promise<boolean> => {
      if (!canQuickListMarketCompose(composeText) || !onQuickListMarket) {
        return false;
      }
      return onQuickListMarket({
        composeText: composeText.trim(),
        eventId: attachHintId,
      });
    },
    [attachHintId, onQuickListMarket],
  );

  const contextRunHandlers = useCallback(
    (): ContextRunEffectHandlers => ({
      openPortal: (input) => onOpenPortal?.(input),
      openFieldDiscovery: () => onDiscoveryMarketBrowse?.(),
      tryQuickListMarket,
      navigateUrl: (url, label) => {
        window.location.assign(url);
        showComposerHint(`${label} 여는 중…`, { durationMs: 2500 });
      },
      onLodgingDiscovery,
      onEateryDiscovery,
      onAttached,
      onTextIngested: ({ eventId, toastLine, needsPlaceVerify }) => {
        finish(eventId, toastLine, { needsPlaceVerify });
      },
      onExperienceRunClarify: (runResult) => {
        const question = softenComposerStatusLine(runResult.questionKo);
        showComposerHint(question, { durationMs: 0 });
        setClarifyPlaceholder(question);
        setOfferTravelGps(runResult.offerGps === true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      },
      onExperienceRunSummary: (runResult) => {
        if (runResult.summary.eventId) {
          onAttached?.(runResult.summary.eventId);
        }
        const line =
          runResult.summary.meaningLineKo?.trim() ||
          runResult.summary.bodyKo.trim() ||
          runResult.summary.titleKo;
        showComposerHint(softenComposerSuccessLine(line), {
          tone: "success",
          durationMs: 5000,
        });
      },
      onPortalComposeClarify: ({ questionKo }) => {
        const question = softenComposerStatusLine(questionKo);
        showComposerHint(question, { durationMs: 0 });
        setClarifyPlaceholder(question);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      },
      onLaunchMarketProjection: (input) => {
        onLaunchMarketProjection?.(input);
      },
      onMarketComposeFeedReady: (input) => {
        onMarketComposeFeedReady?.(input);
      },
      toastSuccess: (message) =>
        showComposerHint(softenComposerSuccessLine(message), {
          tone: "success",
          durationMs: 4000,
        }),
      toastMessage: (message) =>
        showComposerHint(softenComposerStatusLine(message), { durationMs: 5000 }),
      onWorkSurfaceClassified: (classification) => {
        showComposerHint(
          classification.surface === "outer"
            ? copy.globe.composerHint.workOuter
            : copy.globe.composerHint.workInner,
          { durationMs: 4000 },
        );
        onWorkSurfaceClassified?.(classification);
      },
      onWorkQueueChanged: () => {
        onWorkQueueChanged?.();
      },
      onKnowledgePlacementPending,
      onGlobeIngressCompiled: ({ compiled, eventId }) => {
        onGlobeIngressCompiled?.({ compiled, eventId });
        onAttached?.(eventId);
        const nextHint =
          compiled.blueprint.resourcePlan.nextQuestion?.promptKo?.trim() ||
          compiled.bridge.pathLabels.join(" → ");
        showComposerHint(softenComposerSuccessLine(nextHint), {
          tone: "success",
          durationMs: 4000,
        });
      },
      onIngressConvergeChips: (result) => {
        const ok = offerIngressConvergeChipsClient(result);
        const topId = result.hits[0]?.eventId?.trim();
        if (ok && topId) {
          onIngressConvergeAttachFocus?.(topId);
          onAttached?.(topId);
        }
        return ok;
      },
    }),
    [
      finish,
      onAttached,
      onDiscoveryMarketBrowse,
      onEateryDiscovery,
      onGlobeIngressCompiled,
      onIngressConvergeAttachFocus,
      onKnowledgePlacementPending,
      onLodgingDiscovery,
      onLaunchMarketProjection,
      onMarketComposeFeedReady,
      onOpenPortal,
      onWorkQueueChanged,
      onWorkSurfaceClassified,
      showComposerHint,
      tryQuickListMarket,
    ],
  );

  const ingestMedia = useCallback(
    async (fileList: FileList | null | undefined) => {
      if (!fileList?.length || busy) {
        return;
      }
      const files = Array.from(fileList);
      const validated = validateIngestMediaFiles(files);
      if (!validated.ok) {
        toast.error(validated.message);
        if (photoRef.current) {
          photoRef.current.value = "";
        }
        return;
      }
      if (validated.skippedCount > 0) {
        toast.message(copy.globe.photoIngestSkippedUnsupported(validated.skippedCount));
      }
      const mediaFiles = validated.files;
      const activeGraph = readActiveRunState()?.graphId;
      const composeSession = activeGraph
        ? readPortalComposeRunState(activeGraph)
        : null;
      if (composeSession?.composeSchemaId && composeSession.intentStage?.stage === "confirmed" && !isDiscovery) {
        setBusy(true);
        try {
          for (const file of mediaFiles) {
            await ingestComposeChatPhoto({ graphId: composeSession.graphId, file });
          }
          setMenuOpen(false);
        } finally {
          setBusy(false);
          if (photoRef.current) {
            photoRef.current.value = "";
          }
        }
        return;
      }

      setBusy(true);
      const toastId = toast.loading(
        mediaFiles.length === 1
          ? copy.globe.ingestUploadingOne
          : copy.globe.ingestUploadingMany(mediaFiles.length),
      );
      try {
        await dispatchContextRun(
          {
            kind: "photo",
            files: mediaFiles,
            surface: "composer",
            layerMode: isDiscovery ? "discovery" : "personal",
            mode: onPhotoDraftReady ? "walkthrough" : "direct",
            contextEventId: attachHintId,
            hintTitle: attachHintTitle,
            forceAttachToTarget: forceAttachToTarget && Boolean(attachHintId),
          },
          {
            ...contextRunHandlers(),
            onPhotoWalkthrough: async (walkFiles) => {
              setMenuOpen(false);
              if (photoRef.current) {
                photoRef.current.value = "";
              }
              toast.dismiss(toastId);
              await onPhotoDraftReady?.(walkFiles);
            },
            onPhotoIngestProgress: (done, total) => {
              if (total > 1) {
                toast.loading(copy.globe.ingestUploadProgress(done, total), {
                  id: toastId,
                });
              }
            },
            onPhotoFilePrepare: (line) => {
              toast.loading(line, { id: toastId });
            },
            onKnowledgePlacementPending,
            onPhotoIngested: (summary) => {
              if (summary.succeeded === 0) {
                toast.error(summary.toastLine, { id: toastId });
                return;
              }
              if (!summary.lastEventId && summary.poolStaged > 0) {
                toast.message(summary.toastLine, { id: toastId });
                return;
              }
              const suggestedPlace = summary.lastSuggestedPlaceName?.trim();
              if (suggestedPlace) {
                toast.success(copy.globe.inboxPhotoPlaceSuggestToast(suggestedPlace), {
                  id: toastId,
                });
              } else {
                toast.success(summary.toastLine, { id: toastId });
              }
              if (summary.lastEventId) {
                onAttached?.(summary.lastEventId);
              }
              setText("");
              setMenuOpen(false);
            },
            toastMessage: (message) => toast.message(message, { id: toastId }),
          },
        );
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : copy.globe.ingestAttachFail;
        toast.error(message, { id: toastId });
      } finally {
        setBusy(false);
        if (photoRef.current) {
          photoRef.current.value = "";
        }
      }
    },
    [
      attachHintId,
      attachHintTitle,
      busy,
      contextRunHandlers,
      forceAttachToTarget,
      isDiscovery,
      onAttached,
      onKnowledgePlacementPending,
      onPhotoDraftReady,
    ],
  );

  const submitGpsOrigin = useCallback(async () => {
    if (busy) {
      return;
    }
    const lat = liveLocation?.lat ?? userLat;
    const lng = liveLocation?.lng ?? userLng;
    setBusy(true);
    onComposeOpen?.();
    try {
      const result = await dispatchContextRun(
        {
          kind: "text",
          text: copy.globe.travelContext.gpsOriginLabel,
          surface: "composer",
          layerMode: isDiscovery ? "discovery" : "personal",
          contextEventId: attachHintId,
          lat,
          lng,
        },
        contextRunHandlers(),
      );

      if (result.status === "error") {
        showComposerHint(result.errorMessage ?? copy.globe.ingestAttachFail, {
          tone: "error",
          durationMs: 5000,
        });
        return;
      }

      if (result.status === "done") {
        if (result.experienceRun?.kind === "summary") {
          setOfferTravelGps(false);
          setClarifyPlaceholder(null);
        }
        setText("");
        setMenuOpen(false);
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : copy.globe.ingestAttachFail;
      showComposerHint(message, { tone: "error", durationMs: 5000 });
    } finally {
      setBusy(false);
    }
  }, [
    attachHintId,
    busy,
    contextRunHandlers,
    isDiscovery,
    liveLocation?.lat,
    liveLocation?.lng,
    onComposeOpen,
    showComposerHint,
    userLat,
    userLng,
  ]);

  const submitText = useCallback(
    async (event?: FormEvent, overrideValue?: string) => {
      event?.preventDefault();
      if (busy) {
        return;
      }
      const value = (overrideValue ?? text).trim();
      if (!value) {
        if (offerTravelGps) {
          await submitGpsOrigin();
        }
        return;
      }

      clearComposerHint();
      setBusy(true);
      onComposeOpen?.();
      try {
        if (isPcPurchaseContinuityUtterance(value)) {
          const eventId = routingContextEventId ?? attachHintId;
          const result = await startPcPurchaseAgentRun({
            utterance: value,
            contextEventId: eventId,
          });
          if (result.kind !== "skip") {
            if (eventId) {
              appendContextAgentComposeTurn(eventId, { role: "user", text: value });
              if (result.kind === "preview") {
                onAttached?.(eventId);
              } else {
                appendContextAgentComposeTurn(eventId, {
                  role: "assistant",
                  kind: "text",
                  text: result.messageKo,
                });
              }
            }
            showComposerHint(result.messageKo, {
              tone: result.kind === "login" ? "error" : "success",
              durationMs: 5000,
            });
            setClarifyPlaceholder(null);
            setOperatorChoices(null);
            setText("");
            setMenuOpen(false);
            return;
          }
        }

        if (isPcProgramInstallUtterance(value)) {
          const line = `${copy.globe.pcContinuity.programOfferTitle}\n${copy.globe.pcContinuity.programOfferBody}`;
          syncPortalComposeProgramInstallToChat({
            graphId: ensureGlobeChatGraphId(),
            userText: value,
            assistantText: line,
            query: value,
          });
          showComposerHint(line, { tone: "success", durationMs: 5000 });
          const eventId = routingContextEventId ?? attachHintId;
          if (eventId) {
            appendContextAgentComposeTurn(eventId, { role: "user", text: value });
            appendContextAgentComposeTurn(eventId, {
              role: "assistant",
              kind: "text",
              text: line,
            });
          }
          setClarifyPlaceholder(null);
          setOperatorChoices(null);
          setText("");
          setMenuOpen(false);
          return;
        }

        const advancedAssistantText = tryAdvanceDestinationFromMessage?.(value);
        if (advancedAssistantText) {
          const graphId = ensureGlobeChatGraphId();
          syncPortalComposeTurnToChat({
            graphId,
            userText: value,
            assistantText: advancedAssistantText,
          });
          showComposerHint(softenComposerSuccessLine(advancedAssistantText), {
            tone: "success",
            durationMs: 5000,
          });
          setOperatorChoices(null);
          setClarifyPlaceholder(null);
          setText("");
          setMenuOpen(false);
          return;
        }

        const operatorGate = gateOperatorBeforeDispatch?.(value);
        // Execute / new-trip never stuck behind Operator destination chips.
        if (
          operatorGate &&
          !operatorGate.allowed &&
          !isAgentExecuteVerbUtterance(value) &&
          !isNewTripGlobeIngressUtterance(value) &&
          !isWorkspaceAgentWorkUtterance(value)
        ) {
          const question = softenComposerStatusLine(operatorGate.reasonKo);
          showComposerHint(question, { durationMs: 0 });
          setClarifyPlaceholder(question);
          setOperatorChoices({
            reasonKo: operatorGate.reasonKo,
            choices: operatorGate.destinationChoices.length
              ? [...operatorGate.destinationChoices]
              : [...operatorGate.quickActions],
          });
          window.setTimeout(() => inputRef.current?.focus(), 0);
          return;
        }
        setOperatorChoices(null);

        const interpreted = await interpretMessyForGlobeComposer({
          messyInput: value,
          contextEventId: routingContextEventId,
          lat: userLat ?? liveLocation?.lat ?? null,
          lng: userLng ?? liveLocation?.lng ?? null,
          onUnderstanding: (line) => {
            showComposerHint(line, { tone: "neutral", durationMs: 0 });
          },
        });
        if (interpreted.understandingKo) {
          showComposerHint(interpreted.understandingKo, {
            tone: "neutral",
            durationMs: 4500,
          });
        }

        // New trip announce → Globe Ingress Continuum (not Agent essay / clarify).
        if (isNewTripGlobeIngressUtterance(interpreted.dispatchText)) {
          const result = await dispatchContextRun(
            {
              kind: "text",
              text: interpreted.dispatchText,
              surface: "composer",
              layerMode: isDiscovery ? "discovery" : "personal",
              contextEventId: routingContextEventId,
              lat: userLat ?? liveLocation?.lat ?? null,
              lng: userLng ?? liveLocation?.lng ?? null,
            },
            contextRunHandlers(),
          );
          if (result.status === "done" || result.status === "noop") {
            if (result.status === "done") {
              setClarifyPlaceholder(null);
              setOperatorChoices(null);
              setText("");
              setMenuOpen(false);
            }
            if (result.status === "done") {
              return;
            }
          }
          if (result.status === "error") {
            showComposerHint(result.errorMessage ?? copy.globe.ingestAttachFail, {
              tone: "error",
              durationMs: 5000,
            });
            return;
          }
        }

        // Cursor Agent Loop — execute verbs + Workspace work (Trail + soft 펼치기).
        if (isWorkspaceAgentWorkUtterance(interpreted.dispatchText)) {
          clearComposerHint();
          const agent = await applyGlobeWorkspaceAgentTurn({
            utterance: interpreted.dispatchText,
            explicitContextEventId: routingContextEventId ?? attachHintId,
            lat: userLat ?? liveLocation?.lat ?? null,
            lng: userLng ?? liveLocation?.lng ?? null,
          });
          if (agent.handled) {
            const graphId = ensureGlobeChatGraphId();
            const line =
              agent.statusKo?.trim() ||
              copy.globe.activityTrail.done;
            syncPortalComposeTurnToChat({
              graphId,
              userText: value,
              assistantText: line,
            });
            if (agent.contextEventId) {
              onAttached?.(agent.contextEventId);
            }
            // Brief success only — live progress lived in Activity Trail.
            showComposerHint(line, {
              tone: "success",
              durationMs: 2800,
            });
            setClarifyPlaceholder(null);
            setOperatorChoices(null);
            setText("");
            setMenuOpen(false);
            return;
          }
        }

        const result = await dispatchContextRun(
          {
            kind: "text",
            text: interpreted.dispatchText,
            surface: "composer",
            layerMode: isDiscovery ? "discovery" : "personal",
            contextEventId: routingContextEventId,
            lat: userLat ?? liveLocation?.lat ?? null,
            lng: userLng ?? liveLocation?.lng ?? null,
          },
          contextRunHandlers(),
        );

        if (result.status === "error") {
          showComposerHint(result.errorMessage ?? copy.globe.ingestAttachFail, {
            tone: "error",
            durationMs: 5000,
          });
          return;
        }

        if (result.status === "done" && result.planKind !== "discovery_hint") {
          {
            const activeGraph = readActiveRunState()?.graphId;
            const pending = activeGraph
              ? readPortalComposeRunState(activeGraph)
              : null;
            if (
              pending?.status !== "waiting_slot" &&
              pending?.status !== "drafting" &&
              pending?.status !== "conversing"
            ) {
              setClarifyPlaceholder(null);
            }
          }
          if (result.experienceRun?.kind === "summary") {
            setOfferTravelGps(false);
            setClarifyPlaceholder(null);
          }
          setText("");
          setMenuOpen(false);
        }
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : copy.globe.ingestAttachFail;
        showComposerHint(message, { tone: "error", durationMs: 5000 });
      } finally {
        setBusy(false);
      }
    },
    [
      attachHintId,
      routingContextEventId,
      onAttached,
      busy,
      clearComposerHint,
      contextRunHandlers,
      gateOperatorBeforeDispatch,
      isDiscovery,
      liveLocation?.lat,
      liveLocation?.lng,
      offerTravelGps,
      onComposeOpen,
      showComposerHint,
      submitGpsOrigin,
      text,
      tryAdvanceDestinationFromMessage,
      userLat,
      userLng,
    ],
  );

  const handleOperatorChoice = useCallback(
    (choice: OperatorChoiceChip) => {
      setOperatorChoices(null);
      setClarifyPlaceholder(null);
      clearComposerHint();
      onOperatorDestinationChoice?.(choice);
    },
    [clearComposerHint, onOperatorDestinationChoice],
  );

  const handleTripSituationSelect = useCallback(
    (choice: OperatorChoiceChip) => {
      const chip = tripSituationRouter?.choices.find((row) => row.id === choice.id);
      if (!chip) {
        return;
      }
      clearComposerHint();
      onTripSituationSelect?.(chip);
    },
    [clearComposerHint, onTripSituationSelect, tripSituationRouter?.choices],
  );

  const situationRouterVisible =
    Boolean(tripSituationRouter?.choices.length) && !operatorChoices && !busy;

  const submitTextRef = useRef(submitText);
  submitTextRef.current = submitText;

  const { listening: voiceListening, phase: voicePhase, start: toggleVoice, supported: voiceSupported } =
    useAskSpeechRecognition({
      onInterimTranscript: (transcript) => {
        setText(transcript);
      },
      onPauseHint: () => {
        showComposerHint(copy.globe.composerHint.voiceContinue, { durationMs: 4000 });
      },
      onFinalTranscript: (transcript) => {
        const trimmed = transcript.trim();
        if (!trimmed) {
          return;
        }
        setText(trimmed);
        void submitTextRef.current(undefined, trimmed);
      },
      onError: (code) => {
        if (code === "unsupported") {
          showComposerHint(copy.globe.composerHint.voiceUnsupported, {
            tone: "error",
            durationMs: 4000,
          });
          return;
        }
        showComposerHint(copy.globe.composerHint.voiceFailed, {
          tone: "error",
          durationMs: 4000,
        });
      },
    });

  useImperativeHandle(
    ref,
    () => ({
      openPhotoPicker: () => {
        setMenuOpen(true);
        window.setTimeout(() => photoRef.current?.click(), 0);
      },
      submitComposerText: (value: string) => submitText(undefined, value),
      focusComposer: () => {
        window.setTimeout(() => inputRef.current?.focus(), 0);
      },
      promptCityFill: (hintKo: string) => {
        const hint = hintKo.trim() || copy.globe.tripSituationRouter.destinationOtherAsk;
        setText("");
        setClarifyPlaceholder(hint);
        showComposerHint(hint, { durationMs: 0 });
        window.setTimeout(() => inputRef.current?.focus(), 0);
      },
    }),
    [showComposerHint, submitText],
  );

  return (
    <div
      className={cn("w-full", isPill && "relative", className)}
      data-globe-map-intent-prompt={
        mapPromptMode && !isDiscovery && !isLightPill ? true : undefined
      }
      data-globe-prompt-tone={isLightPill ? "light" : undefined}
      data-globe-ingest-compact={isPill ? "pill" : undefined}
    >
      <GlobeComposerHintStrip
        text={
          trailRunning && composerHint?.tone !== "error"
            ? null
            : (composerHint?.text ?? null)
        }
        tone={composerHint?.tone}
        mapDark={mapPromptMode && !isDiscovery && !isLightPill}
        lightPill={isLightPill}
        className={isPill ? "mb-1" : "mb-1.5"}
      />
      {situationRouterVisible && tripSituationRouter ? (
        <GlobeOperatorChoiceChips
          reasonKo={tripSituationRouter.reasonKo}
          choices={tripSituationRouter.choices.map((row) => ({
            id: row.id,
            label: row.label,
          }))}
          onSelect={handleTripSituationSelect}
          mapDark={mapPromptMode && !isDiscovery && !isLightPill}
          lightPill={isLightPill}
          className={isPill ? "mb-1" : "mb-1.5"}
        />
      ) : operatorChoices ? (
        <GlobeOperatorChoiceChips
          reasonKo={operatorChoices.reasonKo}
          choices={operatorChoices.choices}
          onSelect={handleOperatorChoice}
          mapDark={mapPromptMode && !isDiscovery && !isLightPill}
          lightPill={isLightPill}
          className={isPill ? "mb-1" : "mb-1.5"}
        />
      ) : null}
      <div
        className={cn(
          isLightPill || isPill
            ? "relative rounded-full"
            : "overflow-hidden rounded-[1.35rem] backdrop-blur-xl",
          isLightPill
            ? "rimvio-globe-prompt-pill--light rimvio-globe-prompt--gpt"
            : mapPromptMode && !isDiscovery
              ? "bg-[#121316]/88 shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/14 backdrop-blur-xl"
              : "bg-white/92 shadow-[0_8px_32px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.06] backdrop-blur-xl",
        )}
        data-globe-prompt-style={isLightPill ? "white-pill" : undefined}
      >
        {menuOpen && !isDiscovery ? (
          isPill ? (
            <div
              className={cn(
                "absolute bottom-full left-0 right-0 z-10 mb-2 overflow-hidden rounded-2xl backdrop-blur-xl",
                isLightPill
                  ? "bg-white shadow-[0_12px_36px_rgba(2,32,71,0.14)] ring-1 ring-black/[0.06]"
                  : "bg-[#121316]/96 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/14",
              )}
              data-globe-ingest-photo-popover
            >
              <button
                type="button"
                disabled={marketComposeBusy}
                onClick={() => photoRef.current?.click()}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                  isLightPill ? "active:bg-black/[0.04]" : "active:bg-white/6",
                )}
                data-globe-ingest-photo-action
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <ImagePlus className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[13px] font-semibold",
                      isLightPill ? "text-[#191f28]" : "text-white/92",
                    )}
                  >
                    {copy.globe.ingestPhotoActionTitle}
                  </span>
                </span>
              </button>
            </div>
          ) : (
          <button
            type="button"
            disabled={marketComposeBusy}
            onClick={() => photoRef.current?.click()}
            className="flex w-full items-center gap-3 border-b border-black/[0.05] px-3.5 py-3 text-left transition-colors active:bg-black/[0.03]"
            data-globe-ingest-photo-action
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ImagePlus className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-foreground">
                {copy.globe.ingestPhotoActionTitle}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                {copy.globe.ingestPhotoActionHint}
              </span>
            </span>
          </button>
          )
        ) : null}

        {offerTravelGps && !isDiscovery ? (
          <div className={cn(isPill ? "px-2 pb-1" : "px-2 pb-1.5")}>
            <GlobeContextTravelGpsChip
              busy={marketComposeBusy}
              tone={isLightPill ? "light" : "dark"}
              onApplyGps={() => void submitGpsOrigin()}
            />
          </div>
        ) : null}

        <form
          onSubmit={(event) => void submitText(event)}
          className={cn(
            "group flex items-center",
            isLightPill
              ? "min-h-[52px] gap-1 px-2 py-1.5"
              : isPill
                ? "gap-1.5 px-2 py-1.5"
                : "gap-2 px-2 py-2",
          )}
        >
          {!isDiscovery ? (
          <button
            type="button"
            disabled={marketComposeBusy}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              rimvioIconBtnClass(menuOpen ? "primary" : "ghost"),
              isLightPill
                ? "size-10 shrink-0 rounded-full text-[#3d3d3d] hover:bg-black/[0.04] hover:text-[#0d0d0d]"
                : isPill
                  ? "size-8 shrink-0 rounded-full"
                  : "size-10 shrink-0 rounded-xl",
              isLightPill && menuOpen && "bg-black/[0.06] text-[#0d0d0d]",
            )}
            aria-label={menuOpen ? copy.globe.ingestMenuCloseAria : copy.globe.ingestMenuOpenAria}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className={isLightPill || isPill ? "size-[18px]" : "size-5"} strokeWidth={isLightPill ? 1.75 : 2} aria-hidden />
            ) : (
              <Plus
                className={isLightPill ? "size-5" : isPill ? "size-[18px]" : "size-5"}
                strokeWidth={isLightPill ? 1.75 : 2}
                aria-hidden
              />
            )}
          </button>
          ) : null}

          {isPill ? (
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onFocus={onComposeFocus}
              onBlur={onComposeBlur}
              placeholder={inputPlaceholder}
              disabled={marketComposeBusy}
              className={cn(
                "min-w-0 flex-1 bg-transparent outline-none",
                isLightPill
                  ? "px-1 py-2 text-[16px] leading-snug tracking-[-0.01em] text-[#0d0d0d] placeholder:text-[#8e8e8e]"
                  : mapPromptMode && !isDiscovery
                    ? "px-1 text-[14px] text-white placeholder:text-white/42"
                    : "px-1 text-[14px] text-[#191f28] placeholder:text-[#8b95a1]",
              )}
              data-globe-map-intent-prompt-input
            />
          ) : (
          <div
            className={cn(
              rimvioComposerFieldClass,
              "min-w-0 flex-1 px-3 py-2.5",
              mapPromptMode && !isDiscovery && "rimvio-composer-field--map-prompt",
            )}
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onFocus={onComposeFocus}
              onBlur={onComposeBlur}
              placeholder={inputPlaceholder}
              disabled={marketComposeBusy}
              className={cn(
                "w-full bg-transparent text-[15px] outline-none",
                mapPromptMode && !isDiscovery
                  ? "text-white placeholder:text-white/45"
                  : "text-[#191f28] placeholder:text-[#8b95a1]",
              )}
              data-globe-map-intent-prompt-input
            />
          </div>
          )}

          {!isDiscovery ? (
            <button
              type="button"
              disabled={marketComposeBusy || !voiceSupported}
              onClick={() => {
                if (!voiceSupported) {
                  showComposerHint(copy.globe.composerHint.voiceUnsupported, {
                    tone: "error",
                    durationMs: 4000,
                  });
                  return;
                }
                toggleVoice();
              }}
              className={cn(
                rimvioIconBtnClass(voiceListening ? "primary" : "ghost"),
                isLightPill
                  ? "size-10 shrink-0 rounded-full text-[#3d3d3d] hover:bg-black/[0.04] hover:text-[#0d0d0d]"
                  : isPill
                    ? "size-8 shrink-0 rounded-full"
                    : "size-10 shrink-0 rounded-xl",
                isLightPill && voiceListening && "bg-black/[0.06] text-[#0d0d0d]",
                !isLightPill &&
                  !voiceListening &&
                  "transition lg:pointer-events-none lg:opacity-0 group-hover:lg:pointer-events-auto group-hover:lg:opacity-100 group-focus-within:lg:pointer-events-auto group-focus-within:lg:opacity-100",
                !voiceSupported && "opacity-40",
              )}
              aria-label={
                voiceListening
                  ? voicePhase === "pause_hint"
                    ? copy.globe.composerHint.voiceContinue
                    : copy.globe.askSheet.voiceListening
                  : copy.globe.askSheet.voiceAria
              }
              aria-pressed={voiceListening}
              data-globe-ingest-voice-trigger
            >
              <Mic
                className={isLightPill ? "size-[18px]" : isPill ? "size-4" : "size-5"}
                strokeWidth={isLightPill ? 1.75 : 2}
                aria-hidden
              />
            </button>
          ) : null}

          <button
            type="submit"
            disabled={busy || !canSend}
            className={cn(
              isLightPill
                ? "rimvio-globe-prompt-pill-send inline-flex size-10 shrink-0 items-center justify-center rounded-full p-0 transition-colors"
                : rimvioIconBtnClass("primary"),
              isLightPill &&
                (canSend && !busy
                  ? "bg-[#8ec5f8] text-white hover:bg-[#7bb8ef]"
                  : "bg-[#ebebeb] text-[#9a9a9a]"),
              !isLightPill && isPill && "size-8 shrink-0 rounded-full",
              !isLightPill && !isPill && "size-10 shrink-0 rounded-xl",
              !isLightPill && "disabled:opacity-35",
              !isLightPill && isPill && "disabled:opacity-35",
            )}
            data-send-ready={isLightPill ? (canSend ? "true" : "false") : undefined}
            aria-label={copy.globe.ingestSendAria}
          >
            {busy ? (
              <Loader2
                className={isLightPill || isPill ? "size-4 animate-spin" : "size-5 animate-spin"}
                aria-hidden
              />
            ) : isLightPill ? (
              <ArrowUp
                className="pointer-events-none block size-[18px] translate-y-px"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : (
              <SendHorizontal className={isPill ? "size-4" : "size-5"} aria-hidden />
            )}
          </button>
        </form>
      </div>

      <input
        ref={photoRef}
        type="file"
        accept={GLOBE_CONTEXT_MEDIA_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void ingestMedia(event.target.files)}
      />
    </div>
  );
});
