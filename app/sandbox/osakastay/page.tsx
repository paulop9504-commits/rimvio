import { Suspense } from "react";
import { OsakaStaySandboxClient } from "./osakastay-client";

export default function OsakaStaySandboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white p-6 text-[#86868b]">OsakaStay 로딩 중…</div>}>
      <OsakaStaySandboxClient />
    </Suspense>
  );
}
