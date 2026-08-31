"use client";

import { useMemo } from "react";
import { buildCreatorOpsView } from "@/lib/hub/dev/creator-ops-model";
import type { PlatformDraft } from "@/lib/hub/platform/types";

type HubDevAnalyticsPanelProps = {
  draft: PlatformDraft;
};

export function HubDevAnalyticsPanel({ draft }: HubDevAnalyticsPanelProps) {
  const view = useMemo(() => buildCreatorOpsView(draft), [draft]);

  const series = [
    { day: "Mon", bookings: 42, revenue: 4.2 },
    { day: "Tue", bookings: 38, revenue: 3.8 },
    { day: "Wed", bookings: 51, revenue: 5.1 },
    { day: "Thu", bookings: 47, revenue: 4.7 },
    { day: "Fri", bookings: 89, revenue: 9.2 },
    { day: "Sat", bookings: 112, revenue: 12.4 },
    { day: "Sun", bookings: 98, revenue: 10.8 },
  ];

  const maxBookings = Math.max(...series.map((s) => s.bookings));

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Analytics</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">{view.platformName}</h2>
      <p className="mt-1 text-[12px] text-[#64748b]">
        Creator-owned business metrics · Demo sandbox
      </p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
        Demo data — connect production analytics after Deploy
      </div>

      <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Bookings (7 days)</h3>
        <div className="mt-4 flex items-end gap-2 h-32">
          {series.map((s) => (
            <div key={s.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[#4593fc]/80"
                style={{ height: `${(s.bookings / maxBookings) * 100}%`, minHeight: 4 }}
              />
              <span className="text-[9px] text-[#64748b]">{s.day}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Funnel (Capability-backed)</h3>
        <ul className="mt-3 space-y-2 text-[12px] text-[#475569]">
          <li>Search → 12,400 · 🧩 hotel.search</li>
          <li>Detail → 3,200 · 🧩 hotel.detail</li>
          <li>Availability → 1,840 · 🧩 room.availability</li>
          <li>Booking prepare → 420 · 🧩 booking.prepare</li>
          <li>Confirmed → 128 · 🧩 booking.confirm</li>
        </ul>
      </section>
    </div>
  );
}
