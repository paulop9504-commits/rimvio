import { lockEntities } from "@/lib/search-intent/entity-lock";
import type { ResolvedEntity } from "@/lib/entity-resolver/types";
import {
  LOCATION_SEMANTIC_PATH,
  STATION_SEMANTIC_PATH,
} from "@/lib/entity-resolver/semantic-layer";

/** Entity-lock transit / airport / geo spans. */
export function resolveLockEntities(text: string): ResolvedEntity[] {
  const locks = lockEntities(text);
  const out: ResolvedEntity[] = [];
  for (const lock of locks) {
    if (lock.kind === "transit") {
      const isAirport = /공항|airport/iu.test(lock.value);
      out.push({
        id: isAirport ? `airport:${lock.value}` : `station:${lock.value}`,
        kind: isAirport ? "Airport" : "Station",
        label: lock.value,
        aliases: [lock.value],
        semanticPath: isAirport
          ? ["Airport", "Transit"]
          : [...STATION_SEMANTIC_PATH],
        confidence: 0.9,
        source: "entity_lock",
        span: { start: lock.start, end: lock.end },
        queryFocus: lock.value,
      });
      continue;
    }
    if (lock.kind === "geo") {
      out.push({
        id: `location:${lock.value}`,
        kind: "Location",
        label: lock.value,
        aliases: [lock.value],
        semanticPath: [...LOCATION_SEMANTIC_PATH],
        confidence: 0.75,
        source: "entity_lock",
        span: { start: lock.start, end: lock.end },
        queryFocus: lock.value,
      });
    }
  }
  return out;
}
