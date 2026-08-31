import { Suspense } from "react";
import { RimvioDevAgentApp } from "@/components/dev/rimvio-dev-agent/rimvio-dev-agent-app";

export const metadata = {
  title: "Rimvio Dev Agent",
  description: "Capability Runtime and Agent development environment",
};

export default function HubCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#f5f5f7] text-[#86868b]">
          Loading Rimvio Dev Agent…
        </div>
      }
    >
      <RimvioDevAgentApp />
    </Suspense>
  );
}
