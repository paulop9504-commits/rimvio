import type { EventCandidate } from "@/lib/events/event-candidate";
import { extractHubRunnableAction } from "@/lib/globe/context-hub/extract-hub-runnable-action";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { HubRunnablePill } from "@/lib/situation-projection/types";

export type HubPillTapResult =
  | {
      kind: "navigate";
      href: string;
      internalRoute: boolean;
      labelKo: string;
    }
  | {
      kind: "knowledge_capture";
      anchorEventId: string;
      knowledgeBoxLabel: string;
      ghostNodeId: string | null;
    }
  | {
      kind: "context_run";
      anchorEventId: string;
      ghostAxisId: string;
      searchQuery: string | null;
    }
  | {
      kind: "coming_soon";
      labelKo: string;
    };

/** Execute Hub pill tap — routes to in-app Hub or capture; never writes truth. */
export function resolveHubPillTap(input: {
  pill: HubRunnablePill;
  event: EventCandidate;
}): HubPillTapResult {
  const { pill, event } = input;

  if (pill.actionKind === "knowledge_capture") {
    return {
      kind: "knowledge_capture",
      anchorEventId: event.id,
      knowledgeBoxLabel: pill.labelKo,
      ghostNodeId: pill.linkedNodeId ?? null,
    };
  }

  if (pill.actionKind === "coming_soon" || !pill.implemented) {
    return { kind: "coming_soon", labelKo: pill.labelKo };
  }

  if (pill.actionKind === "context_run" && pill.ghostAxisId) {
    return {
      kind: "context_run",
      anchorEventId: event.id,
      ghostAxisId: pill.ghostAxisId,
      searchQuery: pill.searchQuery?.trim() || null,
    };
  }

  if (pill.actionKind === "hub_service") {
    if (pill.hubServiceId) {
      const bundle = listContextHubServicesForEvent(event);
      const row = bundle?.services.find((s) => s.serviceId === pill.hubServiceId);
      if (row) {
        const action = extractHubRunnableAction(row);
        if (action?.href || pill.href) {
          return {
            kind: "navigate",
            href: action?.href ?? pill.href!,
            internalRoute: action?.internalRoute ?? pill.internalRoute ?? false,
            labelKo: action?.label ?? pill.labelKo,
          };
        }
      }
    }
    if (pill.href) {
      return {
        kind: "navigate",
        href: pill.href,
        internalRoute: pill.internalRoute ?? false,
        labelKo: pill.labelKo,
      };
    }
  }

  return { kind: "coming_soon", labelKo: pill.labelKo };
}
