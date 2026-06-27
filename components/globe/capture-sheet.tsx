"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Camera, Link2, Mic, Plus, StickyNote, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalContextAskReply } from "@/components/globe/external-context-ask-reply";
import { CaptureSheetMemoryTriggerStage } from "@/components/globe/capture-sheet-memory-trigger-stage";
import { GlobeContextAiOrb } from "@/components/globe/globe-context-ai-orb";
import { GlobeLayerModeToggle } from "@/components/globe/globe-layer-mode-toggle";
import { PersonalContextAskReply } from "@/components/globe/personal-context-ask-reply";
import { useAskSpeechRecognition } from "@/hooks/use-ask-speech-recognition";
import { useGlobeContextTriggers } from "@/hooks/use-globe-context-triggers";
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import {
  fetchExternalContextSourcesClient,
  resolveExternalContextAsk,
  type ExternalContextOpportunityHit,
} from "@/lib/external-context-ask";
import { isGlobeHomePath, requestGlobePhotoIngest } from "@/lib/globe/globe-photo-ingest-bridge";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { resolveContextTriggerOpenOptions } from "@/lib/globe/context-triggers/resolve-context-trigger-open-options";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import {
  resolvePersonalContextAsk,
  type PersonalContextAskRecallContext,
  type PersonalContextBridgeHit,
  type PersonalContextResponseFocus,
} from "@/lib/personal-context-ask";
import { ingestScreenshot } from "@/lib/share/ingest-screenshot";
import { ingestPastedLinks } from "@/lib/share/inbox-paste";
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
  const { layerMode, setLayerMode } = useGlobeLayerMode();
  const recallTriggers = useGlobeContextTriggers({
    enabled: open && layerMode === "personal",
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
  const isPersonal = layerMode === "personal";

  const { listening: voiceListening, start: toggleVoiceInput, supported: voiceSupported } =
    useAskSpeechRecognition({
      locale,
      enabled: open && !busy,
      onFinalTranscript: (transcript) => {
        setDraft((prev) => {
          const base = prev.trim();
          return base ? `${base} ${transcript}` : transcript;
        });
      },
      onError: (code) => {
        if (code === "unsupported") {
          toast.message(ask.voiceUnsupported);
          return;
        }
        toast.message(ask.voiceFailed);
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
    }
  }, [open]);

  useEffect(() => {
    if (!open || !scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

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
      if (isPersonal) {
        setAttachMode("closed");
        if (!onGlobeHome) {
          close();
          router.push("/");
        }
        requestGlobePhotoIngest(files);
        return;
      }
      if (onGlobeHome) {
        requestGlobePhotoIngest(files);
        setAttachMode("closed");
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
    [busy, close, isPersonal, onGlobeHome, router],
  );

  const saveLink = useCallback(async () => {
    const url = linkDraft.trim();
    if (!url || busy) {
      return;
    }
    setBusy(true);
    try {
      await ingestPastedLinks(url);
      setLinkDraft("");
      setAttachMode("closed");
    } finally {
      setBusy(false);
    }
  }, [busy, linkDraft]);

  const saveMemo = useCallback(async () => {
    const text = memoDraft.trim();
    if (!text || busy) {
      return;
    }
    setBusy(true);
    try {
      await ingestPastedLinks(text);
      setMemoDraft("");
      setAttachMode("closed");
    } finally {
      setBusy(false);
    }
  }, [busy, memoDraft]);

  const sendAsk = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) {
      return;
    }
    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;
    const scope: AskMessage["scope"] = isPersonal ? "personal" : "discovery";

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text },
      ...(scope === "discovery"
        ? [
            {
              id: assistantId,
              role: "assistant" as const,
              text: ask.externalLoading,
              loading: true,
              scope,
            },
          ]
        : []),
    ]);
    setDraft("");
    setAttachMode("closed");

    if (scope === "personal") {
      const result = resolvePersonalContextAsk({
        query: text,
        events: listLifeEventCandidates(),
        scope,
      });
      setMessages((prev) => [
        ...prev,
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
      return;
    }

    setBusy(true);
    void (async () => {
      try {
        const sources = await fetchExternalContextSourcesClient({
          lat: liveLocation?.lat ?? null,
          lng: liveLocation?.lng ?? null,
        });
        const result = resolveExternalContextAsk({
          query: text,
          sources,
          lat: liveLocation?.lat ?? null,
          lng: liveLocation?.lng ?? null,
        });
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
      } catch {
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
      } finally {
        setBusy(false);
      }
    })();
  }, [ask.externalLoading, ask.replySoon, busy, draft, isPersonal, liveLocation?.lat, liveLocation?.lng]);

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
              className="rimvio-sheet-over-nav-panel fixed inset-x-0 bottom-0 mx-auto flex h-[min(92dvh,780px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-[#fafafa] shadow-[0_-12px_48px_rgba(15,23,42,0.12)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              data-capture-sheet
              data-capture-sheet-mode={showTriggerRail ? "memory-triggers" : "ask"}
            >
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#ede9fe]/35 via-[#e0f2fe]/20 to-transparent"
                aria-hidden
              />

              <div className="relative shrink-0 px-5 pt-3">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#191f28]/12" aria-hidden />
                <div className="flex items-center justify-between gap-3">
                  <GlobeLayerModeToggle
                    mode={layerMode}
                    onModeChange={setLayerMode}
                    variant="sheet"
                  />
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
                        <p className="mt-5 max-w-[17rem] text-center text-[22px] font-bold leading-snug tracking-tight text-[#191f28]">
                          {hero}
                        </p>
                        <p className="mt-2 text-center text-[15px] font-medium text-[#ff6b4a]/90">
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
                        <p className="mt-auto px-2 pb-6 text-center text-[14px] leading-relaxed text-[#8b95a1]">
                          {copy.globe.layerModePersonalEmpty}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-full items-center justify-center px-2 py-12">
                      <p className="max-w-[16rem] text-center text-[22px] font-medium leading-snug tracking-tight text-[#191f28]">
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
                            <p className="max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-[#191f28] px-4 py-2.5 text-[15px] leading-relaxed text-white">
                              {message.text}
                            </p>
                          ) : message.loading ? (
                            <div className="max-w-[92%] space-y-2 rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.04]">
                              <div className="h-4 w-[88%] animate-pulse rounded-md bg-[#e5e8eb]" />
                              <div className="h-4 w-[72%] animate-pulse rounded-md bg-[#e5e8eb]/90" />
                              <p className="text-[13px] text-[#8b95a1]">{message.text}</p>
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
                            <p className="max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-bl-md bg-white px-4 py-2.5 text-[15px] leading-relaxed text-[#4e5968] shadow-sm ring-1 ring-black/[0.04]">
                              {message.text}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {messages.length === 0 && !isPersonal ? (
                <p className="shrink-0 px-6 pb-2 text-center text-[14px] leading-relaxed text-[#8b95a1]">
                  {copy.globe.layerModeDiscoveryHint}
                </p>
              ) : null}

              <div className="relative shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                <AnimatePresence>
                  {attachMode === "menu" ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mb-2 flex justify-center gap-2"
                    >
                      {(
                        [
                          { id: "photo", label: ask.photo, icon: Camera },
                          { id: "link", label: ask.link, icon: Link2 },
                          { id: "memo", label: ask.memo, icon: StickyNote },
                        ] as const
                      ).map((tile) => {
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
                              setAttachMode(tile.id);
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
                  <button
                    type="button"
                    aria-label={ask.voiceAria}
                    aria-pressed={voiceListening}
                    disabled={busy || !voiceSupported}
                    onClick={() => {
                      if (!voiceSupported) {
                        toast.message(ask.voiceUnsupported);
                        return;
                      }
                      toggleVoiceInput();
                    }}
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full active:bg-[#f2f4f6]",
                      voiceListening
                        ? "bg-[#fee2e2] text-[#ef4444] ring-2 ring-[#ef4444]/30"
                        : "text-[#6b7684]",
                      !voiceSupported && "opacity-40",
                    )}
                  >
                    <Mic className="size-5" strokeWidth={2} aria-hidden />
                  </button>
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
