import { Suspense } from "react";
import { HubDevCreatePlatform } from "@/components/hub/dev/hub-dev-create-platform";

export const metadata = {
  title: "Create Experience — Rimvio Hub",
  description: "Idea → Experience Blueprint → Build",
};

export default function HubIdeaPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0c0e12]" />}>
      <HubDevCreatePlatform />
    </Suspense>
  );
}
