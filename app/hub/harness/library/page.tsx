import Link from "next/link";
import { HarnessPersonalLibrary } from "@/components/hub/harness/harness-personal-library";

export const metadata = {
  title: "내 Harness · Rimvio Hub",
  description: "개인 계정에 격리 저장된 Harness — on/off · 게시 · 삭제",
};

export default function HubHarnessLibraryPage() {
  return (
    <div className="flex h-full flex-col bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-4 py-3">
        <Link href="/hub/harness" className="text-[11px] font-semibold text-[#6366F1]">
          ← Harness
        </Link>
        <h1 className="text-[18px] font-semibold text-[#0F172A]">내 Harness</h1>
        <p className="text-[13px] text-[#64748B]">
          개인 계정별로 분리 저장됩니다. 다른 사용자 데이터와 섞이지 않으며 on/off로 실행을 막을 수
          있습니다.
        </p>
      </header>
      <div className="mx-auto w-full max-w-3xl p-6">
        <HarnessPersonalLibrary />
      </div>
    </div>
  );
}
