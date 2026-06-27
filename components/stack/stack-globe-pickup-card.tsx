"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  clearGlobeResumeSession,
  readGlobeResumeSession,
  type GlobeResumeSession,
} from "@/lib/globe/globe-resume-session";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

/** Tier 2 — /stack pick-up when a globe session was left mid-flow. */
export function StackGlobePickupCard({ className }: { className?: string }) {
  const [session, setSession] = useState<GlobeResumeSession | null>(null);

  useEffect(() => {
    setSession(readGlobeResumeSession());
  }, []);

  if (!session) {
    return null;
  }

  const href = `/?recallEvent=${encodeURIComponent(session.eventId)}`;
  const place = session.placeLabel?.trim();
  const body = place ? `${session.title} · ${place}` : session.title;

  return (
    <div
      className={cn(
        "mx-auto mb-3 w-full max-w-lg rounded-[1.15rem] bg-white/95 px-3.5 py-3",
        "shadow-[0_6px_20px_rgba(2,32,71,0.08)] ring-1 ring-black/[0.05]",
        className,
      )}
      data-stack-globe-pickup-card
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">
        {copy.globe.resumeContextEyebrow}
      </p>
      <p className="mt-0.5 truncate text-[14px] font-semibold text-foreground">{body}</p>
      <div className="mt-2 flex items-center gap-2">
        <Link
          href={href}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#3182f6] px-3 py-2 text-[12px] font-semibold text-white active:opacity-90"
        >
          {copy.globe.resumeContextCta}
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => {
            clearGlobeResumeSession();
            setSession(null);
          }}
          className="rounded-full px-3 py-2 text-[12px] font-semibold text-muted-foreground active:bg-black/[0.04]"
        >
          {copy.portal.marketSuggestDismissAria}
        </button>
      </div>
    </div>
  );
}
