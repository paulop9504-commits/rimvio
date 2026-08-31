"use client";

import { useState } from "react";
import { HubDevRuntimePanel } from "@/components/hub/dev/hub-dev-runtime-panel";
import { HubDevRuntimeStore } from "@/components/hub/dev/hub-dev-runtime-store";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevRuntimeWorkspaceProps = {
  draft: PlatformDraft;
  publishStatus: "idle" | "submitting" | "pending-review" | "published";
};

export function HubDevRuntimeWorkspace({ draft, publishStatus }: HubDevRuntimeWorkspaceProps) {
  const [view, setView] = useState<"monitor" | "store">("store");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-2 border-b border-white/[0.06] bg-[#0c0e12] px-4 py-2">
        <Tab active={view === "store"} onClick={() => setView("store")}>
          Runtime Store
        </Tab>
        <Tab active={view === "monitor"} onClick={() => setView("monitor")}>
          Monitor
        </Tab>
      </div>
      {view === "store" ? (
        <HubDevRuntimeStore draft={draft} />
      ) : (
        <HubDevRuntimePanel draft={draft} publishStatus={publishStatus} />
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[11px] font-semibold",
        active ? "bg-[#4593fc]/20 text-[#8ec0ff]" : "text-[#6b7684] hover:text-[#b0b8c1]",
      )}
    >
      {children}
    </button>
  );
}
