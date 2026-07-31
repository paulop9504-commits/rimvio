"use client";

/**
 * Swipe to Reality Commit — Commit Preview + slide confirm.
 */

import { useCallback, useRef, useState } from "react";
import type { WorkspaceCommitPreview } from "@/lib/context-workspace/build-commit-preview";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const THRESHOLD = 0.82;

export type WorkspaceCommitPreviewSheetProps = {
  preview: WorkspaceCommitPreview;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function WorkspaceCommitPreviewSheet({
  preview,
  busy = false,
  onConfirm,
  onCancel,
}: WorkspaceCommitPreviewSheetProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const draggingRef = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const thumb = 44;
    const max = Math.max(1, rect.width - thumb);
    const next = Math.min(1, Math.max(0, (clientX - rect.left - thumb / 2) / max));
    setProgress(next);
  }, []);

  const finish = useCallback(() => {
    draggingRef.current = false;
    if (progress >= THRESHOLD && !busy) {
      onConfirm();
      return;
    }
    setProgress(0);
  }, [busy, onConfirm, progress]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      data-workspace-commit-preview
      role="dialog"
      aria-modal="true"
      aria-label={preview.titleKo}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        className="pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-black/5 px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Commit Preview
          </p>
          <h3 className="text-[16px] font-semibold text-foreground">
            {preview.titleKo}
          </h3>
        </div>
        <ul className="max-h-[40vh] space-y-2 overflow-y-auto px-4 py-3">
          {preview.lines.map((line) => (
            <li
              key={line.textKo}
              className="flex gap-2 text-[13px] text-foreground"
            >
              <span className="font-semibold text-emerald-600">+</span>
              <span>{line.textKo}</span>
            </li>
          ))}
        </ul>
        <p className="px-4 pb-2 text-[12px] text-muted-foreground">
          {preview.domainLabelKo} {preview.commitCount}곳이 지구(Forest)에
          반영됩니다
        </p>
        <div className="space-y-2 px-4 pb-4">
          <div
            ref={trackRef}
            className="relative h-12 touch-none overflow-hidden rounded-full bg-muted"
            onPointerDown={(event) => {
              if (busy) {
                return;
              }
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              setFromClientX(event.clientX);
            }}
            onPointerMove={(event) => {
              if (!draggingRef.current) {
                return;
              }
              setFromClientX(event.clientX);
            }}
            onPointerUp={finish}
            onPointerCancel={() => {
              draggingRef.current = false;
              setProgress(0);
            }}
            data-workspace-swipe-commit
          >
            <div
              className="absolute inset-y-0 left-0 bg-foreground/90 transition-[width]"
              style={{ width: `${Math.max(progress * 100, 8)}%` }}
            />
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-background mix-blend-difference">
              {busy
                ? "…"
                : progress >= THRESHOLD
                  ? copy.globe.workspaceSwipeRelease
                  : copy.globe.workspaceSwipeHint}
            </p>
            <div
              className={cn(
                "absolute top-1 flex size-10 items-center justify-center rounded-full bg-white text-[14px] font-bold shadow-sm",
              )}
              style={{
                left: `calc(${progress * 100}% - ${progress * 40}px)`,
              }}
            >
              →
            </div>
          </div>
          <button
            type="button"
            className="w-full rounded-full py-2 text-[12px] font-medium text-muted-foreground"
            onClick={onCancel}
            disabled={busy}
          >
            {copy.globe.workspaceCommitCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
