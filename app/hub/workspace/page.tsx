import { Suspense } from "react";
import { HubDevWorkspace } from "@/components/hub/dev/hub-dev-workspace";

export const metadata = {
  title: "Platform Dev Workspace",
};

export default function HubWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#0c0e12] text-[#6b7684]">
          Loading workspace…
        </div>
      }
    >
      <HubDevWorkspace />
    </Suspense>
  );
}
