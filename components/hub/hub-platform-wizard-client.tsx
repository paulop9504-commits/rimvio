"use client";

import { HubDevWorkspace } from "@/components/hub/dev/hub-dev-workspace";
import { Suspense } from "react";

export function HubPlatformWizardClient() {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#0c0e12]" />}>
      <HubDevWorkspace />
    </Suspense>
  );
}
