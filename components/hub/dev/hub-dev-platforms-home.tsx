"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import {
  readPlatformRegistry,
  subscribePlatformRegistry,
  type StoredPlatform,
} from "@/lib/hub/dev/platform-registry";
import { Suspense } from "react";
import { HubDevCreatePlatform } from "@/components/hub/dev/hub-dev-create-platform";

export function HubDevPlatformsHome() {
  const [platforms, setPlatforms] = useState<readonly StoredPlatform[] | null>(null);

  useEffect(() => {
    setPlatforms(readPlatformRegistry());
    return subscribePlatformRegistry(() => setPlatforms(readPlatformRegistry()));
  }, []);

  if (platforms === null) {
    return <div className="min-h-dvh bg-[#0c0e12]" />;
  }

  if (platforms.length === 0) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-[#0c0e12]" />}>
        <HubDevCreatePlatform />
      </Suspense>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f4f5f7] text-[#111827]">
      <header className="flex h-12 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
        <Link href="/" className="text-[14px] font-bold text-[#111827]">
          Rimvio
        </Link>
        <Link
          href="/hub/create"
          className="text-[12px] font-semibold text-violet-600 hover:underline"
        >
          Create Experience
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">My Experiences</h1>
        <p className="mt-2 text-[14px] text-[#6b7280]">
          Idea → Blueprint → Build → Preview. 서버를 직접 관리하지 않아도 됩니다.
        </p>

        <Link
          href="/hub/create"
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 px-6 py-8 text-center transition-colors hover:border-violet-300 hover:shadow-sm"
        >
          <Plus className="size-5 text-violet-600" />
          <span className="text-[15px] font-semibold text-violet-700">Create Experience</span>
        </Link>

        <Link
          href="/hub/data"
          className="mt-3 block text-center text-[12px] font-medium text-emerald-600 hover:underline"
        >
          Reality Data Network — 공급자 · 검수 →
        </Link>

        <h2 className="mt-12 text-[13px] font-semibold uppercase tracking-wide text-[#9ca3af]">
          Workspaces
        </h2>

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
                  {meta.capabilityCount} capabilities
                  {meta.status === "agent_ready" || meta.status === "published"
                    ? " · Agent Ready"
                    : ""}
                </p>
              </div>
              <span className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 opacity-0 group-hover:opacity-100">
                Open
                <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
