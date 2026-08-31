"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AgentHomeTopbar } from "@/components/agent/agent-home-topbar";
import { AgentHomeDashboard } from "@/components/agent/agent-home-dashboard";
import { AgentHomeSidebar } from "@/components/agent/agent-home-sidebar";
import { AgentHomeThemeProvider, useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { ContextWorkspaceShell } from "@/components/context-workspace/context-workspace-shell";
import { GlobeChatScreen } from "@/components/globe/chat/globe-chat-screen";
import {
  readContextWorkspaceExpanded,
  subscribeContextWorkspaceUpdated,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { subscribeContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCompose, setPendingCompose] = useState<string | null>(null);
  const [composerSeed, setComposerSeed] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [wideLayout, setWideLayout] = useState(false);
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
    if (contextEventId) {
      writeContextWorkspaceExpanded(contextEventId, false);
    }
    setWorkspaceOpen(false);
    setSidebarOpen(false);
    setView("dashboard");
  }, [replaceSearchParams, contextEventId]);

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
    setComposerSeed("");
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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setWideLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const unsubExpand = subscribeContextWorkspaceExpand((detail) => {
      setWorkspaceOpen(true);
      setView("chat");
      handleSelectEvent(detail.contextEventId);
    });
    const unsubUpdate = subscribeContextWorkspaceUpdated((eventId) => {
      if (eventId === contextEventId) {
        setWorkspaceOpen(readContextWorkspaceExpanded(eventId));
      }
    });
    if (contextEventId) {
      setWorkspaceOpen(readContextWorkspaceExpanded(contextEventId));
    }
    return () => {
      unsubExpand();
      unsubUpdate();
    };
  }, [contextEventId, handleSelectEvent]);

  const splitWorkspace = view === "chat" && workspaceOpen && wideLayout;

  const chatScreen = (
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
  );

  const goHome = useCallback(() => {
    if (contextEventId) {
      writeContextWorkspaceExpanded(contextEventId, false);
    }
    setWorkspaceOpen(false);
    setSidebarOpen(false);
    setView("dashboard");
  }, [contextEventId]);

  return (
    <>
      <div
        className={cn("flex h-full min-h-0 w-full min-w-0 flex-1", tokens.root)}
        data-surface="agent-home"
        data-agent-home-theme={theme}
        data-workspace-split={splitWorkspace ? "true" : "false"}
      >
        <AgentHomeSidebar
          activeEventId={contextEventId}
          onSelectEvent={handleSelectEvent}
          onNewTask={handleNewTask}
          onGoHome={goHome}
          onOpenSettings={() => setSettingsOpen(true)}
          view={view}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <AgentHomeTopbar
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
            title={view === "chat" ? activeEvent?.title : copy.brand.name}
          />

          <div className="relative flex min-h-0 min-w-0 flex-1">
            {view === "dashboard" ? (
              <AgentHomeDashboard
                key={composerSeed}
                initialDraft={composerSeed}
                onSubmit={handleDashboardSubmit}
                onSelectEvent={handleSelectEvent}
                activeEventId={contextEventId}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : splitWorkspace ? (
              <>
                <div className="flex min-h-0 w-[min(42%,440px)] min-w-[260px] shrink-0 flex-col border-r border-black/[0.06]">
                  {chatScreen}
                </div>
                <div className="min-h-0 min-w-0 flex-1">
                  <ContextWorkspaceShell
                    contextEventId={contextEventId}
                    projectTitleKo={activeEvent?.title?.trim() || null}
                    layout="pane"
                  />
                </div>
              </>
            ) : (
              chatScreen
            )}
          </div>
        </div>

        {splitWorkspace ? null : (
          <ContextWorkspaceShell
            contextEventId={contextEventId}
            projectTitleKo={activeEvent?.title?.trim() || null}
            layout="overlay"
          />
        )}
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
        className="fixed inset-0 z-[1] flex flex-col overflow-hidden bg-white"
        data-agent-home-root
      >
        <AgentHomeMain />
      </div>
    </AgentHomeThemeProvider>
  );
}
