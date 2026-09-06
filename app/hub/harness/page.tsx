import Link from "next/link";

export const metadata = {
  title: "Harness · Rimvio Hub",
  description: "Builder and Labeller for Rimvio Action Specifications",
};

export default function HubHarnessHomePage() {
  return (
    <div className="flex h-full flex-col bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-4 py-3">
        <Link href="/hub" className="text-[11px] font-semibold text-[#6366F1]">
          ← Hub
        </Link>
        <h1 className="text-[18px] font-semibold text-[#0F172A]">Rimvio Harness</h1>
        <p className="text-[13px] text-[#64748B]">
          WHAT은 Builder · HOW는 Labeller. Sandbox에서 Web/Local을 고른 뒤 순차 라벨링합니다.
        </p>
      </header>
      <div className="mx-auto grid w-full max-w-3xl gap-3 p-6 sm:grid-cols-2">
        <Link
          href="/hub/harness/labeller"
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:border-[#6366F1]"
        >
          <div className="text-[15px] font-semibold text-[#0F172A]">Labeller</div>
          <p className="mt-1 text-[12px] text-[#64748B]">
            Runtime(Web/Local) 선택 → 순차 Action 라벨링 → 검증 가능한 Harness JSON
          </p>
        </Link>
        <Link
          href="/hub/harness/builder"
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:border-[#6366F1]"
        >
          <div className="text-[15px] font-semibold text-[#0F172A]">Builder</div>
          <p className="mt-1 text-[12px] text-[#64748B]">
            WHAT 그래프 캔버스 · 노드 편집 · Labeller draft 가져오기 · 스키마 테스트
          </p>
        </Link>
        <Link
          href="/hub/harness/library"
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:border-[#6366F1] sm:col-span-2"
        >
          <div className="text-[15px] font-semibold text-[#0F172A]">내 Harness (계정)</div>
          <p className="mt-1 text-[12px] text-[#64748B]">
            개인 계정 격리 저장 · on/off · 게시/비공개 · 다른 사람 데이터와 완전 분리
          </p>
        </Link>
      </div>
    </div>
  );
}
