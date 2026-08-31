"use client";

import Link from "next/link";
import { HubSidebar } from "@/components/hub/layout/hub-sidebar";
import { Box, Layers, ArrowRight } from "lucide-react";

const TRACKS = [
  {
    href: "/hub/submit/capability",
    title: "Capability Submission",
    description: "6-step track for a single capability package — manifest, permissions, sandbox test.",
    steps: "Package → Manifest → Permissions → Context → Test → Review",
    icon: Box,
    accent: "bg-[#6366F1]",
  },
  {
    href: "/hub/submit/platform",
    title: "Platform Submission",
    description:
      "14-step track for a full platform — identity, architecture, markets, commerce, security.",
    steps: "Identity → … → Markets → Commerce → Testing → Publish",
    icon: Layers,
    accent: "bg-[#0F172A]",
  },
] as const;

export function HubSubmitChooser() {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#F8FAFC]">
      <HubSidebar />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-10 lg:px-12">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-[24px] font-bold tracking-tight text-[#0F172A]">Submissions</h1>
          <p className="mt-2 text-[14px] text-[#64748B]">
            Choose a submission track. Capability for focused packages; Platform for full
            multi-market deployments.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {TRACKS.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.href}
                  href={track.href}
                  className="group rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className={`mb-4 inline-flex size-10 items-center justify-center rounded-xl text-white ${track.accent}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h2 className="text-[16px] font-semibold text-[#0F172A]">{track.title}</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#64748B]">
                    {track.description}
                  </p>
                  <p className="mt-3 font-mono text-[10px] text-[#94A3B8]">{track.steps}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#6366F1] group-hover:gap-2">
                    Start
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
