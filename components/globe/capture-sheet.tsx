"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Camera, Link2, Mic, Plus, StickyNote, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExperienceRunSummaryCard } from "@/components/globe/experience-run-summary-card";
import {
  GlobeActionPillGuide,
  readPillSubmitText,
} from "@/components/globe/globe-action-pill-guide";
import { ExternalContextAskReply } from "@/components/globe/external-context-ask-reply";
import { CaptureSheetMemoryTriggerStage } from "@/components/globe/capture-sheet-memory-trigger-stage";
import { GlobeContextAiOrb } from "@/components/globe/globe-context-ai-orb";
import { PersonalContextAskReply } from "@/components/globe/personal-context-ask-reply";
import { GlobeComposerHintStrip } from "@/components/globe/globe-composer-hint-strip";
import { useAskSpeechRecognition } from "@/hooks/use-ask-speech-recognition";
import { useComposerHint } from "@/hooks/use-composer-hint";
import { useGlobeContextTriggers } from "@/hooks/use-globe-context-triggers";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import type { ExternalContextOpportunityHit } from "@/lib/external-context-ask";
import { isGlobeHomePath, requestGlobePhotoIngest } from "@/lib/globe/globe-photo-ingest-bridge";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { resolveContextTriggerOpenOptions } from "@/lib/globe/context-triggers/resolve-context-trigger-open-options";
import type { ExperienceRunSummary } from "@/lib/experience-run/experience-run-types";
import { clearPendingSituationLock } from "@/lib/experience-run/situation-lock";
import type {
  PersonalContextAskRecallContext,
  PersonalContextBridgeHit,
  PersonalContextResponseFocus,
} from "@/lib/personal-context-ask";
import { ingestScreenshot } from "@/lib/share/ingest-screenshot";
import { dispatchGlobeMarketProjectionLaunch } from "@/lib/portal/globe-market-projection-bridge";
import { requestGlobeMarketQuickList } from "@/lib/portal/globe-market-quick-list-bridge";
import { canQuickListMarketCompose } from "@/lib/globe/market/build-market-quick-list-draft";
import { GlobeTypewriterText } from "@/components/globe/globe-typewriter-text";
import {
  rimvioAssistantAiBubbleMutedClass,
  rimvioAssistantHeroHintClass,
  rimvioAssistantHeroTitleClass,
  rimvioAssistantSheetGlowClass,
  rimvioAssistantSheetShellClass,
  rimvioAssistantUserBubbleClass,
} from "@/lib/design/globe-assistant-surface";
import { dispatchContextRun } from "@/lib/context-run/dispatch-context-run";
import { interpretMessyForPersonalAsk } from "@/lib/messy-prompt-interpreter/adapters/personal-ask-adapter";
import { consumeCaptureSheetSeedText } from "@/lib/nav/open-capture-sheet-bridge";
import { cn } from "@/lib/utils";

export type CaptureSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AskMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  narrative?: string;
  hits?: readonly PersonalContextBridgeHit[];
  externalHits?: readonly ExternalContextOpportunityHit[];
  recommendedHitId?: string | null;
  featuredHitId?: string | null;
  totalPhotoCount?: number;
  responseFocus?: PersonalContextResponseFocus;
  recallContext?: PersonalContextAskRecallContext | null;
  experienceRunSummary?: ExperienceRunSummary;
  loading?: boolean;
  scope?: "personal" | "discovery";
};

type AttachMode = "closed" | "menu" | "link" | "memo";

