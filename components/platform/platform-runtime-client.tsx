"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformHost } from "@/components/platform/platform-host";
import {
  mountPlatformHostApis,
  resolvePlatformManifestFromIndex,
} from "@/lib/platform-sdk/platform-host";

export function PlatformRuntimeClient({ platformId }: { platformId: string }) {
  const searchParams = useSearchParams();
  const routePath = searchParams.get("path") ?? "/";
  const capabilityId = searchParams.get("capability");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    mountPlatformHostApis();
  }, []);

  useEffect(() => {
    const bump = () => setTick((v) => v + 1);
    window.addEventListener("rimvio:hub-capability-index", bump);
    return () => window.removeEventListener("rimvio:hub-capability-index", bump);
  }, []);

  const manifest = useMemo(() => {
    void tick;
    return resolvePlatformManifestFromIndex(platformId);
  }, [platformId, tick]);

  if (!manifest) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#F8FAFC] p-6 text-center">
        <p className="text-[15px] font-semibold text-[#0F172A]">Platform not found</p>
        <p className="text-[13px] text-[#64748B]">{platformId}</p>
        <Link href="/hub/build" className="text-[13px] font-semibold text-[#6366F1]">
          Open Rimvio Builder
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <header className="flex items-center gap-2 border-b border-[#E2E8F0] bg-white px-4 py-3">
        <Link href="/hub/build" className="text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="text-[14px] font-semibold text-[#0F172A]">{manifest.package.name}</span>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 p-4">
        <PlatformHost
          manifest={manifest}
          routePath={routePath}
          capabilityId={capabilityId}
          className="min-h-[70dvh]"
        />
      </main>
    </div>
  );
}
