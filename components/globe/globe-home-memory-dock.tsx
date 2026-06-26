"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaptureSheetMemoryTriggerStage } from "@/components/globe/capture-sheet-memory-trigger-stage";
import { GlobeMemoryRecallToggle } from "@/components/globe/globe-memory-recall-toggle";
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

type MemoryRecallContextValue = {
  hasContent: boolean;
  panelOpen: boolean;
  onToggle: () => void;
  showResume: boolean;
  resume: GlobeResumeSession | null;
  recallTriggers: readonly GlobeContextTrigger[];
  dismissResume: () => void;
  onActivateTrigger: (trigger: GlobeContextTrigger) => void;
  onResumeSession: (session: GlobeResumeSession) => void;
};

const MemoryRecallContext = createContext<MemoryRecallContextValue | null>(null);

function useMemoryRecallContext() {
  const ctx = useContext(MemoryRecallContext);
  if (!ctx) {
    return null;
  }
  return ctx;
}

export type GlobeHomeMemoryRecallProviderProps = {
  enabled: boolean;
  layerMode: GlobeLayerMode;
  activeEventId?: string | null;
  globeDismissToken?: number;
  registerComposeHandlers?: (handlers: {
    onFocus: () => void;
    onBlur: () => void;
  }) => void;
  onActivateTrigger: (trigger: GlobeContextTrigger) => void;
  onResumeSession: (session: GlobeResumeSession) => void;
  children: ReactNode;
};

export function GlobeHomeMemoryRecallProvider({
  enabled,
  layerMode,
  activeEventId,
  globeDismissToken = 0,
  registerComposeHandlers,
  onActivateTrigger,
  onResumeSession,
  children,
}: GlobeHomeMemoryRecallProviderProps) {
  const [revision, setRevision] = useState(0);
  const [resume, setResume] = useState<GlobeResumeSession | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [composeFocused, setComposeFocused] = useState(false);
  const [globeDismissed, setGlobeDismissed] = useState(false);

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

  useEffect(() => {
    if (globeDismissToken <= 0) {
      return;
    }
    setPinnedOpen(false);
    setGlobeDismissed(true);
  }, [globeDismissToken]);

  const onComposeFocus = useCallback(() => {
    setComposeFocused(true);
    setGlobeDismissed(false);
  }, []);

  const onComposeBlur = useCallback(() => {
    setComposeFocused(false);
  }, []);

  useEffect(() => {
    registerComposeHandlers?.({ onFocus: onComposeFocus, onBlur: onComposeBlur });
  }, [onComposeBlur, onComposeFocus, registerComposeHandlers]);

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

  const hasContent = showResume || recallTriggers.length > 0;
  const panelOpen = hasContent && (pinnedOpen || composeFocused) && !globeDismissed;

  const onToggle = useCallback(() => {
    setGlobeDismissed(false);
    setPinnedOpen((open) => !open);
  }, []);

  const value = useMemo<MemoryRecallContextValue>(
    () => ({
      hasContent,
      panelOpen,
      onToggle,
      showResume,
      resume,
      recallTriggers,
      dismissResume,
      onActivateTrigger,
      onResumeSession,
    }),
    [
      dismissResume,
      hasContent,
      onActivateTrigger,
      onResumeSession,
      onToggle,
      panelOpen,
      recallTriggers,
      resume,
      showResume,
    ],
  );

  if (!enabled || layerMode === "discovery" || !hasContent) {
    return <>{children}</>;
  }

  return (
    <MemoryRecallContext.Provider value={value}>{children}</MemoryRecallContext.Provider>
  );
}

export function GlobeHomeMemoryRecallPanel({ className }: { className?: string }) {
  const ctx = useMemoryRecallContext();
  if (!ctx?.hasContent) {
    return null;
  }

  return (
    <div className={cn("pointer-events-auto w-full", className)} data-globe-home-memory-dock-panel>
      <AnimatePresence initial={false}>
        {ctx.panelOpen ? (
          <motion.div
            key="memory-recall-panel"
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 6, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex w-full flex-col gap-2">
              {ctx.showResume && ctx.resume ? (
                <GlobeResumeContextCard
                  session={ctx.resume}
                  onResume={() => ctx.onResumeSession(ctx.resume!)}
                  onDismiss={ctx.dismissResume}
                />
              ) : null}
              {ctx.recallTriggers.length > 0 ? (
                <div className="rounded-[1.1rem] bg-white/90 px-1 py-1.5 shadow-[0_6px_20px_rgba(2,32,71,0.08)] ring-1 ring-black/[0.05] backdrop-blur-xl">
                  <p className="mb-0.5 px-2.5 text-[10px] font-semibold text-muted-foreground">
                    {copy.globe.memoryRecallEyebrow}
                  </p>
                  <CaptureSheetMemoryTriggerStage
                    triggers={ctx.recallTriggers}
                    onTriggerPress={ctx.onActivateTrigger}
                    compact
                    className="-mx-1"
                  />
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Pill — right-aligned directly above the prompt bar. */
export function GlobeHomeMemoryRecallToggleAnchor({ className }: { className?: string }) {
  const ctx = useMemoryRecallContext();
  if (!ctx?.hasContent) {
    return null;
  }
  return (
    <div
      className={cn("pointer-events-auto flex w-full justify-end pb-1", className)}
      data-globe-home-memory-dock-toggle
    >
      <GlobeMemoryRecallToggle open={ctx.panelOpen} onToggle={ctx.onToggle} />
    </div>
  );
}

/** Back-compat wrapper — prefer Provider + Panel + ToggleAnchor. */
export type GlobeHomeMemoryDockProps = Omit<GlobeHomeMemoryRecallProviderProps, "children"> & {
  className?: string;
};

export function GlobeHomeMemoryDock(props: GlobeHomeMemoryDockProps) {
  const { className, ...providerProps } = props;
  return (
    <GlobeHomeMemoryRecallProvider {...providerProps}>
      <div className={cn("flex w-full flex-col items-end gap-1.5", className)} data-globe-home-memory-dock>
        <GlobeHomeMemoryRecallPanel />
        <GlobeHomeMemoryRecallToggleAnchor />
      </div>
    </GlobeHomeMemoryRecallProvider>
  );
}
