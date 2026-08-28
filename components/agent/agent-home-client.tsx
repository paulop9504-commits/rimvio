"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { AgentHomeDashboard } from "@/components/agent/agent-home-dashboard";
import { AgentHomeInspector } from "@/components/agent/agent-home-inspector";
import { AgentHomeSidebar } from "@/components/agent/agent-home-sidebar";
import { AgentHomeThemeProvider, useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { ContextWorkspaceShell } from "@/components/context-workspace/context-workspace-shell";
import { GlobeChatScreen } from "@/components/globe/chat/globe-chat-screen";
import { GlobeSettingsSheet } from "@/components/globe/globe-settings-sheet";
import { GlobeHomeClient } from "@/components/globe/globe-home-client";
import { AppShell } from "@/components/app-shell";
import type { GlobeContextIngestBarHandle } from "@/components/globe/globe-context-ingest-bar";
import { copy } from "@/lib/copy/human-ko";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  ensureGlobeChatGraphId,
  readGlobeChatGraphId,
} from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import { resetGlobeComposeChatSession } from "@/lib/portal/reset-globe-compose-chat";
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import type { AgentHomeModeId } from "@/lib/agent/agent-home-tokens";
import {
  clearAgentHomeFieldSearchParams,
  parseAgentHomeFieldIngressFromSearchParams,
} from "@/lib/agent/agent-home-ingress";
import { openFieldDashboardIngressForced } from "@/lib/nav/field-dashboard-ingress";
import { cn } from "@/lib/utils";

const GRAPH_STORAGE_KEY = "rimvio.globe-chat.graph-id.v1";

type HomeView = "dashboard" | "chat";

function AgentHomeMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent")?.trim() || null;
  const { layerMode } = useGlobeLayerMode();
  const { theme, tokens } = useAgentHomeThemeContext();
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [view, setView] = useState<HomeView>(recallEventId ? "chat" : "dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingCompose, setPendingCompose] = useState<string | null>(null);
  const ingestRef = useRef<GlobeContextIngestBarHandle | null>(null);

  const contextEventId = recallEventId;
  const activeEvent = useMemo(
    () => (contextEventId ? findLifeEventCandidate(contextEventId) : null),
    [contextEventId],
  );

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(window.location.search);
      mutate(params);
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/");
    },
    [router],
  );

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      replaceSearchParams((params) => {
        params.set("recallEvent", eventId);
      });
      setView("chat");
    },
    [replaceSearchParams],
  );

  const handleNewTask = useCallback(() => {
    const graphId = readGlobeChatGraphId();
    if (graphId) {
      resetGlobeComposeChatSession(graphId);
    }
    try {
      sessionStorage.removeItem(GRAPH_STORAGE_KEY);
    } catch {
      // session unavailable
    }
    ensureGlobeChatGraphId();
    replaceSearchParams((params) => {
      params.delete("recallEvent");
    });
    setChatSessionKey((value) => value + 1);
    setView("dashboard");
  }, [replaceSearchParams]);

  const handleAttached = useCallback(
    (eventId: string) => {
      replaceSearchParams((params) => {
        if (params.get("recallEvent") !== eventId) {
          params.set("recallEvent", eventId);
        }
      });
      setView("chat");
    },
    [replaceSearchParams],
  );

  const handleDashboardSubmit = useCallback((text: string, _mode: AgentHomeModeId) => {
    setPendingCompose(text);
    setView("chat");
  }, []);

  useEffect(() => {
    if (view !== "chat" || !pendingCompose?.trim()) {
      return;
    }
    const timer = window.setTimeout(() => {
      void ingestRef.current?.submitComposerText(pendingCompose);
      setPendingCompose(null);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [pendingCompose, view]);

  const handleTravelCompose = useCallback(
    (seedText: string) => {
      handleDashboardSubmit(seedText, "auto");
    },
    [handleDashboardSubmit],
  );

  useEffect(() => {
    const ingress = parseAgentHomeFieldIngressFromSearchParams(searchParams);
    if (!ingress) {
      return;
    }
    openFieldDashboardIngressForced(ingress);
    const params = new URLSearchParams(window.location.search);
    clearAgentHomeFieldSearchParams(params);
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [searchParams]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handleNewTask();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewTask]);

  useEffect(() => {
    if (recallEventId) {
      setView("chat");
    }
  }, [recallEventId]);

  return (
    <>
      <div
        className={cn("flex h-full min-h-0 w-full min-w-0 flex-1", tokens.root)}
        data-surface="agent-home"
        data-agent-home-theme={theme}
      >
        <AgentHomeSidebar
          activeEventId={contextEventId}
          onSelectEvent={handleSelectEvent}
          onNewTask={handleNewTask}
          onGoHome={() => setView("dashboard")}
          onOpenSettings={() => setSettingsOpen(true)}
          view={view}
        />

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "flex items-center justify-between border-b px-3 py-2 md:hidden",
              tokens.panelBorder,
              tokens.panel,
            )}
          >
            {view === "chat" ? (
              <button
                type="button"
                onClick={() => setView("dashboard")}
                className={cn(
                  "flex items-center gap-1 text-[12px] font-medium",
                  tokens.textMuted,
                )}
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {copy.globe.agentHomeBackToDashboard}
              </button>
            ) : (
              <div className="min-w-0">
                <p className={cn("truncate text-[14px] font-semibold", tokens.text)}>
                  {copy.globe.agentHomeTitle}
                </p>
                <p className={cn("truncate text-[11px]", tokens.textSubtle)}>
                  {copy.globe.agentHomeSubtitle}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={handleNewTask}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full shadow-sm",
                tokens.accent,
              )}
              aria-label={copy.globe.agentHomeNewTask}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            {view === "dashboard" ? (
              <AgentHomeDashboard
                onSubmit={handleDashboardSubmit}
                onSelectEvent={handleSelectEvent}
                activeEventId={contextEventId}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : (
              <GlobeChatScreen
                key={chatSessionKey}
                variant="page"
                pageChrome="minimal"
                ingestBarRef={ingestRef}
                open
                onClose={() => setView("dashboard")}
                ingest={{
                  targetEventId: contextEventId,
                  targetTitle: activeEvent?.title?.trim() || null,
                  forceAttachToTarget: false,
                  onAttached: handleAttached,
                  layerMode,
                  onIngressConvergeAttachFocus: handleSelectEvent,
                }}
              />
            )}
          </div>
        </div>

        <AgentHomeInspector
          activeEventId={contextEventId}
          onTravelCompose={handleTravelCompose}
        />

        <ContextWorkspaceShell
          contextEventId={contextEventId}
          projectTitleKo={activeEvent?.title?.trim() || null}
        />
      </div>

      <GlobeSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

/** Home route — agent-first 2D UI; `?surface=globe` keeps legacy 3D globe. */
export function AgentHomeRoute() {
  const searchParams = useSearchParams();
  const isLegacyGlobe = searchParams.get("surface") === "globe";

  if (isLegacyGlobe) {
    return (
      <AppShell title="지구" hideBranding immersive hideTitle globeHome>
        <GlobeHomeClient />
      </AppShell>
    );
  }

  return (
    <AgentHomeThemeProvider>
      <div
        className="fixed inset-0 z-[1] flex flex-col overflow-hidden bg-[#f8fafc]"
        data-agent-home-root
      >
        <AgentHomeMain />
      </div>
    </AgentHomeThemeProvider>
  );
}
