"use client";

/**
 * Dev web — Capability Object Workspace (photo-like trip chrome).
 * Intent opens Day / Timeline / Budget — not fixed tabs.
 */

import { useEffect, useState } from "react";
import { ContextWorkspaceShell } from "@/components/context-workspace/context-workspace-shell";
import { prepareTripWorkspaceDraft } from "@/lib/context-workspace/prepare-trip-workspace-draft";
import { writeContextWorkspaceExpanded } from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";

const DEMO_EVENT_ID = "demo:capability-osaka-trip";

export default function CapabilityWorkspaceDemoPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    prepareTripWorkspaceDraft({
      utterance: "오사카 4박5일 일정 만들어줘",
      contextEventId: DEMO_EVENT_ID,
      expand: true,
      skipUserChat: true,
    });
    writeContextWorkspaceExpanded(DEMO_EVENT_ID, true);
    dispatchContextWorkspaceExpand({
      contextEventId: DEMO_EVENT_ID,
      source: "trip_prep",
    });
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f8fa] text-[13px] text-[#8b95a1]">
        Capability Workspace 준비 중…
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full bg-[#f7f8fa]">
      <ContextWorkspaceShell
        contextEventId={DEMO_EVENT_ID}
        projectTitleKo="오사카 4박5일"
      />
    </div>
  );
}
