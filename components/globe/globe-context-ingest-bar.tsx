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
import { GlobeMarketComposeRoleCard } from "@/components/globe/globe-market-compose-role-card";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import {
  rimvioComposerFieldClass,
  rimvioIconBtnClass,
} from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";

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
  onMarketRoleSelect?: (role: MarketIntentRole, composeText: string) => void;
  marketRoleBusy?: boolean;
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
    onMarketRoleSelect,
    marketRoleBusy = false,
  },
  ref,
) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const inputPlaceholder = attachHintTitle
    ? copy.globe.ingestAttachPlaceholder(attachHintTitle)
    : copy.globe.ingestDefaultPlaceholder;
  const showMarketRoleCard = isMarketComposeInput(text);
  const marketComposeBusy = busy || marketRoleBusy;

  const ingestMedia = useCallback(
    async (fileList: FileList | null | undefined) => {
      if (!fileList?.length || busy) {
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
    [attachHintId, attachHintTitle, busy, forceAttachToTarget, onAttached, onPhotoDraftReady],
  );

  const submitText = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      const value = text.trim();
      if (!value || busy) {
        return;
      }
      if (isBareMarketComposeInput(value)) {
        toast.message(copy.globe.marketComposeBareHint);
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
          const composeText = action.composeText.trim() || value;
          const outcome = await ingestGlobeContextFromText(composeText);
          finish(outcome.result.event.id, outcome.toastLine, {
            needsPlaceVerify: outcome.placeVerify?.needsPlaceVerify,
          });
          onTextCommitted?.({
            eventId: outcome.result.event.id,
            text: composeText,
          });
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
    [busy, finish, onTextCommitted, text],
  );

  return (
    <div className={cn("w-full", className)} data-globe-context-ingest-bar>
      <div
        className={cn(
          "overflow-hidden rounded-[1.35rem] bg-white/92 shadow-[0_8px_32px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.06] backdrop-blur-xl",
          menuOpen && "ring-primary/20",
        )}
      >
        {menuOpen ? (
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

        {showMarketRoleCard ? (
          <GlobeMarketComposeRoleCard
            disabled={marketComposeBusy}
            onSelectRole={(role) => {
              onMarketRoleSelect?.(role, text.trim());
              setText("");
              setMenuOpen(false);
            }}
          />
        ) : null}

        <form
          onSubmit={(event) => void submitText(event)}
          className="flex items-center gap-2 px-2 py-2"
        >
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
