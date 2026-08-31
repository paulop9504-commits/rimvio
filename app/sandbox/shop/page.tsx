import { Suspense } from "react";
import { RimvioShopSandboxClient } from "./shop-client";

export default function RimvioShopSandboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white p-6 text-[#86868b]">Rimvio Shop 로딩 중…</div>}>
      <RimvioShopSandboxClient />
    </Suspense>
  );
}
