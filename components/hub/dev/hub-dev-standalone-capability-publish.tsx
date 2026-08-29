"use client";

import { useState } from "react";
import { listCompatiblePlatformsForCapability } from "@/lib/hub/dev/compatibility-registry";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import { cn } from "@/lib/utils";

type HubDevStandaloneCapabilityPublishProps = {
  action: CapabilityAction;
  ownerCreatorId: string;
  onPublish?: () => void;
};

/**
 * Capability-only publish — B Creator path.
 * Does not transfer Platform ownership; lists compatible platforms.
 */
export function HubDevStandaloneCapabilityPublish({
  action,
  ownerCreatorId,
  onPublish,
}: HubDevStandaloneCapabilityPublishProps) {
  const [visibility, setVisibility] = useState<"hub" | "private">("hub");
  const compatible = listCompatiblePlatformsForCapability(action.name);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#151820] p-4">
      <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Capability-only Publish</p>
      <p className="mt-1 font-mono text-[14px] font-bold text-[#f2f4f6]">{action.name}</p>
      <p className="mt-1 text-[11px] text-[#6b7684]">Owner · {ownerCreatorId}</p>

      <div className="mt-4">
        <p className="text-[11px] font-semibold text-[#b0b8c1]">Compatible Platforms</p>
        {compatible.length === 0 ? (
          <p className="mt-1 text-[11px] text-[#6b7684]">
            No approved platform attachments yet. Platform owner must approve compatibility.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-[11px] font-mono text-[#8ec0ff]">
            {compatible.map((g) => (
              <li key={g.id}>✓ {g.platformName}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 space-y-2 text-[11px] text-[#b0b8c1]">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={visibility === "hub"}
            onChange={() => setVisibility("hub")}
          />
          Publish to Hub (standalone capability)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
          />
          Private draft only
        </label>
      </div>

      <button
        type="button"
        onClick={onPublish}
        className={cn(
          "mt-4 w-full rounded-lg py-2 text-[11px] font-semibold",
          "border border-[#4593fc]/30 bg-[#4593fc]/10 text-[#8ec0ff]",
        )}
      >
        Publish Capability to Hub
      </button>
      <p className="mt-2 text-[10px] text-[#6b7684]">
        Platform 소유권은 바뀌지 않습니다. 호환 Platform에서만 실행됩니다.
      </p>
    </div>
  );
}
