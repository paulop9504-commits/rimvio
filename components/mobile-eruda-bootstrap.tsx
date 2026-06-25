"use client";

import { useEffect } from "react";
import { initMobileErudaIfEnabled } from "@/lib/debug/mobile-eruda";

/** Loads Eruda on mobile when ?debug=1 (or prior opt-in in localStorage). */
export function MobileErudaBootstrap() {
  useEffect(() => {
    void initMobileErudaIfEnabled();
  }, []);

  return null;
}
