"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { dispatchGlobeMarketHubConnect } from "@/lib/globe/context-hub/globe-market-hub-bridge";
import {
  resolvePinScopeFromEventId,
  writeGlobeOrchestratorScopeHint,
} from "@/lib/globe/globe-orchestrator-scope-bridge";
import { isTicketQrViewerHref } from "@/lib/globe/ticket-scan-surface";
import { copy } from "@/lib/copy/human-ko";
import { dispatchGlobeBrainContextRunRequest } from "@/lib/globe/brain/globe-brain-context-run-bridge";
import type { HubPillTapResult } from "@/lib/situation-projection/resolve-hub-pill-tap";

function openExternalHref(href: string) {
  if (href.startsWith("/")) {
    window.location.assign(href);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function useGlobeContextBrainActions(
  event: EventCandidate | null,
  options?: {
    onActionHandled?: (result: HubPillTapResult) => void;
  },
) {
  const router = useRouter();

  return useCallback(
    (result: HubPillTapResult | null) => {
      if (!event || !result) {
        return;
      }

      switch (result.kind) {
        case "navigate": {
          if (result.internalRoute) {
            writeGlobeOrchestratorScopeHint({
              pinScope: resolvePinScopeFromEventId(event.id) ?? "internal",
              eventId: event.id,
              title: event.title,
            });
            if (result.href.startsWith("rimvio://market-hub")) {
              dispatchGlobeMarketHubConnect({ eventId: event.id });
              options?.onActionHandled?.(result);
              return;
            }
            router.push(result.href);
            options?.onActionHandled?.(result);
            return;
          }
          if (isTicketQrViewerHref(result.href)) {
            openExternalHref(result.href);
            options?.onActionHandled?.(result);
            return;
          }
          openExternalHref(result.href);
          options?.onActionHandled?.(result);
          return;
        }
        case "knowledge_capture": {
          writeGlobeOrchestratorScopeHint({
            pinScope: resolvePinScopeFromEventId(event.id) ?? "internal",
            eventId: event.id,
            title: event.title,
          });
          toast(copy.globe.contextBrainKnowledgeCapture(result.knowledgeBoxLabel));
          router.push("/search");
          options?.onActionHandled?.(result);
          return;
        }
        case "context_run": {
          if (result.ghostAxisId === "eatery" || result.ghostAxisId === "lodging") {
            dispatchGlobeBrainContextRunRequest({
              anchorEventId: result.anchorEventId,
              ghostAxisId: result.ghostAxisId,
              searchQuery:
                result.searchQuery?.trim() ||
                event.place?.trim() ||
                event.title.trim(),
            });
            options?.onActionHandled?.(result);
            return;
          }
          writeGlobeOrchestratorScopeHint({
            pinScope: resolvePinScopeFromEventId(event.id) ?? "internal",
            eventId: event.id,
            title: event.title,
          });
          const params = new URLSearchParams({
            contextEventId: result.anchorEventId,
            q:
              result.searchQuery?.trim() ||
              event.place?.trim() ||
              event.title.trim(),
          });
          router.push(`/search?${params.toString()}`);
          options?.onActionHandled?.(result);
          return;
        }
        case "coming_soon":
          toast(copy.globe.contextBrainComingSoon(result.labelKo));
          options?.onActionHandled?.(result);
          return;
        default:
          return;
      }
    },
    [event, options, router],
  );
}
