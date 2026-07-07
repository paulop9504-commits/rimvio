import { buildGoogleCalendarTemplateHref } from "@/lib/actions/search-urls";
import { copy } from "@/lib/copy/human-ko";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { buildEateryInfraActions } from "@/lib/globe/eatery/eatery-infra-actions";

const SCHEDULE_HINT_RE =
  /일정|예약\s*시간|캘린더|calendar|schedule|저녁|점심|아침|브런치|몇\s*시/u;

export type PalantirCommitActionKind = "navigate" | "schedule";

export type PalantirCommitAction = {
  readonly kind: PalantirCommitActionKind;
  readonly featureId: "navigate" | "schedule";
  readonly labelKo: string;
  readonly href: string;
  readonly fallbackHref?: string | null;
};

function buildNavigateAction(input: {
  recommendation: ContextConditionRecommendation;
  anchorPlaceName: string;
}): PalantirCommitAction {
  const infra = buildEateryInfraActions({
    name: input.recommendation.title,
    lat: input.recommendation.lat,
    lng: input.recommendation.lng,
    contextPlace: input.anchorPlaceName,
  });
  const primary = infra.find((row) => row.id === "navigate") ?? infra[0];
  return {
    kind: "navigate",
    featureId: "navigate",
    labelKo: copy.globe.palantirCommitNavigate(input.recommendation.title),
    href: primary?.href ?? "",
    fallbackHref: primary?.fallbackHref ?? null,
  };
}

function buildScheduleAction(input: {
  recommendation: ContextConditionRecommendation;
  anchorPlaceName: string;
}): PalantirCommitAction {
  const title = input.recommendation.title.trim();
  const area = input.anchorPlaceName.trim();
  return {
    kind: "schedule",
    featureId: "schedule",
    labelKo: copy.globe.palantirCommitSchedule(title),
    href: buildGoogleCalendarTemplateHref({
      title: area ? `${title} — ${area}` : title,
      details: input.recommendation.reasonKo.trim() || undefined,
      location: title,
    }),
  };
}

/** Operator commit rail — one @ action (navigate or schedule) for the primary projection. */
export function resolvePalantirCommitAction(input: {
  recommendation: ContextConditionRecommendation;
  anchorPlaceName: string;
  triggerMessage?: string | null;
  eventDatetime?: string | null;
}): PalantirCommitAction {
  const message = input.triggerMessage?.trim() ?? "";
  const wantsSchedule =
    Boolean(input.eventDatetime?.trim()) || SCHEDULE_HINT_RE.test(message);

  if (wantsSchedule) {
    return buildScheduleAction(input);
  }
  return buildNavigateAction(input);
}

export function openPalantirCommitAction(action: PalantirCommitAction): void {
  if (!action.href.trim()) {
    return;
  }
  if (action.href.startsWith("http://") || action.href.startsWith("https://")) {
    window.open(action.href, "_blank", "noopener,noreferrer");
    return;
  }
  window.location.assign(action.href);
}
