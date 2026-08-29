"use client";

import type { PlatformDraft } from "@/lib/hub/platform/types";

export function HubDevSandboxPreview({ draft }: { draft: PlatformDraft }) {
  const isHotel = draft.actions.some((a) => a.name.includes("hotel") || a.name.includes("booking"));
  const title = draft.name || "OsakaStay";

  return (
    <div className="shrink-0 border-t border-[#e5e7eb] bg-white px-3 pb-3 pt-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-[#6b7280]">Live Preview (Sandbox)</p>
        <span className="rounded-full bg-amber-50 px-1.5 py-px text-[8px] font-semibold text-amber-700 ring-1 ring-amber-200/80">
          Demo · Sandbox
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-2.5 py-1.5">
          <p className="text-[10px] font-semibold leading-tight text-white">{title}</p>
          <p className="text-[8px] leading-tight text-indigo-100">
            {isHotel ? "Search hotels near Namba Station" : "Agent Experience preview"}
          </p>
        </div>
        <div className="space-y-1.5 p-2">
          {isHotel ? (
            <>
              <input
                readOnly
                value="Namba Station, Osaka"
                className="w-full rounded-md border border-[#e5e7eb] bg-[#fafafa] px-2 py-1 text-[9px] text-[#374151]"
              />
              <div className="grid grid-cols-2 gap-1">
                <input
                  readOnly
                  value="Check-in"
                  className="rounded-md border border-[#e5e7eb] bg-[#fafafa] px-2 py-1 text-[9px] text-[#9ca3af]"
                />
                <input
                  readOnly
                  value="Check-out"
                  className="rounded-md border border-[#e5e7eb] bg-[#fafafa] px-2 py-1 text-[9px] text-[#9ca3af]"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-md bg-[#6366f1] py-1 text-[9px] font-semibold text-white"
              >
                Search Hotels
              </button>
            </>
          ) : (
            <p className="py-3 text-center text-[9px] text-[#9ca3af]">Connect platform to preview UX</p>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[8px] leading-snug text-[#9ca3af]">
        Sandbox uses sample data. Changes here won&apos;t affect Production.
      </p>
    </div>
  );
}
