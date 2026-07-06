"use client";

import { copy } from "@/lib/copy/human-ko";
import type { SpatialPatchPreview } from "@/lib/globe/context-condition-ai/spatial-patch-types";
import { cn } from "@/lib/utils";

export type GlobeContextAgentSpatialPatchPreviewProps = {
  preview: SpatialPatchPreview;
  className?: string;
};

function kindLabel(kind: "lodging" | "eatery"): string {
  return kind === "lodging"
    ? copy.globe.contextAgentPatchKindLodging
    : copy.globe.contextAgentPatchKindEatery;
}

/** Before/after diff strip — kept pins vs replacing scope (Cursor-like patch). */
export function GlobeContextAgentSpatialPatchPreview({
  preview,
  className,
}: GlobeContextAgentSpatialPatchPreviewProps) {
  const replacing = preview.replacingKinds;

  return (
    <div
      className={cn(
        "rounded-xl bg-[#f5f5f7] px-2.5 py-2 ring-1 ring-black/[0.04]",
        className,
      )}
      data-globe-context-agent-spatial-patch
      data-globe-context-agent-spatial-patch-scope={preview.plan.scope}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {copy.globe.contextAgentPatchEyebrow}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#515154]">
        {preview.plan.reasonKo}
      </p>
      {preview.kept.length > 0 ? (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-[#86868b]">
            {copy.globe.contextAgentPatchKeep}
          </p>
          <ul className="mt-1 space-y-0.5">
            {preview.kept.map((row) => (
              <li
                key={`${row.kind}-${row.placeId}`}
                className="truncate text-[11px] text-[#1d1d1f]"
                data-globe-context-agent-patch-kept={row.kind}
              >
                {row.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {replacing.length > 0 ? (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-[#ff6b4a]">
            {copy.globe.contextAgentPatchReplace}
          </p>
          <p className="mt-0.5 text-[11px] text-[#515154]">
            {replacing.map((kind) => kindLabel(kind)).join(" · ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
