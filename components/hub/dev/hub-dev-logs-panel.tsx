"use client";

import { useEffect, useMemo, useState } from "react";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import {
  readDevExecutionLogForPlatform,
  subscribeDevExecutionLog,
} from "@/lib/hub/dev/execution-log";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevLogsPanelProps = {
  draft: PlatformDraft;
};

export function HubDevLogsPanel({ draft }: HubDevLogsPanelProps) {
  const [, bump] = useState(0);
  const platformId = useMemo(
    () => capabilityDraftToPlatformManifest(draft).package.id,
    [draft],
  );

  useEffect(() => subscribeDevExecutionLog(() => bump((n) => n + 1)), []);

  const logs = readDevExecutionLogForPlatform(platformId).slice().reverse();

  return (
    <div className="flex h-full min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#0c0e12] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Logs</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#f2f4f6]">Execution Trace</h2>
        <p className="mt-1 text-[12px] text-[#6b7684]">
          Preview · Simulation · Publish events — stored locally in this browser.
        </p>

        {logs.length === 0 ? (
          <p className="mt-8 text-[12px] text-[#6b7684]">
            아직 로그가 없습니다. Live Preview Search 또는 Agent Simulation을 실행하세요.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-white/[0.06] bg-[#151820] px-4 py-3 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("font-semibold", log.ok ? "text-emerald-400" : "text-red-400")}>
                    {log.ok ? "✓" : "✗"} {log.source}
                  </span>
                  <span className="text-[#6b7684]">
                    {new Date(log.atIso).toLocaleTimeString()}
                    {log.durationMs != null ? ` · ${log.durationMs}ms` : ""}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[#8ec0ff]">
                  {log.capabilityId ?? log.detail}
                </p>
                <p className="mt-1 text-[#6b7684]">{log.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
