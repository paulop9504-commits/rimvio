"use client";

import Link from "next/link";
import { Camera, CheckCircle2, ArrowRight } from "lucide-react";

export function HubDataHome() {
  return (
    <div className="min-h-dvh bg-[#f4f5f7] text-[#111827]">
      <header className="flex h-12 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
        <Link href="/" className="text-[14px] font-bold text-[#111827]">
          Rimvio
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/hub" className="text-[12px] text-[#6b7280] hover:text-[#111827]">
            Platform Hub
          </Link>
          <span className="text-[12px] text-[#9ca3af]">Reality Data Network</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
          Reality Data Network
        </p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight text-[#111827]">
          현실 데이터 · 검수 · 보상
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#6b7280]">
          사용자가 제출한 현장 데이터를 AI가 pre-label하고, 검수자가 consensus로 Verified Reality로
          승격합니다. Agent와 Capability가 사용할 때 Contributor에게 보상이 분배됩니다.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/hub/data/supplier?pane=overview"
            className="group rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
              <Camera className="size-5 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-[17px] font-semibold text-[#111827]">공급자 패널</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6b7280]">
              호텔 사진 · 객실 정보 · 현장 데이터를 제출합니다. AI pre-label 후 Task Pool로
              전달되고, 검수 완료 시 Verified Reality Data로 승격됩니다.
            </p>
            <p className="mt-3 text-[11px] text-emerald-700">사진 제출 ₩10 · 속성 라벨 ₩20+</p>
            <span className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-emerald-600 opacity-80 group-hover:opacity-100">
              공급자 워크스페이스
              <ArrowRight className="size-4" />
            </span>
          </Link>

          <Link
            href="/hub/data/verifier?pane=overview"
            className="group rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50">
              <CheckCircle2 className="size-5 text-violet-600" />
            </div>
            <h2 className="mt-4 text-[17px] font-semibold text-[#111827]">지원자 · 검수 패널</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6b7280]">
              Task Pool에서 검수 작업을 수행합니다. YES / NO / 수정으로 consensus에 참여하고, 정확도에
              따라 Quality multiplier가 적용됩니다.
            </p>
            <p className="mt-3 text-[11px] text-violet-700">
              검수 ₩10–300 · Quality 1.5x · Reliability tier
            </p>
            <span className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-violet-600 opacity-80 group-hover:opacity-100">
              지원자 워크스페이스
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>

        <section className="mt-12 rounded-2xl border border-[#e5e7eb] bg-white p-6">
          <h3 className="text-[13px] font-semibold text-[#374151]">실행 흐름</h3>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-[#f8fafc] p-4 text-[11px] leading-relaxed text-[#475569]">
            {`사용자 제출 → AI Pre-label → Task Pool → 검수 A/B/C → Consensus → Verified Reality
                                                              ↓
                                                    Capability → Agent → Workspace`}
          </pre>
        </section>
      </main>
    </div>
  );
}
