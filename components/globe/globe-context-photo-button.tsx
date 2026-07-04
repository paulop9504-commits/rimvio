"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GLOBE_CONTEXT_MEDIA_ACCEPT } from "@/lib/feed/ingest-globe-context-capture";
import { validateIngestMediaFiles } from "@/lib/globe/validate-ingest-media-files";
import { dispatchContextRun } from "@/lib/context-run/dispatch-context-run";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";

export type GlobeContextPhotoButtonProps = {
  eventId: string;
  eventTitle: string;
  variant?: "primary" | "secondary";
  layout?: "full" | "compact";
  className?: string;
  onIngested?: () => void;
};

/** Add photo/video to a globe context — attach or split by spacetime. */
export function GlobeContextPhotoButton({
  eventId,
  eventTitle,
  variant = "secondary",
  layout = "full",
  className,
  onIngested,
}: GlobeContextPhotoButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || busy) {
      return;
    }
    const files = Array.from(fileList);
    const validated = validateIngestMediaFiles(files);
    if (!validated.ok) {
      toast.error(validated.message);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }
    if (validated.skippedCount > 0) {
      toast.message(copy.globe.photoIngestSkippedUnsupported(validated.skippedCount));
    }
    const mediaFiles = validated.files;
    setBusy(true);
    const toastId = toast.loading(
      mediaFiles.length === 1
        ? "올리는 중…"
        : `사진·동영상 ${mediaFiles.length}개 올리는 중… 0/${mediaFiles.length}`,
    );
    try {
      await dispatchContextRun(
        {
          kind: "photo",
          files: mediaFiles,
          surface: "composer",
          layerMode: "personal",
          mode: "direct",
          contextEventId: eventId,
          hintTitle: eventTitle,
          forceAttachToTarget: true,
        },
        {
          openPortal: async () => {},
          openFieldDiscovery: () => {},
          tryQuickListMarket: async () => false,
          navigateUrl: () => {},
          onPhotoIngestProgress: (done, total) => {
            if (total > 1) {
              toast.loading(`사진·동영상 ${total}개 올리는 중… ${done}/${total}`, {
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
            const suggestedPlace = summary.lastSuggestedPlaceName?.trim();
            if (suggestedPlace) {
              toast.success(copy.globe.inboxPhotoPlaceSuggestToast(suggestedPlace), {
                id: toastId,
              });
            } else {
              toast.success(summary.toastLine, { id: toastId });
            }
            onIngested?.();
          },
        },
      );
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "사진·동영상을 넣지 못했어요.";
      toast.error(message, { id: toastId });
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const primary = variant === "primary";
  const compact = layout === "compact";

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-semibold transition active:opacity-90 disabled:opacity-50",
          compact
            ? "rounded-full border border-border bg-card px-3 text-[14px] text-foreground"
            : "w-full rounded-2xl py-3.5 text-[15px]",
          !compact && primary
            ? "bg-foreground text-background"
            : !compact
              ? "border border-border bg-card text-foreground"
              : "",
          className,
        )}
        data-globe-context-photo-button
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ImagePlus className={cn("shrink-0", compact ? "size-[18px]" : "size-4")} aria-hidden />
        )}
        {compact ? copy.globe.bridgeContextPhotoCompactCta : "사진·동영상 넣기"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={GLOBE_CONTEXT_MEDIA_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void onFiles(event.target.files)}
      />
    </>
  );
}
