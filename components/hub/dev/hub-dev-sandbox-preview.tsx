"use client";

import type { PlatformDraft } from "@/lib/hub/platform/types";

export function HubDevSandboxPreview({ draft }: { draft: PlatformDraft }) {
  const isHotel = draft.actions.some((a) => a.name.includes("hotel") || a.name.includes("booking"));

  return (
    <div className="shrink-0 border-t border-[#e5e7eb] bg-[#fafafa] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">Live Preview</p>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
          Demo · Sandbox
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
        <div className="border-b border-[#f3f4f6] bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2">
          <p className="text-[11px] font-semibold text-white">{draft.name || "Platform"}</p>
          <p className="text-[9px] text-violet-100">
            {isHotel ? "Search hotels near Namba Station" : "Agent Experience preview"}
          </p>
        </div>
        <div className="space-y-2 p-3">
          {isHotel ? (
            <>
              <input readOnly value="Namba Station, Osaka" className="w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2 py-1.5 text-[10px] text-[#374151]" />
              <div className="grid grid-cols-2 gap-1.5">
                <input readOnly value="Check-in" className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2 py-1.5 text-[10px] text-[#9ca3af]" />
                <input readOnly value="Check-out" className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2 py-1.5 text-[10px] text-[#9ca3af]" />
              </div>
              <button type="button" className="w-full rounded-lg bg-violet-600 py-1.5 text-[10px] font-semibold text-white">
                Search Hotels
              </button>
            </>
          ) : (
            <p className="py-4 text-center text-[10px] text-[#9ca3af]">Connect platform to preview UX</p>
          )}
        </div>
      </div>
    </div>
  );
}
