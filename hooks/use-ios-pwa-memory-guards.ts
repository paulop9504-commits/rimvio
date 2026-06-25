"use client";

import { useEffect, useState } from "react";
import { shouldUseIosPwaMemoryGuards } from "@/lib/platform/ios-pwa-memory";

/**
 * SSR-safe iOS PWA memory guard — false until client mount so server HTML matches hydration.
 */
export function useIosPwaMemoryGuards(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(shouldUseIosPwaMemoryGuards());
  }, []);

  return active;
}
