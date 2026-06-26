"use client";

import type { ReactNode } from "react";
import { forwardRef } from "react";
import { GlobeContextIngestBar, type GlobeContextIngestBarHandle, type GlobeContextIngestBarProps } from "@/components/globe/globe-context-ingest-bar";
import { GlobePhotoPlaceWalkthrough } from "@/components/globe/globe-photo-place-walkthrough";
import { GlobePhotoIngestProgressStrip } from "@/components/globe/globe-photo-ingest-progress-strip";
import { GlobePlaceVerifyCard } from "@/components/globe/globe-place-verify-card";
import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import type { PhotoIngestFileItem } from "@/lib/globe/photo-ingest-file-progress";
import { cn } from "@/lib/utils";

export type GlobeCaptureDockProps = {
  className?: string;
  photoFlow: {
    open: boolean;
    preparing: boolean;
    error: string | null;
    draft: GlobePhotoIngestDraft | null;
    fileProgress?: readonly PhotoIngestFileItem[];
    attachTarget?: {
      eventId: string;
      title: string;
      force?: boolean;
    } | null;
    onDismiss: () => void;
    onCommitProgress?: (done: number, total: number) => void;
    onCommitFileIndexProgress?: (
      event: import("@/lib/feed/ingest-globe-context-media").GlobeMediaIngestProgressEvent,
    ) => void;
    onRetryFile?: (fileIndex: number) => void;
    retryingFileIndex?: number | null;
    onConfirmed: (input: {
      eventId: string | null;
      toastLine: string;
      needsPlaceVerify?: boolean;
      ok?: boolean;
      undoPayload?: import("@/lib/globe/globe-photo-ingest-undo").GlobePhotoIngestUndoPayload | null;
    }) => void;
  };
  placeVerifyEventId: string | null;
  onPlaceVerifyDismiss: () => void;
  onPlaceVerifyConfirmed: () => void;
  /** Hide composer while a full-screen bottom sheet owns the flow (e.g. market wizard). */
  composeHidden?: boolean;
  /** Alignment cards, trade dock, pulse — stacked above ingest in one column. */
  stackAboveCompose?: ReactNode;
  /** Chrome directly above the prompt bar (e.g. recall pill beside + column). */
  composeAccessory?: ReactNode;
  ingest: GlobeContextIngestBarProps;
};

/** Single bottom stack — photo confirm OR ingest, never both cluttering the map. */
export const GlobeCaptureDock = forwardRef<GlobeContextIngestBarHandle, GlobeCaptureDockProps>(
  function GlobeCaptureDock(
    {
      className,
      photoFlow,
      placeVerifyEventId,
      onPlaceVerifyDismiss,
      onPlaceVerifyConfirmed,
      composeHidden = false,
      stackAboveCompose,
      composeAccessory,
      ingest,
    },
    ref,
  ) {
    const photoActive = photoFlow.open;
    const showPlaceVerify = Boolean(placeVerifyEventId) && !photoActive;

    return (
      <>
        {photoActive ? (
          <div
            className="pointer-events-none fixed inset-0 z-[31] flex flex-col items-center justify-center gap-3 px-5 pb-[calc(var(--rimvio-bottom-nav-offset)+0.5rem)] pt-[max(3.25rem,env(safe-area-inset-top))]"
            data-globe-photo-walkthrough-overlay
          >
            <GlobePhotoPlaceWalkthrough
              visible
              preparing={photoFlow.preparing}
              prepareError={photoFlow.error}
              draft={photoFlow.draft}
              attachTarget={photoFlow.attachTarget}
              className="pointer-events-auto w-full max-w-[360px]"
              onDismiss={photoFlow.onDismiss}
              onCommitProgress={photoFlow.onCommitProgress}
              onCommitFileIndexProgress={photoFlow.onCommitFileIndexProgress}
              onConfirmed={photoFlow.onConfirmed}
            />
            {photoFlow.fileProgress && photoFlow.fileProgress.length > 0 ? (
              <GlobePhotoIngestProgressStrip
                items={photoFlow.fileProgress}
                className="pointer-events-auto"
                onRetryFile={photoFlow.onRetryFile}
                retryingIndex={photoFlow.retryingFileIndex}
              />
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-30 flex flex-col gap-2 px-3",
            "bottom-[var(--rimvio-bottom-nav-offset)]",
            "lg:bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
            className,
          )}
          data-globe-capture-dock
          data-globe-capture-mode={
            photoActive ? "photo" : showPlaceVerify ? "verify" : "compose"
          }
        >
        {showPlaceVerify ? (
          <GlobePlaceVerifyCard
            eventId={placeVerifyEventId}
            className="pointer-events-auto mx-auto w-full max-w-lg"
            onDismiss={onPlaceVerifyDismiss}
            onPlaceConfirmed={onPlaceVerifyConfirmed}
          />
        ) : null}

        {!photoActive && stackAboveCompose ? (
          <div
            className="pointer-events-auto mx-auto flex w-full max-w-lg flex-col gap-2"
            data-globe-bottom-action-stack
          >
            {stackAboveCompose}
          </div>
        ) : null}

        {!photoActive && !composeHidden ? (
          <div className="pointer-events-none mx-auto w-full max-w-lg">
            {composeAccessory ? (
              <div className="pointer-events-auto">{composeAccessory}</div>
            ) : null}
            <GlobeContextIngestBar
              ref={ref}
              {...ingest}
              className="pointer-events-auto relative inset-auto bottom-auto w-full"
            />
          </div>
        ) : null}
        </div>
      </>
    );
  },
);
