import { Suspense } from "react";
import { HubDevMvpWorkspace } from "@/components/hub/dev/mvp/hub-dev-mvp-workspace";
import { HubDevWorkspace } from "@/components/hub/dev/hub-dev-workspace";

export const metadata = {
  title: "Rimvio Dev Hub",
};

function HubWorkspaceRouter({ full }: { full: boolean }) {
  if (full) {
    return <HubDevWorkspace />;
  }
  return <HubDevMvpWorkspace />;
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
          Loading Dev Hub…
        </div>
      }
    >
      <HubWorkspaceRouter full={full} />
    </Suspense>
  );
}
