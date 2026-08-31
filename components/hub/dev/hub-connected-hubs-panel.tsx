"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connectRemoteHub,
  listConnectedHubs,
  scanRemoteHub,
  healthLabelKo,
  readCachedHubScan,
  type ConnectedHub,
} from "@/lib/hub/federation";
import { cn } from "@/lib/utils";

type HubConnectedHubsPanelProps = {
  readonly className?: string;
};

export function HubConnectedHubsPanel({ className }: HubConnectedHubsPanelProps) {
  const [hubs, setHubs] = useState<readonly ConnectedHub[]>([]);
  const [url, setUrl] = useState("shopping-hub.demo.rimvio.app");
  const [label, setLabel] = useState("Shopping Hub");
  const [connecting, setConnecting] = useState(false);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setHubs(listConnectedHubs());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("rimvio:federation-hubs-updated", onUpdate);
    return () => window.removeEventListener("rimvio:federation-hubs-updated", onUpdate);
  }, [refresh]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectRemoteHub({ hubUrl: url, label });
      refresh();
    } finally {
      setConnecting(false);
    }
  };

  const selectedScan = selectedHubId ? readCachedHubScan(selectedHubId) : null;

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      <div>
        <p className="text-[12px] font-semibold text-[#111827]">Connected Hubs</p>
        <p className="text-[11px] text-[#6b7280]">Partner Hub 연결 · Capability Discovery · Health</p>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
        <p className="mb-2 text-[11px] font-medium text-[#374151]">One-click Connect</p>
        <input
          className="mb-2 w-full rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-[11px]"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Hub URL"
        />
        <input
          className="mb-2 w-full rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-[11px]"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
        />
        <button
          type="button"
          disabled={connecting}
          onClick={() => void handleConnect()}
          className="w-full rounded-lg bg-[#111827] px-3 py-2 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "다른 Hub 연결"}
        </button>
      </div>

      <ul className="space-y-2">
        {hubs.length === 0 ? (
          <li className="text-[11px] text-[#9ca3af]">연결된 Hub 없음</li>
        ) : (
          hubs.map((hub) => (
            <li key={hub.hubId}>
              <button
                type="button"
                onClick={() => {
                  setSelectedHubId(hub.hubId);
                  void scanRemoteHub(hub);
                }}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left shadow-sm",
                  selectedHubId === hub.hubId ? "border-[#111827] bg-[#f9fafb]" : "border-[#e5e7eb] bg-white",
                )}
              >
                <p className="text-[12px] font-medium text-[#111827]">{hub.label}</p>
                <p className="text-[10px] text-[#6b7280]">{hub.baseUrl}</p>
                <p className="mt-1 text-[10px] text-[#9ca3af]">{hub.detailKo}</p>
              </button>
            </li>
          ))
        )}
      </ul>

      {selectedScan ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3">
          <p className="mb-2 text-[11px] font-semibold text-[#111827]">
            {selectedScan.hub.label} — {selectedScan.capabilities.length} capabilities
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-[10px]">
            {selectedScan.capabilities.map((cap) => (
              <li key={`${cap.hubId}-${cap.capabilityId}`} className="flex justify-between text-[#374151]">
                <span>{cap.capabilityId}</span>
                <span className="text-[#6b7280]">{healthLabelKo(cap.health)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-[#6b7280]">
            Allowed: {selectedScan.permissions.filter((p) => p.allowed).length} · Denied:{" "}
            {selectedScan.permissions.filter((p) => !p.allowed).length}
          </p>
        </div>
      ) : null}
    </div>
  );
}
