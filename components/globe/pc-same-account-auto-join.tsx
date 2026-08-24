"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { adoptLoggedInPc } from "@/lib/pc-local-agent/adopt-logged-in-pc";
import { localAgentHealthUrl } from "@/lib/pc-local-agent/desktop-connect";

/**
 * Same Rimvio account on this computer as the phone: if Rimvio PC is running
 * unpaired, join without a code — like joining known Wi‑Fi.
 */
export function PcSameAccountAutoJoin({ signedIn }: { signedIn: boolean }) {
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const toasted = useRef(false);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    let cancelled = false;

    const tick = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await fetch(localAgentHealthUrl(), { mode: "cors" });
        if (!res.ok) {
          return;
        }
        const health = (await res.json()) as { paired?: boolean };
        if (health.paired) {
          return;
        }
        const result = await adoptLoggedInPc({
          nonce: null,
          deviceName: pc.pcFallback,
        });
        if (cancelled || !result.ok || !result.didPair || toasted.current) {
          return;
        }
        toasted.current = true;
        toast.message(pc.resumeToast);
      } catch {
        // Phone / other network: localhost is unreachable — ignore.
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [signedIn, pc.pcFallback, pc.resumeToast]);

  return null;
}
