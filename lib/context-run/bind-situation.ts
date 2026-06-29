import type {
  BoundSituation,
  ContextRunIngress,
} from "@/lib/context-run/ingress-types";
import { buildComposerGraphId } from "@/lib/context-run/resolve-globe-composer-surface";

function readGoalKo(ingress: ContextRunIngress): string {
  switch (ingress.kind) {
    case "text":
    case "share":
      return ingress.text.trim();
    case "photo": {
      const first = ingress.files[0]?.name?.trim();
      if (first) {
        return ingress.files.length > 1 ? `${first} 외 ${ingress.files.length - 1}장` : first;
      }
      return ingress.files.length > 1
        ? `사진 ${ingress.files.length}장`
        : "사진";
    }
    case "gps_dwell_confirm":
      return "위치 확인";
    default:
      return "";
  }
}

function readGraphSeed(ingress: ContextRunIngress): string {
  switch (ingress.kind) {
    case "text":
    case "share":
      return ingress.text.trim();
    case "photo": {
      const first = ingress.files[0]?.name ?? "file";
      return `photo:${ingress.mode}:${ingress.files.length}:${first}`;
    }
    case "gps_dwell_confirm":
      return `gps_dwell:${ingress.eventId}`;
    default:
      return "noop";
  }
}

function readContextEventId(ingress: ContextRunIngress): string | null | undefined {
  if (ingress.kind === "gps_dwell_confirm") {
    return ingress.eventId;
  }
  if (ingress.kind === "text" || ingress.kind === "photo") {
    return ingress.contextEventId;
  }
  return null;
}

/** Lightweight situation bind — no full truth dump (Cursor-style context slice). */
export function bindSituation(ingress: ContextRunIngress): BoundSituation {
  const goalKo = readGoalKo(ingress);
  const graphId = buildComposerGraphId(readContextEventId(ingress), readGraphSeed(ingress));
  return {
    graphId,
    goalKo,
    ingress,
  };
}
