import type { LinkRow } from "@/types/database";
import { demoSampleLinks } from "@/lib/demo/sample-links";

const STORAGE_KEY = "blink-local-links";
const DEMO_FLAG = "blink-demo-seeded";

export function seedDemoLinks(force = false) {
  if (typeof window === "undefined") {
    return demoSampleLinks;
  }

  if (!force && sessionStorage.getItem(DEMO_FLAG) === "1") {
    return readDemoLinks();
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(demoSampleLinks));
  sessionStorage.setItem(DEMO_FLAG, "1");
  return demoSampleLinks;
}

export function readDemoLinks(): LinkRow[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as LinkRow[];
  } catch {
    return [];
  }
}

export function clearDemoLinks() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(DEMO_FLAG);
}
