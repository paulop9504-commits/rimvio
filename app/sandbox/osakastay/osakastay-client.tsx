"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, User } from "lucide-react";
import { Stars } from "@/components/dev/rimvio-dev-agent/dev-agent-primitives";
import { OSAKASTAY_HOTELS, type DevAgentHotel } from "@/lib/dev/rimvio-dev-agent/fixtures";

function formatNightly(krw: number) {
  return `₩${krw.toLocaleString("ko-KR")} / 1박`;
}

export function OsakaStaySandboxClient() {
  const searchParams = useSearchParams();
  const hotelIdParam = searchParams.get("hotelId");
  const detailHotel = useMemo(
    () => OSAKASTAY_HOTELS.find((hotel) => hotel.id === hotelIdParam) ?? null,
    [hotelIdParam],
  );

  const [location, setLocation] = useState("오사카, 일본");
  const [checkIn, setCheckIn] = useState("2024-06-01");
  const [checkOut, setCheckOut] = useState("2024-06-03");
  const [guests, setGuests] = useState("2");
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<DevAgentHotel[]>([]);
  const [resultCount, setResultCount] = useState(0);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setHotels([]);
    setResultCount(0);
    try {
      const params = new URLSearchParams({ location });
      const res = await fetch(`/api/sandbox/osakastay/hotels?${params.toString()}`);
      const data = (await res.json()) as { count: number; hotels: DevAgentHotel[] };
      setHotels(data.hotels ?? []);
      setResultCount(data.count ?? data.hotels?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (detailHotel) {
      void runSearch();
    }
  }, [detailHotel, runSearch]);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6b4cff] text-[12px] font-bold text-white">
            O
          </div>
          <span className="text-[15px] font-semibold">OsakaStay</span>
        </div>
        <nav className="hidden items-center gap-5 text-[13px] text-[#636366] md:flex">
          <span className="font-medium text-[#1d1d1f]">홈</span>
          <span>검색</span>
          <span>예약</span>
        </nav>
        <div className="flex items-center gap-2 text-[#86868b]">
          <Search className="h-4 w-4" />
          <User className="h-4 w-4" />
        </div>
      </header>

      <section className="border-b bg-gradient-to-b from-[#faf9ff] to-white px-5 py-6" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">오사카 최고의 숙소를 찾아보세요</h1>
        <p className="mt-1 text-[13px] text-[#86868b]">Sandbox · Playwright target · Test Payment</p>

        <form
          className="mt-5 grid gap-3 rounded-[16px] border bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:grid-cols-4"
          style={{ borderColor: "rgba(0,0,0,0.06)" }}
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
        >
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-[#86868b]">위치</span>
            <input
              data-testid="location-input"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px] outline-none ring-[#6b4cff]/30 focus:ring-2"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-[#86868b]">체크인</span>
            <input
              data-testid="checkin-input"
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px]"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-[#86868b]">체크아웃</span>
            <input
              data-testid="checkout-input"
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px]"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <span className="text-[11px] font-medium text-[#86868b]">객실/인원</span>
            <div className="flex gap-2">
              <input
                data-testid="guests-input"
                value={guests}
                onChange={(event) => setGuests(event.target.value)}
                className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px]"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
              />
              <button
                data-testid="search-button"
                type="submit"
                disabled={loading}
                className="shrink-0 rounded-[10px] bg-[#6b4cff] px-4 py-2 text-[13px] font-semibold text-white"
              >
                {loading ? "검색 중…" : "검색"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {detailHotel ? (
        <section className="border-b px-5 py-6" data-testid="hotel-detail" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Hotel Detail</p>
          <h2 className="mt-2 text-[22px] font-semibold" data-testid="hotel-detail-name">
            {detailHotel.name}
          </h2>
          <Stars count={detailHotel.stars} />
          <p className="mt-2 text-[13px] text-[#636366]">{detailHotel.location}</p>
          <p className="mt-1 text-[15px] font-semibold">{formatNightly(detailHotel.nightlyKrw)}</p>
          <p className="mt-2 text-[12px] text-[#86868b]">ID: {detailHotel.id}</p>
        </section>
      ) : null}

      <section className="px-5 py-6" data-testid="hotel-results">
        {loading ? (
          <p className="text-[13px] text-[#86868b]">호텔을 찾는 중…</p>
        ) : null}
        {!loading && resultCount > 0 ? (
          <>
            <p className="text-[13px] text-[#636366]" data-testid="result-count">
              {resultCount}개의 호텔
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {hotels.map((hotel) => (
                <article
                  key={hotel.id}
                  data-testid="hotel-card"
                  className="overflow-hidden rounded-[16px] border bg-white shadow-sm"
                  style={{ borderColor: "rgba(0,0,0,0.06)" }}
                >
                  <div
                    className="h-32"
                    style={{ background: `linear-gradient(135deg, hsl(${hotel.imageHue} 55% 72%), hsl(${hotel.imageHue} 45% 58%))` }}
                  />
                  <div className="space-y-1 p-4">
                    <h2 className="text-[15px] font-semibold">{hotel.name}</h2>
                    <Stars count={hotel.stars} />
                    <p className="text-[12px] text-[#86868b]">{hotel.location}</p>
                    <p className="text-[13px] font-semibold">{formatNightly(hotel.nightlyKrw)}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
