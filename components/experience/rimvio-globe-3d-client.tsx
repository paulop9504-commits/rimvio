"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { RimvioGlobe3DProps } from "@/components/experience/rimvio-globe-3d";

const RimvioGlobe3DLazy = dynamic(
  () =>
    import("@/components/experience/rimvio-globe-3d").then((mod) => mod.RimvioGlobe3D),
  {
    ssr: false,
    loading: () => (
      <div className="rimvio-globe-space flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-white/55">
        3D 지구 불러오는 중…
      </div>
    ),
  },
);

export function RimvioGlobe3DClient(props: RimvioGlobe3DProps) {
  return <RimvioGlobe3DLazy {...props} className={cn(props.className)} />;
}
