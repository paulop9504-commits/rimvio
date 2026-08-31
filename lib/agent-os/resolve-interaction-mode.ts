/**
 * Main Agent interaction mode — when to open Workspace (P1).
 * Extends isWorkspaceAgentWorkUtterance; does not replace planContextRun.
 */

import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { isTripPrepUtterance } from "@/lib/action-planner/build-trip-prep-plan";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";
import { isCompoundActionUtterance } from "@/lib/action-planner";

export const MAIN_INTERACTION_MODES = [
  "simple_response",
  "interactive_workspace",
  "persistent_workspace",
] as const;

export type MainInteractionMode = (typeof MAIN_INTERACTION_MODES)[number];

const WEATHER_SIMPLE_RE =
  /(?:날씨|weather|기온|온도|비\s*올|맑|흐림).*(?:어때|알려|어떤|궁금)|(?:how\s+is\s+the\s+weather)/iu;

const BOOKING_INTERACTIVE_RE =
  /(?:호텔|숙소|맛집|식당).*(?:예약|준비|book)|(?:예약|준비).*(?:호텔|숙소)/iu;

/**
 * Decide whether Main Agent answers in chat vs opens Workspace.
 */
export function resolveInteractionMode(utterance: string): MainInteractionMode {
  const text = utterance.trim();
  if (!text) return "simple_response";

  if (WEATHER_SIMPLE_RE.test(text) && !isWorkspaceAgentWorkUtterance(text)) {
    return "simple_response";
  }

  if (!isWorkspaceAgentWorkUtterance(text)) {
    return "simple_response";
  }

  if (
    isTripPrepUtterance(text) ||
    isNewTripGlobeIngressUtterance(text) ||
    isCompoundActionUtterance(text) ||
    /(?:4|5|6|7)\s*(?:박|일)|일정\s*(?:짜|세워|관리)|여행\s*(?:준비|계획)|prep\s*(?:the\s*)?trip|plan\s*(?:my\s*)?(?:trip|days|itinerary)/iu.test(
      text,
    ) ||
    (BOOKING_INTERACTIVE_RE.test(text) &&
      /(?:4|5|6|7)\s*(?:박|일)|일정|관리|까지/iu.test(text))
  ) {
    return "persistent_workspace";
  }

  if (
    BOOKING_INTERACTIVE_RE.test(text) ||
    /(?:찾아|검색|보여|추천|비교)/iu.test(text)
  ) {
    return "interactive_workspace";
  }

  return "interactive_workspace";
}

export function shouldUseWorkspace(mode: MainInteractionMode): boolean {
  return mode !== "simple_response";
}

export function workspaceModeFromInteraction(
  mode: MainInteractionMode,
): "none" | "temporary" | "persistent" {
  switch (mode) {
    case "simple_response":
      return "none";
    case "interactive_workspace":
      return "temporary";
    case "persistent_workspace":
      return "persistent";
  }
}
