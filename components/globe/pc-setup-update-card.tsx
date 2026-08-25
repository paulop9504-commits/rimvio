"use client";

import { PcProgramInstallList } from "@/components/globe/pc-program-install-list";
import { useCopy } from "@/hooks/use-copy";
import { PC_SETUP_UPDATE_QUERY } from "@/lib/pc-local-agent/program-install-catalog";
import { RIMVIO_PC_SETUP_VERSION } from "@/lib/pc-local-agent/setup-url";
import { cn } from "@/lib/utils";

export function PcSetupUpdateCard({
  reportedVersion,
  needsUpdate,
  className,
  tone = "chat",
}: {
  reportedVersion?: string | null;
  needsUpdate?: boolean;
  className?: string;
  tone?: "sidebar" | "chat";
}) {
  const pc = useCopy().globe.pcContinuity;
  const need = RIMVIO_PC_SETUP_VERSION;
  const have = reportedVersion?.trim() || null;
  const body =
    have && have !== need
      ? pc.versionMismatch(have, need)
      : pc.agentNeedLatest(need);

  return (
    <div
      className={cn("w-full", className)}
      data-pc-setup-update
      data-pc-expected-version={need}
      data-pc-reported-version={have ?? ""}
      data-pc-needs-update={needsUpdate ? "1" : "0"}
    >
      <p
        className={
          tone === "chat"
            ? "text-[13px] leading-relaxed text-[#3a3a3c]"
            : "text-[13px] leading-relaxed text-white/70"
        }
      >
        {body}
      </p>
      <PcProgramInstallList
        query={PC_SETUP_UPDATE_QUERY}
        tone={tone}
        className="mt-2"
        ctaLabel={pc.reinstallSetupCta(need)}
      />
    </div>
  );
}
