"use client";

const DEMO_HOTELS = [
  { name: "Swissotel Nankai Osaka", rating: 4.8, price: "₩462,000", nights: "2박" },
  { name: "Hotel Monterey Grasmere", rating: 4.7, price: "₩284,000", nights: "2박" },
];

type HubDevLivePreviewProps = {
  platformName: string;
  demoMode?: boolean;
};

export function HubDevLivePreview({ platformName, demoMode = true }: HubDevLivePreviewProps) {
  return (
    <div className="flex h-full flex-col bg-[#0c0e12]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <p className="text-[11px] font-semibold text-[#b0b8c1]">Live Preview</p>
        {demoMode ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
            Demo · Sandbox
          </span>
        ) : null}
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
              className="w-full rounded-lg bg-[#4593fc] py-2 text-[12px] font-semibold text-white"
            >
              Search Hotels
            </button>
            <div className="border-t border-white/[0.06] pt-3">
              {DEMO_HOTELS.map((h) => (
                <div
                  key={h.name}
                  className="mb-3 rounded-lg border border-white/[0.06] bg-[#1a1f28] p-2.5"
                >
                  <p className="text-[11px] font-semibold text-[#f2f4f6]">{h.name}</p>
                  <p className="text-[10px] text-amber-400">★ {h.rating}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#8ec0ff]">
                    {h.price} <span className="font-normal text-[#6b7684]">/ {h.nights}</span>
                  </p>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md border border-white/[0.1] py-1 text-[10px] text-[#b0b8c1]"
                  >
                    View Rooms
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
