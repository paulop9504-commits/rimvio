"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import {
  readHubConnectionProfile,
  readHubDevConnections,
  setHubDevConnection,
  HUB_CONNECTIONS_UPDATED_EVENT,
  type HubDevConnectionId,
} from "@/lib/hub/dev/hub-connection-store";
import {
  connectHubOAuthProvider,
  connectedParamForProvider,
  providerLabel,
} from "@/lib/hub/dev/hub-oauth-connect";
import { INTEGRATION_PROVIDERS } from "@/lib/hub/dev/hub-connect-provider";
import {
  disconnectHubProviderOnServer,
  syncHubConnectionsFromServer,
} from "@/lib/hub/dev/hub-connection-client-sync";
import { HubDevOAuthConnectSheet } from "@/components/hub/dev/hub-dev-oauth-connect-sheet";
import { cn } from "@/lib/utils";

type HubDevConnectionsPanelProps = {
  readonly platformId?: string;
  readonly onConnected?: (provider: HubPlatformProviderId) => void;
  readonly className?: string;
};

const ICONS: Partial<Record<HubPlatformProviderId, React.ReactNode>> = {
  github: <span className="text-[11px] font-bold">GH</span>,
  vercel: <span className="text-[11px] font-bold">▲</span>,
  supabase: <span className="text-[11px] font-bold text-emerald-600">S</span>,
  stripe: <span className="text-[11px] font-bold text-violet-600">S</span>,
  openai: <span className="text-[11px] font-bold">AI</span>,
};

/** Cursor-style Integrations panel — GitHub · Vercel · Supabase · Stripe. */
export function HubDevConnectionsPanel({
  platformId,
  onConnected,
  className,
}: HubDevConnectionsPanelProps) {
  const [connections, setConnections] = useState(readHubDevConnections());
  const [connecting, setConnecting] = useState<HubPlatformProviderId | null>(null);
  const [sheetProvider, setSheetProvider] = useState<HubPlatformProviderId | null>(null);

  const refresh = useCallback(() => setConnections(readHubDevConnections()), []);

  useEffect(() => {
    refresh();
    void syncHubConnectionsFromServer().then(() => refresh());
    const handler = () => refresh();
    window.addEventListener(HUB_CONNECTIONS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(HUB_CONNECTIONS_UPDATED_EVENT, handler);
  }, [refresh]);

  const handleConnect = async (provider: HubPlatformProviderId) => {
    setConnecting(provider);
    const connectedParam = connectedParamForProvider(provider) ?? `${provider}_connected`;
    const returnPath = platformId
      ? `/hub/workspace?platform=${encodeURIComponent(platformId)}&${connectedParam}=1`
      : `/hub/workspace?${connectedParam}=1`;

    const result = await connectHubOAuthProvider({ provider, returnPath, platformId });
    setConnecting(null);

    if (result.ok && result.mode === "login") {
      setSheetProvider(provider);
      return;
    }
  };

  const handleDisconnect = async (id: HubDevConnectionId) => {
    if (id === "github" || id === "vercel" || id === "supabase" || id === "stripe") {
      try {
        await disconnectHubProviderOnServer(id);
        await syncHubConnectionsFromServer();
      } catch {
        setHubDevConnection(id, false);
      }
    } else {
      setHubDevConnection(id, false);
    }
    refresh();
  };

  return (
    <>
      <div className={cn("rounded-xl border border-[#e5e7eb] bg-white shadow-sm", className)}>
        <div className="border-b border-[#f3f4f6] px-3 py-2">
          <p className="text-[11px] font-semibold text-[#111827]">Integrations</p>
          <p className="text-[10px] text-[#6b7280]">Google 로그인 후 live OAuth로 연결 · Agent가 서버 토큰 사용</p>
        </div>
        <ul className="divide-y divide-[#f3f4f6]">
          {INTEGRATION_PROVIDERS.map((provider) => {
            const connected = connections[provider as HubDevConnectionId];
            const profile = readHubConnectionProfile(provider as HubDevConnectionId);
            const busy = connecting === provider;

            return (
              <li key={provider} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#fafafa] text-[#374151]">
                  {ICONS[provider]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#111827]">{providerLabel(provider)}</p>
                  <p className="truncate text-[10px] text-[#9ca3af]">
                    {connected
                      ? profile?.accountLabel ?? "Connected"
                      : "Not connected · live OAuth"}
                  </p>
                </div>
                {connected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                      <Check className="size-3" /> Connected
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(provider as HubDevConnectionId)}
                      className="text-[10px] text-[#9ca3af] hover:text-red-600"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConnect(provider)}
                    className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1 text-[10px] font-semibold text-[#374151] hover:bg-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3 animate-spin" /> : <ExternalLink className="size-3" />}
                    Connect
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {sheetProvider ? (
        <HubDevOAuthConnectSheet
          provider={sheetProvider}
          open={Boolean(sheetProvider)}
          onClose={() => setSheetProvider(null)}
          onConnected={(p) => {
            refresh();
            onConnected?.(p);
          }}
          returnPath={
            platformId
              ? `/hub/workspace?platform=${encodeURIComponent(platformId)}`
              : "/hub/workspace"
          }
        />
      ) : null}
    </>
  );
}
