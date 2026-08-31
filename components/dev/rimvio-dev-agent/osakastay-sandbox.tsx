"use client";

import { Search, User } from "lucide-react";
import { OSAKASTAY_HOTELS } from "@/lib/dev/rimvio-dev-agent/fixtures";
import type { DevAgentRuntime } from "@/lib/dev/rimvio-dev-agent/use-dev-agent-runtime";
import { Badge, Stars } from "./dev-agent-primitives";

export function OsakaStaySandbox({ runtime }: { runtime: DevAgentRuntime }) {
  const searching =
    runtime.sandboxPhase === "loading" ||
    runtime.sandboxPhase === "clicking-search" ||
    runtime.sandboxPhase === "typing-location" ||
    runtime.sandboxPhase === "setting-dates";

  return (
    <div className="relative min-h-[420px] bg-white text-[#1d1d1f]">
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
          <span>내 예약</span>
        </nav>
        <div className="flex items-center gap-2 text-[#86868b]">
          <Search className="h-4 w-4" />
          <User className="h-4 w-4" />
        </div>
      </header>

      <section className="border-b bg-gradient-to-b from-[#faf9ff] to-white px-5 py-6" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">오사카 최고의 숙소를 찾아보세요</h1>
        <p className="mt-1 text-[13px] text-[#86868b]">Sandbox · Mock DB · Test Payment</p>

        <div className="relative mt-5 grid gap-3 rounded-[16px] border bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:grid-cols-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-[#86868b]">위치</span>
            <input
              readOnly
              value={runtime.location}
              className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px] outline-none ring-[#6b4cff]/30 focus:ring-2"
              style={{ borderColor: runtime.sandboxPhase === "typing-location" ? "#6b4cff" : "rgba(0,0,0,0.08)" }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-[#86868b]">체크인</span>
            <input
              readOnly
              value={runtime.checkIn}
              className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px]"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-[#86868b]">체크아웃</span>
            <input
              readOnly
              value={runtime.checkOut}
              className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px]"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <span className="text-[11px] font-medium text-[#86868b]">객실/인원</span>
            <div className="flex gap-2">
              <input
                readOnly
                value={runtime.guests}
                className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px]"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
              />
              <button
                type="button"
                onClick={runtime.userSearch}
                className="shrink-0 rounded-[10px] bg-[#6b4cff] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(107,76,255,0.28)]"
              >
                검색
              </button>
            </div>
          </div>

          {runtime.agentCursor.visible ? (
            <div
              className="pointer-events-none absolute z-20 flex items-center gap-1.5 transition-all duration-500"
              style={{
                left: `${runtime.agentCursor.x}%`,
                top: `${runtime.agentCursor.y}%`,
              }}
            >
              <span className="rounded-full bg-[#6b4cff] px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
                {runtime.agentCursor.label}
              </span>
              <span className="h-3 w-3 rounded-full border-2 border-white bg-[#6b4cff] shadow-[0_0_0_2px_rgba(107,76,255,0.35)]" />
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-5 py-5">
        {searching ? (
          <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d1d1d6] border-t-[#6b4cff]" />
            Cloud Agent가 검색 중…
          </div>
        ) : runtime.showResults ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">검색 결과: {runtime.resultCount}개의 숙소</h2>
              <Badge tone="auto">Sandbox</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {OSAKASTAY_HOTELS.map((hotel) => (
                <article
                  key={hotel.id}
                  className="overflow-hidden rounded-[14px] border bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                  style={{ borderColor: "rgba(0,0,0,0.06)" }}
                >
                  <div
                    className="h-28 w-full"
                    style={{
                      background: `linear-gradient(135deg, hsl(${hotel.imageHue} 45% 72%), hsl(${hotel.imageHue + 30} 55% 58%))`,
                    }}
                  />
                  <div className="space-y-1 p-3">
                    <h3 className="text-[14px] font-semibold">{hotel.name}</h3>
                    <Stars count={hotel.stars} />
                    <p className="text-[12px] text-[#86868b]">
                      {hotel.rating} ({hotel.reviews}) · {hotel.location}
                    </p>
                    <p className="text-[13px] font-semibold">
                      ₩{hotel.nightlyKrw.toLocaleString("ko-KR")}
                      <span className="text-[12px] font-normal text-[#86868b]"> / 1박</span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[13px] text-[#86868b]">검색 조건을 입력하거나 Agent에게 명령하세요.</p>
        )}
      </section>
    </div>
  );
}
