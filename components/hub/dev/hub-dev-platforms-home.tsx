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
    <div className="min-h-dvh bg-[#f4f5f7] text-[#111827]">
      <header className="flex h-12 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
        <Link href="/" className="text-[14px] font-bold text-[#111827]">
          Rimvio
        </Link>
        <span className="text-[12px] text-[#9ca3af]">Rimvio Hub</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Rimvio Hub</h1>
        <p className="mt-2 text-[14px] text-[#6b7280]">
          서비스를 연결하면 Rimvio가 Agent-ready Capability로 자동 변환합니다.
        </p>

        <Link
          href="/hub/workspace?pane=ade"
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 px-6 py-8 text-center transition-colors hover:border-violet-300 hover:shadow-sm"
        >
          <Plus className="size-5 text-violet-600" />
          <span className="text-[15px] font-semibold text-violet-700">Add Platform</span>
        </Link>
        <p className="mt-2 text-center text-[11px] text-[#9ca3af]">
          GitHub · API · OpenAPI · MCP · Upload
        </p>

        <Link
          href="/hub/workspace?pane=ade&demo=osaka"
          className="mt-3 block text-center text-[12px] font-medium text-violet-600 hover:underline"
        >
          Try OsakaStay demo →
        </Link>

        <h2 className="mt-12 text-[13px] font-semibold uppercase tracking-wide text-[#9ca3af]">
          My Platforms
        </h2>

        {platforms.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[#d1d5db] bg-white p-8 text-center text-[13px] text-[#9ca3af]">
            아직 등록된 Platform이 없습니다. Add Platform으로 시작하세요.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {platforms.map(({ meta }) => (
              <Link
                key={meta.id}
                href={`/hub/workspace?platform=${encodeURIComponent(meta.id)}&pane=ade`}
                className="group flex items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md"
              >
                <div>
                  <p className="text-[16px] font-semibold text-[#111827]">
                    {meta.icon} {meta.name}
                  </p>
                  <p className="mt-1 text-[12px] text-[#6b7280]">{meta.tagline}</p>
                  <p className="mt-2 text-[11px] text-violet-600">
                    {meta.capabilityCount} capabilities discovered
                    {meta.status === "agent_ready" || meta.status === "published"
                      ? " · ✓ Agent Ready"
                      : ""}
                  </p>
                  {meta.agentUsage > 0 ? (
                    <p className="mt-1 text-[10px] text-[#9ca3af]">
                      Agent usage {meta.agentUsage.toLocaleString()} · Success{" "}
                      {meta.successRate.toFixed(1)}%
                    </p>
                  ) : null}
                </div>
                <span className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 opacity-0 group-hover:opacity-100">
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
