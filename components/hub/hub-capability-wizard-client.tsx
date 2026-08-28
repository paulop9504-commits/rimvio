"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** @deprecated Use /hub/workspace — capability-only track merged into Platform Dev Workspace */
export function HubCapabilityWizardClient() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hub/workspace?nav=capabilities");
  }, [router]);
  return (
    <div className="flex h-dvh items-center justify-center bg-[#0c0e12] text-[#6b7684]">
      Redirecting to Dev Workspace…
    </div>
  );
}
