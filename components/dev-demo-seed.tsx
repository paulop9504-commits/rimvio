"use client";

import { useEffect } from "react";
import { seedDemoLinks } from "@/lib/demo/seed";

/** Auto-seed demo links in development on first visit. */
export function DevDemoSeed() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      seedDemoLinks();
    }
  }, []);

  return null;
}
