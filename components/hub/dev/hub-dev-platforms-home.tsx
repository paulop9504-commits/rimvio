"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { AI_BUILD_EXAMPLE_PROMPTS } from "@/lib/hub/dev/platform-nav";

const DEMO_PLATFORMS = [
  {
    id: "osaka-stay",
    name: "OsakaStay",
    status: "Development" as const,
    href: "/hub/workspace",
    note: "Demo draft — open workspace to build with AI",
  },
];

export function HubDevPlatformsHome() {
  return (
    <div className="min-h-dvh bg-[#0c0e12] text-[#f2f4f6]">
      <header className="flex h-12 items-center justify-between border-b border-white/[0.06] px-6">
        <Link href="/" className="text-[14px] font-bold">
          Rimvio
        </Link>
        <span className="text-[12px] text-[#6b7684]">Dev Workspace</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-[28px] font-bold tracking-tight">Build your Platform</h1>
        <p className="mt-2 text-[14px] text-[#6b7684]">
          Describe what you want to create. AI designs the blueprint — you control code, manifest,
          and deploy.
        </p>

        <Link
          href="/hub/workspace?nav=ai-build"
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-[#4593fc]/40 bg-gradient-to-br from-[#4593fc]/10 to-[#6366f1]/5 px-6 py-8 text-center transition-colors hover:border-[#4593fc]/60"
        >
          <Plus className="size-5 text-[#8ec0ff]" />
          <span className="text-[15px] font-semibold text-[#8ec0ff]">New Platform with AI</span>
        </Link>

        <p className="mt-6 text-[11px] text-[#6b7684]">Try: {AI_BUILD_EXAMPLE_PROMPTS[0]}</p>

        <h2 className="mt-12 text-[13px] font-semibold uppercase tracking-wide text-[#6b7684]">
          My Platforms
        </h2>
        <div className="mt-4 grid gap-3">
          {DEMO_PLATFORMS.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#151820] p-5 hover:border-[#4593fc]/30"
            >
              <div>
                <p className="text-[16px] font-semibold">🏨 {p.name}</p>
                <p className="mt-1 text-[12px] text-[#8ec0ff]">● {p.status}</p>
                <p className="mt-2 text-[11px] text-[#6b7684]">{p.note}</p>
              </div>
              <span className="flex items-center gap-1 text-[12px] font-semibold text-[#8ec0ff] opacity-0 group-hover:opacity-100">
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
