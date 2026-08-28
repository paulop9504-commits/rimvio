"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  runSandboxHotelSearch,
  type SandboxPreviewState,
} from "@/lib/hub/dev/sandbox-preview";

type HubDevLivePreviewProps = {
  platformName: string;
  draft: PlatformDraft;
};

export function HubDevLivePreview({ platformName, draft }: HubDevLivePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SandboxPreviewState | null>(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runSandboxHotelSearch(draft, {
        destination: "Namba Station",
        checkIn: "2026-06-15",
        checkOut: "2026-06-17",
        guests: 2,
      });
      setPreview(result);
    } finally {
      setLoading(false);
    }
  }, [draft]);

  const hotels = preview?.hotels ?? [];
  const modeLabel =
    preview?.mode === "sandbox"
      ? "Sandbox · Platform Host"
      : preview
        ? "Demo fallback"
        : "Demo · Sandbox";

  return (
    <div className="flex h-full flex-col bg-[#0c0e12]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <p className="text-[11px] font-semibold text-[#b0b8c1]">Live Preview</p>
        <span
          className={
            preview?.mode === "sandbox"
              ? "rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400"
              : "rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400"
          }
        >
          {modeLabel}
        </span>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-y-auto p-4 rimvio-scroll-touch">
        <div className="w-full max-w-[280px] rounded-2xl border border-white/[0.08] bg-[#151820] shadow-xl">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="text-[14px] font-bold text-[#f2f4f6]">{platformName}</p>
            <p className="text-[10px] text-[#6b7684]">오사카 호텔 검색</p>
          </div>
          <div className="space-y-3 p-4">
            <label className="block text-[10px] text-[#6b7684]">Where</label>
            <div className="rounded-lg border border-white/[0.08] bg-[#1a1f28] px-3 py-2 text-[12px] text-[#f2f4f6]">
              Namba Station
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#6b7684]">Check-in</label>
                <div className="mt-1 rounded-lg border border-white/[0.08] bg-[#1a1f28] px-2 py-1.5 text-[11px] text-[#b0b8c1]">
                  Jun 15
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#6b7684]">Check-out</label>
                <div className="mt-1 rounded-lg border border-white/[0.08] bg-[#1a1f28] px-2 py-1.5 text-[11px] text-[#b0b8c1]">
                  Jun 17
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={loading || draft.actions.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4593fc] py-2 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Search Hotels
            </button>

            {preview ? (
              <p className="text-[9px] leading-relaxed text-[#6b7684]">{preview.invokeDetail}</p>
            ) : null}

            <div className="border-t border-white/[0.06] pt-3">
              {hotels.length === 0 ? (
                <p className="text-center text-[10px] text-[#6b7684]">
                  Search를 눌러 sandbox invoke를 실행하세요.
                </p>
              ) : (
                hotels.map((h) => (
                  <div
                    key={h.id}
                    className="mb-3 rounded-lg border border-white/[0.06] bg-[#1a1f28] p-2.5"
                  >
                    <p className="text-[11px] font-semibold text-[#f2f4f6]">{h.name}</p>
                    <p className="text-[10px] text-amber-400">★ {h.rating}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#8ec0ff]">
                      ₩{h.priceKrw.toLocaleString()}{" "}
                      <span className="font-normal text-[#6b7684]">/ {h.nights}박</span>
                    </p>
                    <button
                      type="button"
                      className="mt-2 w-full rounded-md border border-white/[0.1] py-1 text-[10px] text-[#b0b8c1]"
                    >
                      View Rooms
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
