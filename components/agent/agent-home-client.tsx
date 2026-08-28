"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { AgentHomeSidebar } from "@/components/agent/agent-home-sidebar";
import { ContextWorkspaceShell } from "@/components/context-workspace/context-workspace-shell";
import { GlobeChatScreen } from "@/components/globe/chat/globe-chat-screen";
import { GlobeHomeClient } from "@/components/globe/globe-home-client";
import { AppShell } from "@/components/app-shell";
import { copy } from "@/lib/copy/human-ko";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  ensureGlobeChatGraphId,
  readGlobeChatGraphId,
} from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import { resetGlobeComposeChatSession } from "@/lib/portal/reset-globe-compose-chat";
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import { cn } from "@/lib/utils";

const GRAPH_STORAGE_KEY = "rimvio.globe-chat.graph-id.v1";

function AgentHomeMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent")?.trim() || null;
  const { layerMode } = useGlobeLayerMode();
  const [chatSessionKey, setChatSessionKey] = useState(0);

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
  }, [replaceSearchParams]);

  const handleAttached = useCallback(
    (eventId: string) => {
      replaceSearchParams((params) => {
        if (params.get("recallEvent") !== eventId) {
          params.set("recallEvent", eventId);
        }
      });
    },
    [replaceSearchParams],
  );

  return (
    <div
      className="flex h-full min-h-0 flex-1 bg-[#f7f8fa]"
      data-surface="agent-home"
    >
      <AgentHomeSidebar
        activeEventId={contextEventId}
        onSelectEvent={handleSelectEvent}
        onNewTask={handleNewTask}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white/90 px-3 py-2 md:hidden">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#191f28]">
              {copy.globe.agentHomeTitle}
            </p>
            <p className="truncate text-[11px] text-[#8b95a1]">
              {copy.globe.agentHomeSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewTask}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              "bg-[#191f28] text-white shadow-sm",
            )}
            aria-label={copy.globe.agentHomeNewTask}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        <GlobeChatScreen
          key={chatSessionKey}
          variant="page"
          open
          onClose={() => {}}
          ingest={{
            targetEventId: contextEventId,
            targetTitle: activeEvent?.title?.trim() || null,
            forceAttachToTarget: false,
            onAttached: handleAttached,
            layerMode,
            onIngressConvergeAttachFocus: handleSelectEvent,
          }}
        />
      </div>

      <ContextWorkspaceShell
        contextEventId={contextEventId}
        projectTitleKo={activeEvent?.title?.trim() || null}
      />
    </div>
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
    <AppShell
      title={copy.globe.agentHomeTitle}
      hideBranding
      hideTitle
      compact
      fullBleed
      iosSurface
    >
      <AgentHomeMain />
    </AppShell>
  );
}
