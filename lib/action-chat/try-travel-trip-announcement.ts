import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { buildExtractedDataFromText } from "@/lib/action-chat/confirmation-logic";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import {
  generateActionCandidatesSync,
  llmCandidatesToOverlayActions,
} from "@/lib/llm-action-candidate-generator";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  isFutureScheduledDatetime,
  type ScheduledActionDelivery,
} from "@/lib/action-chat/scheduled-action-delivery";
import type { LinkActionItem } from "@/types/database";
import {
  extractTravelDestination,
  isTravelDestinationAmbiguous,
  isTravelTripAnnouncement,
} from "@/lib/experience-run/extract-travel-destination";

export {
  extractTravelDestination,
  isTravelDestinationAmbiguous,
  isTravelTripAnnouncement,
} from "@/lib/experience-run/extract-travel-destination";

function overlayToLinkActions(  overlays: ReturnType<typeof llmCandidatesToOverlayActions>,
): LinkActionItem[] {
  return overlays.map((item) => {
    const href =
      item.deeplink ??
      resolvePluginDeeplink(item.plugin, { label: item.label }) ??
      "rimvio://chat/followup";

    return createOpenAction({
      label: item.label,
      href,
      icon: item.action_tier === "MAIN" ? "🎯" : "✨",
      payload: {
        plugin: item.plugin ?? undefined,
        action_tier: item.action_tier ?? "AUX",
      },
    });
  });
}

/**
 * "20시간 뒤 오사카 여행감" → travel prep actions (not DECISION A/B/C).
 */
export function tryTravelTripAnnouncement(input: {
  message: string;
  referenceDate?: string;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!isTravelTripAnnouncement(message)) {
    return null;
  }

  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const destination = extractTravelDestination(message);
  const datetime = parseRelativeDateTimeFromText(message, referenceDate);
  const extracted = buildExtractedDataFromText(message, referenceDate);

  const minutesUntil =
    datetime != null
      ? Math.max(0, Math.round((new Date(datetime).getTime() - Date.now()) / 60_000))
      : null;

  const ecId = `trip-${destination ?? "travel"}-${Date.now()}`;
  const candidateResult = generateActionCandidatesSync(ecId, {
    title: destination ? `${destination} 여행` : message,
    location: destination,
    minutes_until_event: minutesUntil,
    message,
  });

  const overlays = llmCandidatesToOverlayActions(
    candidateResult.candidates,
    destination,
  );

  if (overlays.length === 0) {
    return null;
  }

  const actions = overlayToLinkActions(overlays);
  const destLabel = destination ?? "여행";
  const timeHint =
    minutesUntil != null && minutesUntil <= 48 * 60
      ? ` **${Math.round(minutesUntil / 60)}시간 뒤**`
      : datetime
        ? ` **${datetime.slice(0, 16).replace("T", " ")}**`
        : "";

  const resolvedDatetime = datetime ?? extracted.datetime;
  const scheduleExtract = {
    ...extracted,
    place_name: destination ?? extracted.place_name,
    datetime: resolvedDatetime,
    title: `${destLabel} 여행`,
  };

  const scheduledDelivery: ScheduledActionDelivery | undefined =
    resolvedDatetime && isFutureScheduledDatetime(resolvedDatetime)
      ? { fire_at: resolvedDatetime, status: "pending" }
      : undefined;

  return {
    summary: `**${destLabel} 여행**${timeHint}으로 잡았어요. 준비부터 볼게요.`,
    actions,
    source: "rules",
    confidence: 0.9,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    scheduleExtract,
    scheduledDelivery,
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
      ai_intent: undefined,
      semantic_reason: "travel_trip_announcement",
    },
  };
}
