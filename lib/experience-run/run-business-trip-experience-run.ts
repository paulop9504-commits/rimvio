import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import { readClientMasterOrchestratorContext } from "@/lib/experience-context/read-client-master-orchestrator-context";
import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import type {
  ExperienceRunProfile,
  ExperienceRunStep,
  ExperienceRunSummary,
} from "@/lib/experience-run/experience-run-types";
import { dispatchGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { resolveContextLodgingSearchCoords } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import { detectEaterySearchIntent } from "@/lib/globe/eatery/detect-eatery-search-intent";
import { runGlobeEateryDiscovery } from "@/lib/globe/eatery/run-globe-eatery-discovery";
import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";
import { runGlobeLodgingDiscovery } from "@/lib/globe/lodging/run-globe-lodging-discovery";
import { copy } from "@/lib/copy/human-ko";

export type RunBusinessTripExperienceInput = {
  message: string;
  profile: ExperienceRunProfile;
  lat?: number | null;
  lng?: number | null;
  referenceDate?: string;
  travelSlots?: import("@/lib/experience-run/travel-context-slots").TravelFilledSlots | null;
};

function step(
  id: ExperienceRunStep["id"],
  status: ExperienceRunStep["status"],
  labelKo: string,
): ExperienceRunStep {
  return { id, status, labelKo };
}

function buildMeaningLine(
  unified: ReturnType<typeof buildUnifiedExperienceContext>,
): string | null {
  const place = unified.personExperienceSlice[0]?.places[0]?.label;
  const name = unified.matchedPeople[0]?.displayName;
  if (place && name) {
    return copy.globe.experienceRun.meaningPeoplePlace(name, place);
  }
  return null;
}

/** Execute agent run — event → hub (lodging or eatery) → map (client only). */
export async function runBusinessTripExperienceRun(
  input: RunBusinessTripExperienceInput,
): Promise<ExperienceRunSummary> {
  const runId = `run-${Date.now()}`;

  const steps: ExperienceRunStep[] = [
    step("context_event", "running", copy.globe.experienceRun.stepContext),
  ];

  const event = ensureTripContextEvent({
    message: input.message,
    referenceDate: input.referenceDate,
    profile: input.profile,
    travelSlots: input.travelSlots ?? null,
  });
  steps[0] = step("context_event", "done", copy.globe.experienceRun.stepContext);

  const searchOrigin = resolveContextLodgingSearchCoords(event, {
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: true,
  });
  const lat = searchOrigin?.lat ?? null;
  const lng = searchOrigin?.lng ?? null;

  dispatchGlobeContextHubOpen({
    contextEventId: event.id,
    source: "programmatic",
  });

  const masterContext = readClientMasterOrchestratorContext();
  const unified = buildUnifiedExperienceContext({
    message: input.message,
    masterContext,
  });
  const meaningLine = buildMeaningLine(unified);

  const wantsEatery =
    input.profile === "eatery_search" ||
    (detectEaterySearchIntent(input.message) != null &&
      input.profile !== "lodging_search" &&
      detectLodgingSearchIntent(input.message) == null);

  const wantsLodging =
    input.profile === "lodging_search" ||
    input.profile === "business_trip" ||
    detectLodgingSearchIntent(input.message) != null ||
    /(?:숙소|호텔|묵|잠|stay|hotel)/iu.test(input.message);

  if (wantsEatery && !wantsLodging) {
    return runEateryBranch({
      runId,
      profile: input.profile,
      message: input.message,
      event,
      lat,
      lng,
      meaningLine,
      steps,
    });
  }

  if (!wantsLodging) {
    return {
      runId,
      profile: input.profile,
      titleKo: event.title,
      bodyKo: copy.globe.experienceRun.bodyContextOnly(event.title),
      meaningLineKo: meaningLine,
      eventId: event.id,
      steps: [
        ...steps,
        step("hub_lodging", "skipped", copy.globe.experienceRun.stepLodging),
        step("hub_eatery", "skipped", copy.globe.experienceRun.stepEatery),
        step("map_reveal", "skipped", copy.globe.experienceRun.stepMap),
        step("summary", "done", copy.globe.experienceRun.stepSummary),
      ],
    };
  }

  return runLodgingBranch({
    runId,
    profile: input.profile,
    message: input.message,
    event,
    lat,
    lng,
    meaningLine,
    steps,
  });
}

async function runEateryBranch(input: {
  runId: string;
  profile: ExperienceRunProfile;
  message: string;
  event: ReturnType<typeof ensureTripContextEvent>;
  lat: number | null;
  lng: number | null;
  meaningLine: string | null;
  steps: ExperienceRunStep[];
}): Promise<ExperienceRunSummary> {
  const steps = [
    ...input.steps,
    step("hub_eatery", "running", copy.globe.experienceRun.stepEatery),
  ];

  const eateryMessage =
    detectEaterySearchIntent(input.message) != null
      ? input.message
      : `${input.message} 맛집 추천`;

  const outcome = await runGlobeEateryDiscovery({
    message: eateryMessage,
    contextEventId: input.event.id,
    lat: input.lat,
    lng: input.lng,
    searching: true,
  });

  if (!outcome) {
    steps.push(step("hub_eatery", "failed", copy.globe.experienceRun.stepEatery));
    steps.push(step("map_reveal", "skipped", copy.globe.experienceRun.stepMap));
    steps.push(step("summary", "done", copy.globe.experienceRun.stepSummary));
    return {
      runId: input.runId,
      profile: input.profile,
      titleKo: input.event.title,
      bodyKo: copy.globe.experienceRun.bodyEateryPending(input.event.title),
      meaningLineKo: input.meaningLine,
      eventId: input.event.id,
      steps,
    };
  }

  steps.push(step("hub_eatery", "done", copy.globe.experienceRun.stepEatery));
  steps.push(step("map_reveal", "done", copy.globe.experienceRun.stepMap));
  steps.push(step("summary", "done", copy.globe.experienceRun.stepSummary));

  return {
    runId: input.runId,
    profile: input.profile,
    titleKo: input.event.title,
    bodyKo: outcome.summaryKo,
    meaningLineKo: input.meaningLine,
    eventId: input.event.id,
    topEateryName: outcome.topName,
    topEateryReasonKo: outcome.topReasonKo,
    eateryCount: outcome.resourceIds.length,
    steps,
  };
}

async function runLodgingBranch(input: {
  runId: string;
  profile: ExperienceRunProfile;
  message: string;
  event: ReturnType<typeof ensureTripContextEvent>;
  lat: number | null;
  lng: number | null;
  meaningLine: string | null;
  steps: ExperienceRunStep[];
}): Promise<ExperienceRunSummary> {
  const steps = [
    ...input.steps,
    step("hub_lodging", "running", copy.globe.experienceRun.stepLodging),
  ];

  const lodgingMessage =
    detectLodgingSearchIntent(input.message) != null
      ? input.message
      : `${input.message} 숙소 추천`;

  const outcome = await runGlobeLodgingDiscovery({
    message: lodgingMessage,
    contextEventId: input.event.id,
    lat: input.lat,
    lng: input.lng,
    searching: false,
  });

  if (!outcome) {
    steps.push(step("hub_lodging", "failed", copy.globe.experienceRun.stepLodging));
    steps.push(step("map_reveal", "skipped", copy.globe.experienceRun.stepMap));
    steps.push(step("summary", "done", copy.globe.experienceRun.stepSummary));
    return {
      runId: input.runId,
      profile: input.profile,
      titleKo: input.event.title,
      bodyKo: copy.globe.experienceRun.bodyLodgingPending(input.event.title),
      meaningLineKo: input.meaningLine,
      eventId: input.event.id,
      steps,
    };
  }

  steps.push(step("hub_lodging", "done", copy.globe.experienceRun.stepLodging));
  steps.push(step("map_reveal", "done", copy.globe.experienceRun.stepMap));
  steps.push(step("summary", "done", copy.globe.experienceRun.stepSummary));

  return {
    runId: input.runId,
    profile: input.profile,
    titleKo: input.event.title,
    bodyKo: outcome.summaryKo,
    meaningLineKo: input.meaningLine,
    eventId: input.event.id,
    topLodgingName: outcome.topName,
    topLodgingReasonKo: outcome.topReasonKo,
    lodgingCount: outcome.resourceIds.length,
    steps,
  };
}
