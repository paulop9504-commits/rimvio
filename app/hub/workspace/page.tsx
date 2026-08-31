import { Suspense } from "react";
import { RimvioDevAgentApp } from "@/components/dev/rimvio-dev-agent/rimvio-dev-agent-app";
import { HubDevWorkspace } from "@/components/hub/dev/hub-dev-workspace";

export const metadata = {
  title: "Rimvio Dev Agent",
  description: "Capability Runtime and Agent development environment",
};

function HubWorkspaceRouter({ full }: { full: boolean }) {
  if (full) {
    return <HubDevWorkspace />;
  }
  return <RimvioDevAgentApp />;
}

export default async function HubWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ full?: string }>;
}) {
  const params = await searchParams;
  const full = params.full === "1";

  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#f5f5f7] text-[#86868b]">
          Loading Rimvio Dev Agent…
        </div>
      }
    >
      <HubWorkspaceRouter full={full} />
    </Suspense>
  );
}
