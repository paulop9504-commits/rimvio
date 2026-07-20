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
import { GlobeInstantCarryFeed } from "@/components/globe/globe-instant-carry-feed";
import { GlobeMemoryRecallToggle } from "@/components/globe/globe-memory-recall-toggle";
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

export { useMemoryRecallContext };

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
  const [hydrated, setHydrated] = useState(false);
  const [resume, setResume] = useState<GlobeResumeSession | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [composeFocused, setComposeFocused] = useState(false);
  const [globeDismissed, setGlobeDismissed] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }
    // After mount only  listLifeEventCandidates() reads localStorage and
    // caused React #418 when hasContent flipped SSR empty ? client filled.
    setHydrated(true);
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
    if (!hydrated || !enabled || layerMode === "discovery") {
      return [];
    }
    void revision;
    return resolveGlobeContextTriggers({
      events: listLifeEventCandidates(),
      layerMode,
      limit: 12,
    }).filter((row) => row.mediaPreviews?.length || row.kind === "time_recall");
  }, [enabled, hydrated, layerMode, revision]);

  const showResume = useMemo(() => {
    if (!hydrated || !resume?.eventId?.trim()) {
      return false;
    }
    if (resume.kind === "photo") {
      return false;
    }
    if (activeEventId?.trim() === resume.eventId.trim()) {
      return false;
    }
    return Boolean(findLifeEventCandidate(resume.eventId));
  }, [activeEventId, hydrated, resume]);

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
            <GlobeInstantCarryFeed
              showResume={ctx.showResume}
              resume={ctx.resume}
              triggers={ctx.recallTriggers}
              onResumeSession={ctx.onResumeSession}
              onDismissResume={ctx.dismissResume}
              onActivateTrigger={ctx.onActivateTrigger}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Floor 1 recall line — visible when panel collapsed (not buried behind toggle). */
export function GlobeHomeRecallOneLiner({ className }: { className?: string }) {
  const ctx = useMemoryRecallContext();
  if (!ctx?.hasContent || ctx.panelOpen) {
    return null;
  }

  const isContinuity = Boolean(ctx.showResume && ctx.resume);
  const line = isContinuity
    ? ctx.resume!.title?.trim() || ctx.resume!.placeLabel?.trim() || copy.globe.resumeContextCta
    : ctx.recallTriggers[0]?.body?.trim() ||
      ctx.recallTriggers[0]?.title?.trim() ||
      null;
  const eyebrow = isContinuity
    ? copy.globe.instantCarryContinuityEyebrow
    : copy.globe.memoryRecallEyebrow;

  if (!line) {
    return null;
  }

  const activate = () => {
    if (isContinuity && ctx.resume) {
      ctx.onResumeSession(ctx.resume);
      return;
    }
    const trigger = ctx.recallTriggers[0];
    if (trigger) {
      ctx.onActivateTrigger(trigger);
    }
  };

  return (
    <button
      type="button"
      onClick={activate}
      className={cn(
        "pointer-events-auto max-w-[min(100%,18rem)] truncate rounded-full bg-white/92 px-3 py-1.5 text-left text-[12px] font-semibold text-foreground shadow-[0_4px_14px_rgba(2,32,71,0.1)] ring-1 ring-black/[0.06] backdrop-blur-md active:scale-[0.98]",
        className,
      )}
      data-globe-home-recall-one-liner
      aria-label={`${eyebrow}: ${line}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </span>
      <span className="ml-1.5 text-foreground">{copy.globe.homeRecallOneLiner(line)}</span>
    </button>
  );
}

/** Pill — left-aligned above prompt, same column as the + button. */
export function GlobeHomeMemoryRecallToggleAnchor({
  className,
  embedded = false,
}: {
  className?: string;
  embedded?: boolean;
}) {
  const ctx = useMemoryRecallContext();
  if (!ctx?.hasContent) {
    return null;
  }
  return (
    <div
      className={cn(
        embedded ? "pointer-events-auto" : "pointer-events-auto flex w-full justify-start px-2 pb-1",
        className,
      )}
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
