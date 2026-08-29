"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import {
  readPlatformRegistry,
  subscribePlatformRegistry,
  type StoredPlatform,
} from "@/lib/hub/dev/platform-registry";

export function HubDevPlatformsHome() {
  const [platforms, setPlatforms] = useState<readonly StoredPlatform[]>([]);

  useEffect(() => {
    setPlatforms(readPlatformRegistry());
    return subscribePlatformRegistry(() => setPlatforms(readPlatformRegistry()));
  }, []);

  return (
    <div className="min-h-dvh bg-[#0c0e12] text-[#f2f4f6]">
      <header className="flex h-12 items-center justify-between border-b border-white/[0.06] px-6">
        <Link href="/" className="text-[14px] font-bold">
          Rimvio
        </Link>
        <span className="text-[12px] text-[#6b7684]">Rimvio Hub</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-[28px] font-bold tracking-tight">Rimvio Hub</h1>
        <p className="mt-2 text-[14px] text-[#6b7684]">
          서비스를 연결하면 Rimvio가 Agent-ready Capability로 자동 변환합니다.
        </p>

        <Link
          href="/hub/workspace?pane=ade"
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-[#4593fc]/40 bg-gradient-to-br from-[#4593fc]/10 to-[#6366f1]/5 px-6 py-8 text-center transition-colors hover:border-[#4593fc]/60"
        >
          <Plus className="size-5 text-[#8ec0ff]" />
          <span className="text-[15px] font-semibold text-[#8ec0ff]">Add Platform</span>
        </Link>
        <p className="mt-2 text-center text-[11px] text-[#6b7684]">
          GitHub · API · OpenAPI · MCP · Upload
        </p>

        <h2 className="mt-12 text-[13px] font-semibold uppercase tracking-wide text-[#6b7684]">
          My Platforms
        </h2>

        {platforms.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-[13px] text-[#6b7684]">
            아직 등록된 Platform이 없습니다. Add Platform으로 시작하세요.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {platforms.map(({ meta }) => (
              <Link
                key={meta.id}
                href={`/hub/workspace?platform=${encodeURIComponent(meta.id)}&pane=ade`}
                className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#151820] p-5 hover:border-[#4593fc]/30"
              >
                <div>
                  <p className="text-[16px] font-semibold">
                    {meta.icon} {meta.name}
                  </p>
                  <p className="mt-1 text-[12px] text-[#6b7684]">{meta.tagline}</p>
                  <p className="mt-2 text-[11px] text-[#8ec0ff]">
                    {meta.capabilityCount} capabilities discovered
                    {meta.status === "agent_ready" || meta.status === "published"
                      ? " · ✓ Agent Ready"
                      : ""}
                  </p>
                  {meta.agentUsage > 0 ? (
                    <p className="mt-1 text-[10px] text-[#6b7684]">
                      Agent usage {meta.agentUsage.toLocaleString()} · Success{" "}
                      {meta.successRate.toFixed(1)}%
                    </p>
                  ) : null}
                </div>
                <span className="flex items-center gap-1 text-[12px] font-semibold text-[#8ec0ff] opacity-0 group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
