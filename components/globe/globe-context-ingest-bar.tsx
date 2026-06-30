"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ImagePlus,
  Loader2,
  Plus,
  SendHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  GLOBE_CONTEXT_MEDIA_ACCEPT,
} from "@/lib/feed/ingest-globe-context-capture";
import { canQuickListMarketCompose } from "@/lib/globe/market/build-market-quick-list-draft";
import { finishContextRun } from "@/lib/context-run/execution-feed-lifecycle";
import { dispatchContextRun } from "@/lib/context-run/dispatch-context-run";
import { readActiveRunState } from "@/lib/context-run/run-state-store";
import { runGlobeComposerAction } from "@/lib/globe/run-globe-composer-action";
import { dispatchOpenCaptureSheet } from "@/lib/nav/open-capture-sheet-bridge";
import type { ContextRunEffectHandlers } from "@/lib/context-run/ingress-types";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import {
  rimvioComposerFieldClass,
  rimvioIconBtnClass,
} from "@/lib/brand/rimvio-neon-theme";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextIngestBarHandle = {
  openPhotoPicker: () => void;
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
  onOpenMarketManage?: () => void;
  marketRoleBusy?: boolean;
  layerMode?: GlobeLayerMode;
  onDiscoveryMarketBrowse?: () => void;
  onComposeFocus?: () => void;
  onComposeBlur?: () => void;
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
    onOpenMarketManage,
    marketRoleBusy = false,
    layerMode = "personal",
    onDiscoveryMarketBrowse,
    onComposeFocus,
    onComposeBlur,
    userLat = null,
    userLng = null,
    onLodgingDiscovery,
    onEateryDiscovery,
    mapPromptMode = true,
  },
  ref,
) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clarifyPlaceholder, setClarifyPlaceholder] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDiscovery = layerMode === "discovery";

  useImperativeHandle(ref, () => ({
    openPhotoPicker: () => {
      setMenuOpen(true);
      window.setTimeout(() => photoRef.current?.click(), 0);
    },
  }));

  const finish = useCallback(
    (eventId: string, line: string, options?: { needsPlaceVerify?: boolean }) => {
      toast.success(line);
      onAttached?.(eventId, options);
      setText("");
      setMenuOpen(false);
    },
    [onAttached],
  );

  const attachHintId = forceAttachToTarget ? targetEventId?.trim() || null : null;
  const attachHintTitle = forceAttachToTarget ? targetTitle?.trim() || null : null;
  const inputPlaceholder = clarifyPlaceholder ?? (isDiscovery
    ? copy.globe.ingestDiscoveryPlaceholder
    : mapPromptMode
      ? copy.globe.mapIntentPromptPlaceholder
      : attachHintTitle
        ? copy.globe.ingestAttachPlaceholder(attachHintTitle)
        : copy.globe.ingestDefaultPlaceholder);
  const marketComposeBusy = busy || marketRoleBusy;

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
        toast.success(`${label} 여는 중…`);
      },
      onLodgingDiscovery,
      onEateryDiscovery,
      onAttached,
      onTextIngested: ({ eventId, toastLine, needsPlaceVerify }) => {
        finish(eventId, toastLine, { needsPlaceVerify });
      },
      onExperienceRunClarify: (runResult) => {
        toast.message(runResult.questionKo, { duration: 8000 });
      },
      onExperienceRunSummary: (runResult) => {
        if (runResult.summary.eventId) {
          onAttached?.(runResult.summary.eventId);
        }
        toast.success(runResult.summary.titleKo, { duration: 7000 });
      },
      onPortalComposeClarify: ({ questionKo }) => {
        setClarifyPlaceholder(questionKo);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      },
      onLaunchMarketProjection: (input) => {
        onLaunchMarketProjection?.(input);
      },
      toastSuccess: (message) => toast.success(message, { duration: 7000 }),
      toastMessage: (message) => toast.message(message),
    }),
    [
      finish,
      onAttached,
      onDiscoveryMarketBrowse,
      onEateryDiscovery,
      onLodgingDiscovery,
      onLaunchMarketProjection,
      onOpenPortal,
      tryQuickListMarket,
    ],
  );

  const ingestMedia = useCallback(
    async (fileList: FileList | null | undefined) => {
      if (!fileList?.length || busy) {
        return;
      }
      const files = Array.from(fileList);
      setBusy(true);
      const toastId = toast.loading(
        files.length === 1
          ? copy.globe.ingestUploadingOne
          : copy.globe.ingestUploadingMany(files.length),
      );
      try {
        await dispatchContextRun(
          {
            kind: "photo",
            files,
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
      onPhotoDraftReady,
    ],
  );

  const submitText = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      const value = text.trim();
      if (!value || busy) {
        return;
      }

      if (
        !isDiscovery &&
        !forceAttachToTarget &&
        runGlobeComposerAction(value)?.kind !== "url"
      ) {
        finishContextRun();
        dispatchOpenCaptureSheet({ seedText: value, source: "composer" });
        setText("");
        setMenuOpen(false);
        setClarifyPlaceholder(null);
        return;
      }

      setBusy(true);
      try {
        const result = await dispatchContextRun(
          {
            kind: "text",
            text: value,
            surface: "composer",
            layerMode: isDiscovery ? "discovery" : "personal",
            contextEventId: attachHintId,
            lat: userLat,
            lng: userLng,
          },
          contextRunHandlers(),
        );

        if (result.status === "error") {
          toast.error(result.errorMessage ?? copy.globe.ingestAttachFail);
          return;
        }

        if (result.status === "done" && result.planKind !== "discovery_hint") {
          {
            const activeGraph = readActiveRunState()?.graphId;
            const pending = activeGraph
              ? readPortalComposeRunState(activeGraph)
              : null;
            if (pending?.status !== "waiting_slot") {
              setClarifyPlaceholder(null);
            }
          }
          setText("");
          setMenuOpen(false);
        }
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : copy.globe.ingestAttachFail;
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [
      attachHintId,
      busy,
      contextRunHandlers,
      isDiscovery,
      text,
      userLat,
      userLng,
    ],
  );

  return (
    <div className={cn("w-full", className)} data-globe-map-intent-prompt>
      <div
        className={cn(
          "overflow-hidden rounded-[1.35rem] backdrop-blur-xl",
          mapPromptMode && !isDiscovery
            ? "bg-[#121316]/82 shadow-[0_12px_40px_rgba(0,0,0,0.38)] ring-1 ring-white/12"
            : "bg-white/92 shadow-[0_8px_32px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.06]",
        )}
      >
        {menuOpen && !isDiscovery ? (
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
        ) : null}

        <form
          onSubmit={(event) => void submitText(event)}
          className="flex items-center gap-2 px-2 py-2"
        >
          {!isDiscovery ? (
          <button
            type="button"
            disabled={marketComposeBusy}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              rimvioIconBtnClass(menuOpen ? "primary" : "ghost"),
              "size-10 shrink-0 rounded-xl",
            )}
            aria-label={menuOpen ? copy.globe.ingestMenuCloseAria : copy.globe.ingestMenuOpenAria}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Plus className="size-5" aria-hidden />
            )}
          </button>
          ) : null}

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

          <button
            type="submit"
            disabled={busy || !text.trim()}
            className={cn(
              rimvioIconBtnClass("primary"),
              "size-10 shrink-0 rounded-xl disabled:opacity-35",
            )}
            aria-label={copy.globe.ingestSendAria}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="size-5" aria-hidden />
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
