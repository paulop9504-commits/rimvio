"use client";

import { useCallback, useEffect, useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import type { PcProgramInstallOffer } from "@/lib/pc-local-agent/program-install-catalog";
import { cn } from "@/lib/utils";

function startDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function PcProgramInstallList({
  query,
  className,
  onStarted,
  tone = "sidebar",
}: {
  query: string;
  className?: string;
  onStarted?: (id: string) => void;
  tone?: "sidebar" | "chat";
}) {
  const pc = useCopy().globe.pcContinuity;
  const [programs, setPrograms] = useState<PcProgramInstallOffer[]>([]);
  const [started, setStarted] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = query.trim();
    const res = await fetch(
      q
        ? `/api/pc-agent/programs?q=${encodeURIComponent(q)}`
        : "/api/pc-agent/programs",
      { cache: "no-store" },
    );
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { programs?: PcProgramInstallOffer[] };
    setPrograms(data.programs ?? []);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  if (programs.length === 0) {
    return null;
  }

  const name = (key: PcProgramInstallOffer["nameKey"]) => pc[key];
  const chat = tone === "chat";

  return (
    <div className={className} data-pc-program-install data-pc-program-tone={tone}>
      {chat ? null : (
        <>
          <p className="text-[14px] font-medium text-white">{pc.programOfferTitle}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/55">{pc.programOfferBody}</p>
        </>
      )}
      <div className={cn("space-y-2", chat ? "mt-2.5" : "mt-3")}>
        {programs.map((program) => (
          <button
            key={program.id}
            type="button"
            data-pc-program-id={program.id}
            onClick={() => {
              startDownload(program.url);
              setStarted(program.id);
              onStarted?.(program.id);
            }}
            className={cn(
              "w-full rounded-full px-3 py-2.5 text-[14px] font-semibold",
              chat
                ? "bg-[#191f28] text-white active:scale-[0.98]"
                : "bg-white text-black",
            )}
          >
            {started === program.id
              ? pc.programInstalling
              : pc.programInstallCta(name(program.nameKey))}
          </button>
        ))}
      </div>
    </div>
  );
}
