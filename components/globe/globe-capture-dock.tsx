"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  GlobeActionPillGuide,
  readPillSubmitText,
} from "@/components/globe/globe-action-pill-guide";
import { GlobeContextIngestBar, type GlobeContextIngestBarHandle, type GlobeContextIngestBarProps } from "@/components/globe/globe-context-ingest-bar";
import { GlobePhotoPlaceWalkthrough } from "@/components/globe/globe-photo-place-walkthrough";
import { GlobePhotoIngestProgressStrip } from "@/components/globe/globe-photo-ingest-progress-strip";
import { GlobePlaceVerifyCard } from "@/components/globe/globe-place-verify-card";
import { GlobeKnowledgePlacementConfirmCard } from "@/components/globe/globe-knowledge-placement-confirm-card";
import type { GlobeKnowledgePlacementPending } from "@/lib/globe/globe-knowledge-placement-pending";
import { buildMapIntentPills } from "@/lib/globe/build-map-intent-pills";
import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import type { PhotoIngestFileItem } from "@/lib/globe/photo-ingest-file-progress";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

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
      knowledgePlacementPending?: GlobeKnowledgePlacementPending | null;
    }) => void;
  };
  placeVerifyEventId: string | null;
  onPlaceVerifyDismiss: () => void;
  onPlaceVerifyConfirmed: () => void;
  knowledgePlacementPending?: GlobeKnowledgePlacementPending | null;
  onKnowledgePlacementDismiss?: () => void;
  onKnowledgePlacementConfirmed?: (input: {
    anchorEventId: string;
    knowledgeBoxLabel: string;
  }) => void;
  composeHidden?: boolean;
  stackAboveCompose?: ReactNode;
  composeAccessory?: ReactNode;
  ingest: GlobeContextIngestBarProps;
};

/** Map bottom stack ??prompt bar only; chat/cards live in GlobeChatScreen. */
export const GlobeCaptureDock = forwardRef<GlobeContextIngestBarHandle, GlobeCaptureDockProps>(
  function GlobeCaptureDock(
    {
      className,
      photoFlow,
      placeVerifyEventId,
      onPlaceVerifyDismiss,
      onPlaceVerifyConfirmed,
      knowledgePlacementPending,
      onKnowledgePlacementDismiss,
      onKnowledgePlacementConfirmed,
      composeHidden = false,
      stackAboveCompose,
      composeAccessory,
      ingest,
    },
    ref,
  ) {
    const ingestRef = useRef<GlobeContextIngestBarHandle>(null);
    useImperativeHandle(ref, () => ingestRef.current as GlobeContextIngestBarHandle);

    const photoActive = photoFlow.open;
    const showPlaceVerify = Boolean(placeVerifyEventId) && !photoActive;
    const showKnowledgePlacement =
      Boolean(knowledgePlacementPending) && !photoActive && !showPlaceVerify;
    const mapPills = buildMapIntentPills(ingest.layerMode ?? "personal");

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
            photoActive
              ? "photo"
              : showPlaceVerify
                ? "verify"
                : showKnowledgePlacement
                  ? "knowledge_placement"
                  : "compose"
          }
        >
        {showKnowledgePlacement && knowledgePlacementPending ? (
          <GlobeKnowledgePlacementConfirmCard
            pending={knowledgePlacementPending}
            className="pointer-events-auto mx-auto w-full max-w-lg"
            onDismiss={onKnowledgePlacementDismiss}
            onConfirmed={onKnowledgePlacementConfirmed}
          />
        ) : null}

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
          <div
            className="pointer-events-none mx-auto flex w-full max-w-[min(100%,20rem)] flex-col gap-1"
            data-globe-ingest-compact="pill"
          >
            <GlobeActionPillGuide
              pills={mapPills}
              variant="inline"
              showLabel={false}
              tone="dark"
              chipVariant="confirm"
              className="pointer-events-auto"
              onPillSelect={(pill) => {
                void ingestRef.current?.submitComposerText(readPillSubmitText(pill));
              }}
            />
            <GlobeContextIngestBar
              ref={ingestRef}
              {...ingest}
              className="pointer-events-auto relative inset-auto bottom-auto w-full"
            />
            {composeAccessory ? (
              <div className="pointer-events-auto pt-0.5">{composeAccessory}</div>
            ) : null}
          </div>
        ) : null}
        </div>
      </>
    );
  },
);
