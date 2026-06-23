import type { MarketGlobePinRole } from "@/lib/feed/experience-globe-ping-types";

export function marketGlobePinRoleLabelKo(role: MarketGlobePinRole): string {
  return role === "seeking" ? "구매" : "내놓기";
}
