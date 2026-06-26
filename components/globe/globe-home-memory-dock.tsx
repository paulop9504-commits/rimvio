"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaptureSheetMemoryTriggerStage } from "@/components/globe/capture-sheet-memory-trigger-stage";
import { GlobeResumeContextCard } from "@/components/globe/globe-resume-context-card";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { resolveGlobeContextTriggers } from "@/lib/globe/context-triggers/resolve-globe-context-triggers";
import {
  clearGlobeResumeSession,
  readGlobeResumeSession,
  type GlobeResumeSession,
} from "@/lib/globe/globe-resume-session";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { findLifeEventCandidate, listLifeEventCandidates, EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

export type GlobeHomeMemoryDockProps = {
  enabled: boolean;
  layerMode: GlobeLayerMode;
  activeEventId?: string | null;
  onActivateTrigger: (trigger: GlobeContextTrigger) => void;
  onResumeSession: (session: GlobeResumeSession) => void;
  className?: string;
};

/** Pick-up + on-this-day recall — sits above compose without blocking the map. */
export function GlobeHomeMemoryDock({
  enabled,
  layerMode,
  activeEventId,
  onActivateTrigger,
  onResumeSession,
  className,
}: GlobeHomeMemoryDockProps) {
  const [revision, setRevision] = useState(0);
  const [resume, setResume] = useState<GlobeResumeSession | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }
    const bump = () => {
      setRevision((value) => value + 1);
      setResume(readGlobeResumeSession());
    };
    bump();
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, [enabled]);

  const recallTriggers = useMemo(() => {
    if (!enabled || layerMode === "discovery") {
      return [];
    }
    void revision;
    return resolveGlobeContextTriggers({
      events: listLifeEventCandidates(),
      layerMode,
      limit: 4,
    }).filter((row) => row.mediaPreviews?.length || row.kind === "time_recall");
  }, [enabled, layerMode, revision]);

  const showResume = useMemo(() => {
    if (!resume?.eventId?.trim()) {
      return false;
    }
    if (resume.kind === "photo") {
      return false;
    }
    if (activeEventId?.trim() === resume.eventId.trim()) {
      return false;
    }
    return Boolean(findLifeEventCandidate(resume.eventId));
  }, [activeEventId, resume]);

  const dismissResume = useCallback(() => {
    clearGlobeResumeSession();
    setResume(null);
  }, []);

  if (!enabled || layerMode === "discovery") {
    return null;
  }
  if (!showResume && recallTriggers.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("pointer-events-auto flex w-full flex-col gap-2.5", className)}
      data-globe-home-memory-dock
    >
      {showResume && resume ? (
        <GlobeResumeContextCard
          session={resume}
          onResume={() => onResumeSession(resume)}
          onDismiss={dismissResume}
        />
      ) : null}
      {recallTriggers.length > 0 ? (
        <div className="rounded-[1.25rem] bg-white/90 px-1 py-2 shadow-[0_8px_28px_rgba(2,32,71,0.1)] ring-1 ring-black/[0.05] backdrop-blur-xl">
          <p className="mb-1 px-3 text-[11px] font-semibold text-muted-foreground">
            {copy.globe.memoryRecallEyebrow}
          </p>
          <CaptureSheetMemoryTriggerStage
            triggers={recallTriggers}
            onTriggerPress={onActivateTrigger}
            className="-mx-1"
          />
        </div>
      ) : null}
    </div>
  );
}
