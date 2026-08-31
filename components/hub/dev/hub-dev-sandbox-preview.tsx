"use client";

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevSandboxPreviewProps = {
  readonly draft: PlatformDraft;
  readonly variant?: "panel" | "inline";
  readonly className?: string;
};

export function HubDevSandboxPreview({
  draft,
  variant = "panel",
  className,
}: HubDevSandboxPreviewProps) {
  const isHotel = draft.actions.some((a) => a.name.includes("hotel") || a.name.includes("booking"));
  const title = draft.name || "OsakaStay";
  const isPanel = variant === "panel";

  return (
    <div
      className={cn(
        isPanel ? "rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm" : "bg-white px-3 pb-3 pt-2",
        className,
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", isPanel ? "mb-3" : "mb-1.5")}>
        <p
          className={cn(
            "font-semibold uppercase tracking-wide text-[#9ca3af]",
            isPanel ? "text-[11px]" : "text-[10px]",
          )}
        >
          Live Preview
        </p>
        <span
          className={cn(
            "rounded-full font-semibold text-white",
            isPanel
              ? "bg-violet-500 px-2.5 py-0.5 text-[10px]"
              : "bg-violet-500 px-1.5 py-px text-[8px]",
          )}
        >
          Demo · Sandbox
        </span>
      </div>

      <div
        className={cn(
          "overflow-hidden border border-[#e5e7eb] bg-white shadow-sm",
          isPanel ? "rounded-2xl" : "rounded-lg",
        )}
      >
        <div
          className={cn(
            "bg-violet-600",
            isPanel ? "rounded-t-2xl px-4 py-3" : "bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-2.5 py-1.5",
          )}
        >
          <p className={cn("font-semibold text-white", isPanel ? "text-[15px]" : "text-[10px] leading-tight")}>
            {title}
          </p>
          <p className={cn("text-violet-100", isPanel ? "mt-0.5 text-[12px]" : "text-[8px] leading-tight")}>
            {isHotel ? "Search hotels near Namba Station" : "Agent Experience preview"}
          </p>
        </div>

        <div className={cn(isPanel ? "space-y-3 p-4" : "space-y-1.5 p-2")}>
          {isHotel || draft.actions.length === 0 ? (
            <>
              <input
                readOnly
                value="Namba Station, Osaka"
                className={cn(
                  "w-full border border-[#e5e7eb] bg-[#fafafa] text-[#374151]",
                  isPanel ? "rounded-full px-4 py-2.5 text-[13px]" : "rounded-md px-2 py-1 text-[9px]",
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  readOnly
                  value="Check-in"
                  className={cn(
                    "border border-[#e5e7eb] bg-[#fafafa] text-[#9ca3af]",
                    isPanel ? "rounded-full px-4 py-2.5 text-[13px]" : "rounded-md px-2 py-1 text-[9px]",
                  )}
                />
                <input
                  readOnly
                  value="Check-out"
                  className={cn(
                    "border border-[#e5e7eb] bg-[#fafafa] text-[#9ca3af]",
                    isPanel ? "rounded-full px-4 py-2.5 text-[13px]" : "rounded-md px-2 py-1 text-[9px]",
                  )}
                />
              </div>
              <button
                type="button"
                className={cn(
                  "w-full bg-violet-600 font-semibold text-white",
                  isPanel ? "rounded-full py-3 text-[14px] shadow-sm" : "rounded-md py-1 text-[9px]",
                )}
              >
                Search Hotels
              </button>
            </>
          ) : (
            <p className={cn("text-center text-[#9ca3af]", isPanel ? "py-6 text-[12px]" : "py-3 text-[9px]")}>
              Connect platform to preview UX
            </p>
          )}
        </div>
      </div>

      {isPanel ? (
        <p className="mt-3 text-center text-[11px] text-[#9ca3af]">
          Sandbox uses sample data. Changes here won&apos;t affect Production.
        </p>
      ) : (
        <p className="mt-1.5 text-center text-[8px] leading-snug text-[#9ca3af]">
          Sandbox uses sample data. Changes here won&apos;t affect Production.
        </p>
      )}
    </div>
  );
}
