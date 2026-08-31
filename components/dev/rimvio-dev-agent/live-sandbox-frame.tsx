"use client";

import type { DevAgentRuntime } from "@/lib/dev/rimvio-dev-agent/use-dev-agent-runtime";
import { OsakaStaySandbox } from "./osakastay-sandbox";

export function LiveSandboxFrame({ runtime }: { runtime: DevAgentRuntime }) {
  const showScreenshot = Boolean(runtime.latestScreenshot);

  return (
    <div className="relative min-h-[360px] bg-white">
      {runtime.currentAction ? (
        <div className="absolute left-4 right-4 top-4 z-20 rounded-[10px] bg-[#6b4cff]/90 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          ● Agent is working · {runtime.currentAction}
        </div>
      ) : null}

      {showScreenshot ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={runtime.latestScreenshot ?? ""}
            alt="Live sandbox browser"
            className="block w-full object-contain object-top"
          />
          {runtime.agentCursor.visible ? (
            <>
              <div
                className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#6b4cff] bg-white shadow-[0_0_0_4px_rgba(107,76,255,0.25)]"
                style={{
                  left: `${runtime.agentCursor.x}%`,
                  top: `${runtime.agentCursor.y}%`,
                }}
              />
              {runtime.agentCursor.targetSelector ? (
                <div
                  className="pointer-events-none absolute z-[9] rounded-md border-2 border-[#ff9500]/80 bg-[#ff9500]/10"
                  style={{
                    left: `${Math.max(runtime.agentCursor.x - 8, 4)}%`,
                    top: `${Math.max(runtime.agentCursor.y - 4, 8)}%`,
                    width: "16%",
                    height: "6%",
                  }}
                />
              ) : null}
              <div
                className="pointer-events-none absolute z-10 rounded-md bg-[#1d1d1f]/85 px-2 py-1 text-[10px] font-medium text-white"
                style={{
                  left: `${Math.min(runtime.agentCursor.x + 2, 78)}%`,
                  top: `${runtime.agentCursor.y + 4}%`,
                }}
              >
                {runtime.agentCursor.label}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <OsakaStaySandbox runtime={runtime} />
      )}
    </div>
  );
}