/** ➕ tab — Gemini-clean ask surface; capture via composer +. */
export function CaptureSheet({ open, onOpenChange }: CaptureSheetProps) {
  const copy = useCopy();
  const ask = copy.globe.askSheet;
  const locale = useAppLocale();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const onGlobeHome = isGlobeHomePath(pathname);
  /** ADR-027 — Capture is always personal Context; no discovery planet toggle. */
  const layerMode = "personal" as const;
  const isPersonal = true;
  const recallTriggers = useGlobeContextTriggers({
    enabled: open,
    layerMode,
  });
  const liveLocation = useLiveLocationSnapshot();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [linkDraft, setLinkDraft] = useState("");
  const [memoDraft, setMemoDraft] = useState("");
  const [attachMode, setAttachMode] = useState<AttachMode>("closed");
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { hint: composerHint, showHint: showComposerHint } = useComposerHint();

  const { listening: voiceListening, phase: voicePhase, start: toggleVoiceInput, supported: voiceSupported } =
    useAskSpeechRecognition({
      locale,
      enabled: open && !busy,
      onInterimTranscript: (transcript) => {
        setDraft(transcript);
      },
      onPauseHint: () => {
        showComposerHint(copy.globe.composerHint.voiceContinue, { durationMs: 4000 });
      },
      onFinalTranscript: (transcript) => {
        setDraft(transcript.trim());
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setAttachMode("closed");
      setDraft("");
      setLinkDraft("");
      setMemoDraft("");
      setBusy(false);
      clearPendingSituationLock();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const captureRunStubs = useCallback(
    () => ({
      openPortal: async () => {},
      openFieldDiscovery: () => {},
      tryQuickListMarket: async () => false,
      navigateUrl: (url: string, label: string) => {
        window.location.assign(url);
        toast.success(`${label} 여는 중…`);
      },
    }),
    [],
  );

  const ingestShare = useCallback(
    async (text: string, shareKind: "url" | "memo") => {
      if (!text.trim() || busy) {
        return;
      }
      setBusy(true);
      try {
        await dispatchContextRun(
          {
            kind: "share",
            text: text.trim(),
            shareKind,
            surface: "capture_sheet",
            layerMode: isPersonal ? "personal" : "discovery",
          },
          {
            ...captureRunStubs(),
            onShareIngested: () => {
              if (shareKind === "url") {
                setLinkDraft("");
              } else {
                setMemoDraft("");
              }
              setAttachMode("closed");
            },
          },
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, captureRunStubs, isPersonal],
  );

  const onRecallTriggerPress = useCallback(
    (trigger: GlobeContextTrigger) => {
      const eventId = trigger.eventId?.trim();
      if (!eventId) {
        return;
      }
      close();
      if (!onGlobeHome) {
        router.push("/");
      }
      const openOptions = resolveContextTriggerOpenOptions(trigger);
      if (openOptions.mapTap) {
        requestGlobeAskBridgeFocus(eventId, "map");
        return;
      }
      if (openOptions.sheetPage === "media") {
        requestGlobeAskBridgeFocus(eventId, "photos");
        return;
      }
      requestGlobeAskBridgeFocus(eventId, "bridge");
    },
    [close, onGlobeHome, router],
  );

  const onPhotoSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || busy) {
        return;
      }
      if (isPersonal || onGlobeHome) {
        setBusy(true);
        try {
          await dispatchContextRun(
            {
              kind: "photo",
              files,
              surface: "capture_sheet",
              layerMode: isPersonal ? "personal" : "discovery",
              mode: "walkthrough",
            },
            {
              ...captureRunStubs(),
              onPhotoWalkthrough: async (walkFiles) => {
                setAttachMode("closed");
                if (isPersonal && !onGlobeHome) {
                  close();
                  router.push("/");
                }
                requestGlobePhotoIngest(walkFiles);
              },
              toastMessage: (message) => toast.message(message),
            },
          );
        } finally {
          setBusy(false);
        }
        return;
      }
      setBusy(true);
      try {
        await ingestScreenshot(files[0]!);
        setAttachMode("closed");
      } catch (caught) {
        const message =
          caught instanceof Error && caught.message.trim()
            ? caught.message.trim()
            : copy.globe.ingestAttachFail;
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, captureRunStubs, close, isPersonal, onGlobeHome, router],
  );

  const saveLink = useCallback(async () => {
    await ingestShare(linkDraft, "url");
  }, [ingestShare, linkDraft]);

  const saveMemo = useCallback(async () => {
    await ingestShare(memoDraft, "memo");
  }, [ingestShare, memoDraft]);

  const runAskTurn = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text || busy) {
      return;
    }
    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;
    const scope: AskMessage["scope"] = isPersonal ? "personal" : "discovery";

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text },
      {
        id: assistantId,
        role: "assistant" as const,
        text: scope === "discovery" ? ask.externalLoading : ask.replySoon,
        loading: true,
        scope,
      },
    ]);
    setDraft("");
    setAttachMode("closed");
    setBusy(true);

    void (async () => {
      try {
        const interpreted = await interpretMessyForPersonalAsk({
          messyInput: text,
          scope,
          lat: liveLocation?.lat ?? null,
          lng: liveLocation?.lng ?? null,
          onUnderstanding: (line) => {
            showComposerHint(line, { tone: "neutral", durationMs: 0 });
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      text: line,
                      loading: false,
                    }
                  : message,
              ),
            );
          },
        });

        await dispatchContextRun(
          {
            kind: "text",
            text: interpreted.refinedMessage,
            surface: "capture_sheet",
            layerMode: scope,
            lat: liveLocation?.lat ?? null,
            lng: liveLocation?.lng ?? null,
          },
          {
            openPortal: async () => {},
            openFieldDiscovery: () => {},
            tryQuickListMarket: async (composeText) => {
              if (!onGlobeHome || !canQuickListMarketCompose(composeText)) {
                return false;
              }
              const listed = await requestGlobeMarketQuickList({ composeText });
              if (listed) {
                setMessages((prev) => [
                  ...prev.filter((m) => m.id !== assistantId || m.role === "user"),
                  {
                    id: assistantId,
                    role: "assistant",
                    text: copy.globe.executionFeed.marketQuickListSummary(
                      composeText.trim().slice(0, 24),
                    ),
                    scope,
                  },
                ]);
                window.setTimeout(() => close(), 480);
              }
              return listed;
            },
            navigateUrl: (url, label) => {
              window.location.assign(url);
              toast.success(`${label} 여는 중…`);
            },
            onExperienceRunClarify: (runResult) => {
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== assistantId || m.role === "user"),
                {
                  id: assistantId,
                  role: "assistant",
                  text: runResult.questionKo,
                  scope,
                },
              ]);
            },
            onExperienceRunSummary: (runResult) => {
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== assistantId || m.role === "user"),
                {
                  id: assistantId,
                  role: "assistant",
                  text: runResult.summary.bodyKo,
                  experienceRunSummary: runResult.summary,
                  scope,
                },
              ]);
              if (runResult.closeSheet) {
                if (onGlobeHome) {
                  close();
                } else {
                  window.setTimeout(() => close(), 480);
                }
              }
            },
            onPortalComposeClarify: ({ questionKo }) => {
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== assistantId || m.role === "user"),
                {
                  id: assistantId,
                  role: "assistant",
                  text: questionKo,
                  scope,
                },
              ]);
            },
            onLaunchMarketProjection: (input) => {
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== assistantId || m.role === "user"),
                {
                  id: assistantId,
                  role: "assistant",
                  text: copy.portal.composeRunWizardChecklist,
                  scope,
                },
              ]);
              if (onGlobeHome) {
                dispatchGlobeMarketProjectionLaunch(input);
                window.setTimeout(() => close(), 320);
                return;
              }
              toast.message(copy.portal.composeRunWizardChecklist);
            },
            onPersonalContextAsk: (result) => {
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== assistantId || m.role === "user"),
                {
                  id: assistantId,
                  role: "assistant",
                  text: result.summaryKo,
                  narrative: result.narrativeKo || result.summaryKo,
                  hits: result.hits.length > 0 ? result.hits : undefined,
                  featuredHitId: result.featuredHitId,
                  totalPhotoCount: result.totalPhotoCount,
                  responseFocus: result.responseFocus,
                  recallContext: result.recallContext,
                  scope,
                },
              ]);
              /** STEP5 — top-k summon → Solo Stage via ask bridge focus. */
              if (isPersonal && result.featuredHitId?.trim()) {
                if (!onGlobeHome) {
                  router.push("/");
                }
                requestGlobeAskBridgeFocus(result.featuredHitId.trim(), "bridge");
              }
            },
            onExternalContextAsk: (result) => {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? {
                        id: assistantId,
                        role: "assistant",
                        text: result.summaryKo,
                        narrative: result.narrativeKo || result.summaryKo,
                        externalHits:
                          result.hits.length > 0 ? result.hits : undefined,
                        recommendedHitId: result.recommendedHitId,
                        scope,
                      }
                    : message,
                ),
              );
            },
            onExternalContextAskError: () => {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? {
                        id: assistantId,
                        role: "assistant",
                        text: ask.replySoon,
                        scope,
                      }
                    : message,
                ),
              );
            },
          },
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [
    ask.externalLoading,
    ask.replySoon,
    busy,
    close,
    copy.portal.composeRunWizardChecklist,
    isPersonal,
    liveLocation?.lat,
    liveLocation?.lng,
    onGlobeHome,
    router,
    showComposerHint,
  ]);

  const sendAsk = useCallback(() => {
    runAskTurn(draft);
  }, [draft, runAskTurn]);

  useEffect(() => {
    if (!open || busy) {
      return;
    }
    const seed = consumeCaptureSheetSeedText();
    if (!seed) {
      return;
    }
    setMessages([]);
    runAskTurn(seed);
  }, [open, busy, runAskTurn]);

  if (!mounted) {
    return null;
  }

  const hero = isPersonal ? ask.heroPersonal : ask.heroDiscovery;
  const placeholder = isPersonal ? ask.placeholderPersonal : ask.placeholderDiscovery;
  const canSend = draft.trim().length > 0 && !busy;
  const personalHome = messages.length === 0 && isPersonal;
  const showTriggerRail = personalHome && recallTriggers.length > 0;

  return createPortal(
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          void onPhotoSelected(files);
          event.target.value = "";
        }}
      />
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={copy.globe.askSheet.sendAria}
              className="rimvio-sheet-over-nav-backdrop fixed inset-0 bg-black/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-label={ask.ariaLabel}
              className={cn(
                "rimvio-sheet-over-nav-panel fixed inset-x-0 bottom-0 mx-auto h-[min(92dvh,780px)] w-full max-w-lg",
                rimvioAssistantSheetShellClass(),
              )}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              data-capture-sheet
              data-surface="capture-sheet"
              data-capture-sheet-mode={showTriggerRail ? "memory-triggers" : "ask"}
            >
              <div className={rimvioAssistantSheetGlowClass()} />

              <div className="relative shrink-0 px-5 pt-3">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#1d1d1f]/12" aria-hidden />
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="flex size-9 items-center justify-center rounded-full bg-white/80 text-[#6b7684] shadow-sm ring-1 ring-black/[0.04] active:scale-95"
                    aria-label={copy.portal.closeAria}
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6"
              >
                {messages.length === 0 ? (
                  personalHome ? (
                    <div className="flex min-h-full flex-col py-4">
                      <div className="flex shrink-0 flex-col items-center px-2 pt-2">
                        <GlobeContextAiOrb size="lg" />
                        <p className={cn("mt-5 max-w-[17rem]", rimvioAssistantHeroTitleClass())}>
                          {hero}
                        </p>
                        <p className={cn("mt-2", rimvioAssistantHeroHintClass())}>
                          {copy.globe.contextAiHeroHint}
                        </p>
                      </div>
                      {showTriggerRail ? (
                        <CaptureSheetMemoryTriggerStage
                          triggers={recallTriggers}
                          onTriggerPress={onRecallTriggerPress}
                          className="mt-auto pt-6"
                        />
                      ) : (
                        <p className="mt-auto px-2 pb-6 text-center text-[14px] leading-relaxed text-[#86868b]">
                          {copy.globe.layerModePersonalEmpty}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-full items-center justify-center px-2 py-12">
                      <p className={cn("max-w-[16rem]", rimvioAssistantHeroTitleClass())}>
                        {hero}
                      </p>
                    </div>
                  )
                ) : (
                  <ul className="space-y-4 py-6">
                    {messages.map((message) => (
                      <li
                        key={message.id}
                        className={cn(
                          "flex",
                          message.role === "user" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[92%]",
                            message.role === "user" ? "flex justify-end" : "",
                          )}
                        >
                          {message.role === "user" ? (
                            <p className={rimvioAssistantUserBubbleClass()}>{message.text}</p>
                          ) : message.loading ? (
                            <div className="max-w-[92%] space-y-2 rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.04]">
                              <div className="h-4 w-[88%] animate-pulse rounded-md bg-[#e5e8eb]" />
                              <div className="h-4 w-[72%] animate-pulse rounded-md bg-[#e5e8eb]/90" />
                              <p className="text-[13px] text-[#8b95a1]">{message.text}</p>
                            </div>
                          ) : message.experienceRunSummary ? (
                            <div className="max-w-[92%]">
                              <ExperienceRunSummaryCard
                                summary={message.experienceRunSummary}
                                onDismiss={close}
                              />
                            </div>
                          ) : message.externalHits && message.externalHits.length > 0 ? (
                            <div className="max-w-[92%] rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.04]">
                              <ExternalContextAskReply
                                narrative={message.narrative ?? message.text}
                                hits={message.externalHits}
                                recommendedHitId={message.recommendedHitId}
                                opportunitiesLabel={ask.externalOpportunities}
                                ctaLabels={{
                                  join: ask.joinCta,
                                  chat: ask.chatCta,
                                  trade: ask.tradeCta,
                                  viewMap: ask.viewMap,
                                  openBridge: ask.openBridge,
                                }}
                                focusAria={ask.externalFocusAria}
                                onFocus={close}
                              />
                            </div>
                          ) : message.hits && message.hits.length > 0 ? (
                            <div className="max-w-[92%] rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.04]">
                              <PersonalContextAskReply
                                narrative={message.narrative ?? message.text}
                                hits={message.hits}
                                featuredHitId={message.featuredHitId}
                                totalPhotoCount={message.totalPhotoCount}
                                responseFocus={message.responseFocus}
                                relatedContextsLabel={ask.relatedContexts}
                                viewPhotosLabel={ask.viewPhotos}
                                viewMorePhotosLabel={ask.viewMorePhotos}
                                viewMapLabel={ask.viewMap}
                                openBridgeLabel={ask.openBridge}
                                focusAria={ask.focusBridgeAria}
                                photoCountLabel={ask.photoCount}
                                visitDateLabel={ask.visitDateLabel}
                                recallContext={message.recallContext}
                                continueExperienceLabel={ask.continueExperience}
                                continuityLabels={{
                                  context_talk: ask.continuityContextTalk,
                                  peer_chat: ask.continuityPeerChat,
                                  feed_moment: ask.continuityFeedMoment,
                                  portal_align: ask.continuityPortalAlign,
                                }}
                                coExperienceHint={ask.coExperienceHint}
                                onFocus={close}
                              />
                            </div>
                          ) : (
                            <p className={rimvioAssistantAiBubbleMutedClass()}>
                              <GlobeTypewriterText text={message.text} cps={46} />
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                {messages.length === 0 && attachMode === "closed" ? (
                  <GlobeActionPillGuide
                    pills={copy.globe.askSheet.capturePillsPersonal}
                    variant="inline"
                    showLabel={false}
                    tone="light"
                    className="mb-2"
                    onPillSelect={(pill) => runAskTurn(readPillSubmitText(pill))}
                  />
                ) : null}
                <AnimatePresence>
                  {attachMode === "menu" ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mb-2 flex flex-wrap justify-center gap-2"
                    >
                      {([
                        { id: "photo", label: ask.photo, icon: Camera },
                        { id: "link", label: ask.link, icon: Link2 },
                        { id: "memo", label: ask.memo, icon: StickyNote },
                        ...(voiceSupported
                          ? [{ id: "voice", label: ask.voiceAria, icon: Mic }]
                          : []),
                      ] as const).map((tile) => {
                        const Icon = tile.icon;
                        return (
                          <button
                            key={tile.id}
                            type="button"
                            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#191f28] shadow-sm ring-1 ring-black/[0.05] active:scale-[0.98]"
                            onClick={() => {
                              if (tile.id === "photo") {
                                photoInputRef.current?.click();
                                return;
                              }
                              if (tile.id === "voice") {
                                setAttachMode("closed");
                                toggleVoiceInput();
                                return;
                              }
                              if (tile.id === "link" || tile.id === "memo") {
                                setAttachMode(tile.id);
                              }
                            }}
                          >
                            <Icon className="size-4 text-[#6b7684]" aria-hidden />
                            {tile.label}
                          </button>
                        );
                      })}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {attachMode === "link" ? (
                  <div className="mb-2 space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <input
                      type="url"
                      inputMode="url"
                      placeholder={ask.linkPlaceholder}
                      value={linkDraft}
                      onChange={(event) => setLinkDraft(event.target.value)}
                      className="w-full rounded-xl bg-[#f2f4f6] px-3 py-2.5 text-[15px] outline-none"
                    />
                    <button
                      type="button"
                      disabled={!linkDraft.trim() || busy}
                      onClick={() => void saveLink()}
                      className="w-full rounded-xl bg-[#191f28] py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
                    >
                      {ask.save}
                    </button>
                  </div>
                ) : null}

                {attachMode === "memo" ? (
                  <div className="mb-2 space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <textarea
                      rows={3}
                      placeholder={ask.memoPlaceholder}
                      value={memoDraft}
                      onChange={(event) => setMemoDraft(event.target.value)}
                      className="w-full resize-none rounded-xl bg-[#f2f4f6] px-3 py-2.5 text-[15px] outline-none"
                    />
                    <button
                      type="button"
                      disabled={!memoDraft.trim() || busy}
                      onClick={() => void saveMemo()}
                      className="w-full rounded-xl bg-[#191f28] py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
                    >
                      {ask.save}
                    </button>
                  </div>
                ) : null}

                <GlobeComposerHintStrip
                  text={composerHint?.text ?? null}
                  tone={composerHint?.tone}
                  lightPill
                  className="mb-1.5"
                />

                <div
                  className={cn(
                    "flex items-end gap-2 rounded-[28px] bg-white py-2 pl-2 pr-2 ring-1",
                    isPersonal
                      ? "shadow-[0_4px_28px_rgba(255,107,74,0.14)] ring-[#ff6b4a]/22"
                      : "shadow-[0_4px_24px_rgba(15,23,42,0.08)] ring-black/[0.04]",
                  )}
                >
                  <button
                    type="button"
                    aria-label={ask.attachAria}
                    aria-expanded={attachMode === "menu"}
                    onClick={() =>
                      setAttachMode((mode) => (mode === "menu" ? "closed" : "menu"))
                    }
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#191f28] active:bg-[#f2f4f6]"
                  >
                    <Plus className="size-5" strokeWidth={2} aria-hidden />
                  </button>
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendAsk();
                      }
                    }}
                    placeholder={placeholder}
                    className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[16px] leading-snug text-[#191f28] outline-none placeholder:text-[#8b95a1]"
                  />
                  {voiceListening ? (
                    <button
                      type="button"
                      aria-label={
                        voicePhase === "pause_hint"
                          ? copy.globe.composerHint.voiceContinue
                          : ask.voiceListening
                      }
                      aria-pressed
                      disabled={busy}
                      onClick={() => {
                        toggleVoiceInput();
                      }}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fee2e2] text-[#ef4444] ring-2 ring-[#ef4444]/30 active:bg-[#fecaca]"
                    >
                      <Mic className="size-5" strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={ask.sendAria}
                    disabled={!canSend}
                    onClick={sendAsk}
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full transition-all",
                      canSend
                        ? "bg-[#191f28] text-white shadow-md active:scale-95"
                        : "bg-[#e5e8eb] text-[#8b95a1]",
                    )}
                  >
                    <ArrowUp className="size-5" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
