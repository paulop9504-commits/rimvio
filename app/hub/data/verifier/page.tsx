import { Suspense } from "react";
import { HubDataVerifierWorkspace } from "@/components/hub/data/hub-data-verifier-workspace";

export default function HubDataVerifierPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f8fafc]" />}>
      <HubDataVerifierWorkspace />
    </Suspense>
  );
}
