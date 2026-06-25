import type { MarketGlobePinRole } from "@/lib/feed/experience-globe-ping-types";

export function marketGlobePinRoleLabelKo(role: MarketGlobePinRole): string {
  return role === "seeking" ? "구하기" : "내놓기";
}
