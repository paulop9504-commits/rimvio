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
  ingestGlobeContextFromFiles,
  ingestGlobeContextFromText,
} from "@/lib/feed/ingest-globe-context-capture";
import { runGlobeComposerAction } from "@/lib/globe/run-globe-composer-action";
import {
  isBareMarketComposeInput,
  isMarketComposeInput,
} from "@/lib/globe/market/detect-market-compose-input";
import { canQuickListMarketCompose } from "@/lib/globe/market/build-market-quick-list-draft";
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
  onTextCommitted?: (input: { eventId: string; text: string }) => void;
  onOpenPortal?: (input: {
    eventId?: string | null;
    composeText?: string;
  }) => void;
  onQuickListMarket?: (input: {
    composeText: string;
    eventId?: string | null;
  }) => Promise<boolean>;
  onOpenMarketManage?: () => void;
  marketRoleBusy?: boolean;
  layerMode?: GlobeLayerMode;
  onDiscoveryMarketBrowse?: () => void;
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
    onTextCommitted,
    onOpenPortal,
    onQuickListMarket,
    onOpenMarketManage,
    marketRoleBusy = false,
    layerMode = "personal",
    onDiscoveryMarketBrowse,
  },
  ref,
) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
  const inputPlaceholder = isDiscovery
    ? copy.globe.ingestDiscoveryPlaceholder
    : attachHintTitle
      ? copy.globe.ingestAttachPlaceholder(attachHintTitle)
      : copy.globe.ingestDefaultPlaceholder;
  const marketComposeBusy = busy || marketRoleBusy;

  const tryQuickListMarket = useCallback(
    async (composeText: string): Promise<boolean> => {
      if (!canQuickListMarketCompose(composeText) || !onQuickListMarket) {
        return false;
      }
      setBusy(true);
      try {
        return await onQuickListMarket({
          composeText: composeText.trim(),
          eventId: attachHintId,
        });
      } finally {
        setBusy(false);
      }
    },
    [attachHintId, onQuickListMarket],
  );

  const openPortalFromComposer = useCallback(
    (composeText: string) => {
      onOpenPortal?.({
        eventId: attachHintId,
        composeText,
      });
      setText("");
      setMenuOpen(false);
    },
    [attachHintId, onOpenPortal],
  );

  const ingestMedia = useCallback(
    async (fileList: FileList | null | undefined) => {
      if (!fileList?.length || busy) {
        return;
      }
      if (isDiscovery) {
        toast.message(copy.globe.ingestDiscoveryNoTrace);
        return;
      }
      const files = Array.from(fileList);
      if (onPhotoDraftReady) {
        setMenuOpen(false);
        if (photoRef.current) {
          photoRef.current.value = "";
        }
        await onPhotoDraftReady(files);
        return;
      }
      setBusy(true);
      const toastId = toast.loading(
        files.length === 1
          ? copy.globe.ingestUploadingOne
          : copy.globe.ingestUploadingMany(files.length),
      );
      try {
        const summary = await ingestGlobeContextFromFiles(files, {
          hintEventId: attachHintId,
          hintTitle: attachHintTitle,
          forceAttachToHint: forceAttachToTarget && Boolean(attachHintId),
          onProgress: (done, total) => {
            if (total > 1) {
              toast.loading(copy.globe.ingestUploadProgress(done, total), {
                id: toastId,
              });
            }
          },
          onFilePrepare: (line) => {
            toast.loading(line, { id: toastId });
          },
        });
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
    [attachHintId, attachHintTitle, busy, forceAttachToTarget, isDiscovery, onAttached, onPhotoDraftReady],
  );

  const submitText = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      const value = text.trim();
      if (!value || busy) {
        return;
      }
      if (isDiscovery) {
        if (isBareMarketComposeInput(value) || isMarketComposeInput(value)) {
          onDiscoveryMarketBrowse?.();
          setText("");
          setMenuOpen(false);
          return;
        }
        const action = runGlobeComposerAction(value);
        if (action?.kind === "url") {
          window.location.assign(action.url);
          toast.success(`${action.label} 여는 중…`);
          setText("");
          setMenuOpen(false);
          return;
        }
        toast.message(copy.globe.ingestDiscoveryNearbyHint);
        return;
      }
      if (isBareMarketComposeInput(value) || isMarketComposeInput(value)) {
        if (await tryQuickListMarket(value)) {
          setText("");
          setMenuOpen(false);
          return;
        }
        openPortalFromComposer(value);
        return;
      }
      setBusy(true);
      try {
        const action = runGlobeComposerAction(value);
        if (action?.kind === "url") {
          window.location.assign(action.url);
          toast.success(`${action.label} 여는 중…`);
          setText("");
          setMenuOpen(false);
          return;
        }
        if (action?.kind === "market-compose") {
          const compose = action.composeText.trim() || value;
          if (await tryQuickListMarket(compose)) {
            setText("");
            setMenuOpen(false);
            return;
          }
          openPortalFromComposer(compose);
          return;
        }
        const outcome = await ingestGlobeContextFromText(value);
        finish(outcome.result.event.id, outcome.toastLine, {
          needsPlaceVerify: outcome.placeVerify?.needsPlaceVerify,
        });
        onTextCommitted?.({
          eventId: outcome.result.event.id,
          text: value,
        });
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : copy.globe.ingestAttachFail;
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, finish, isDiscovery, onDiscoveryMarketBrowse, onTextCommitted, openPortalFromComposer, tryQuickListMarket, text],
  );

  return (
    <div className={cn("w-full", className)} data-globe-context-ingest-bar>
      <div
        className={cn(
          "overflow-hidden rounded-[1.35rem] bg-white/92 shadow-[0_8px_32px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.06] backdrop-blur-xl",
          menuOpen && "ring-primary/20",
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

          <div className={cn(rimvioComposerFieldClass, "min-w-0 flex-1 px-3 py-2.5")}>
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={inputPlaceholder}
              disabled={marketComposeBusy}
              className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80"
              data-globe-context-ingest-input
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
