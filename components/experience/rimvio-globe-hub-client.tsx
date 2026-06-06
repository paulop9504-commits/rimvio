"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { RimvioGlobeHubProps } from "@/components/experience/rimvio-globe-hub";

const RimvioGlobeHubLazy = dynamic(
  () =>
    import("@/components/experience/rimvio-globe-hub").then((mod) => mod.RimvioGlobeHub),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-[13px] text-white/45">
        지구본 불러오는 중…
      </div>
    ),
  },
);

export function RimvioGlobeHubClient({ className }: RimvioGlobeHubProps) {
  return <RimvioGlobeHubLazy className={cn(className)} />;
}
