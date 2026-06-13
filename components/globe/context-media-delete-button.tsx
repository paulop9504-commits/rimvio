"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import {
  canViewerDeleteBridgeMediaItem,
  resolveReelItemCaptureId,
} from "@/lib/globe/resolve-reel-item-capture-id";
import { deleteBridgeCaptureContribution } from "@/lib/experience-bridge/delete-bridge-capture-contribution";
import { cn } from "@/lib/utils";

export type ContextMediaDeleteButtonProps = {
  item: ContextMediaReelItem;
  eventId: string;
  viewerUserId?: string | null;
  enabled?: boolean;
  className?: string;
  onDeleted?: () => void;
};

/** Own bridge media — delete from reel / map overlay. */
export function ContextMediaDeleteButton({
  item,
  eventId,
  viewerUserId,
  enabled = true,
  className,
  onDeleted,
}: ContextMediaDeleteButtonProps) {
  const [busy, setBusy] = useState(false);

  if (!enabled || !canViewerDeleteBridgeMediaItem({ item, viewerUserId })) {
    return null;
  }

  const handleDelete = async () => {
    if (busy) {
      return;
    }
    const label = item.kind === "video" ? "동영상" : "사진";
    if (!window.confirm(`내 ${label}을 삭제할까요?`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteBridgeCaptureContribution({
        eventId,
        captureId: resolveReelItemCaptureId(item),
        mediaContextId: item.mediaContextId,
      });
      onDeleted?.();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "삭제하지 못했어요.";
      window.alert(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      className={cn(
        "pointer-events-auto absolute bottom-3 left-3 z-[4] flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm active:bg-black/70 disabled:opacity-50",
        className,
      )}
      aria-label={item.kind === "video" ? "동영상 삭제" : "사진 삭제"}
      data-context-media-delete
      onClick={(event) => {
        event.stopPropagation();
        void handleDelete();
      }}
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
