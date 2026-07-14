import { classifyContextConditionAnchorRequest } from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import {
  INSTANT_POI_RADIUS_M,
  resolveInstantPoiFocus,
} from "@/lib/globe/context-condition-ai/instant-poi-search";
import {
  isInstantLodgingSearch,
} from "@/lib/globe/context-condition-ai/instant-lodging-search";
import {
  isInstantEaterySearch,
  resolveInstantEateryFocus,
} from "@/lib/globe/context-condition-ai/instant-eatery-search";
import type {
  LocalDiscoveryActionSpec,
  LocalDiscoveryActivitySubtype,
  LocalDiscoveryBudget,
  LocalDiscoveryLodgingKind,
  LocalDiscoveryPendingAnswers,
  LocalDiscoveryQuestion,
  LocalDiscoveryQuestionChoice,
  LocalDiscoveryResourceType,
  LocalDiscoveryTransport,
  LocalDiscoveryVibe,
  ResolveLocalDiscoveryActionInput,
  ResolveLocalDiscoveryActionResult,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { isAlternatePlaceSearch } from "@/lib/globe/context-condition-ai/is-alternate-place-search";
import { isAmbiguousDiscoveryIntent } from "@/lib/globe/context-condition-ai/is-cross-domain-discovery-search";
import {
  parseActivityFocusDetail,
  parseActivitySpecificFocus,
  parseActivitySubtype,
  parseAmenityFocus,
  resolveLocalDiscoveryDomain,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";
import {
  parseCuisineCandidates,
  parseSingleCuisineFocus,
  resolveCuisineFocusQuery,
  type CuisineCandidate,
} from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import { copy } from "@/lib/copy/human-ko";

const CONFIDENCE_SKIP = 0.58;

/** Delimiter for the activity node cluster stored in the (string-only) answers map. */
export const ACTIVITY_CLUSTER_DELIMITER = "·";

function radiusForTransport(transport: LocalDiscoveryTransport): number {
  switch (transport) {
    case "walk":
      return 800;
    case "transit":
      return 1200;
    case "car":
      return 2000;
    default:
      return 800;
  }
}

function parseTransport(text: string): LocalDiscoveryTransport | null {
  if (/도보|걸어|walking|walk|on foot/iu.test(text)) {
    return "walk";
  }
  if (/차량|차로|운전|drive|car/iu.test(text)) {
    return "car";
  }
  if (/대중|지하철|버스|transit|metro/iu.test(text)) {
    return "transit";
  }
  return null;
}

function parseBudget(text: string): LocalDiscoveryBudget | null {
  if (/싸|가성|저렴|budget|cheap|low/iu.test(text)) {
    return "low";
  }
  if (/고급|프리미엄|luxury|premium|high/iu.test(text)) {
    return "high";
  }
  if (/중간|medium|보통/iu.test(text)) {
    return "medium";
  }
  return null;
}

function parseVibe(text: string): LocalDiscoveryVibe | null {
  if (/조용|한적|quiet/iu.test(text)) {
    return "quiet";
  }
  if (/핫플|핫|hot|trendy/iu.test(text)) {
    return "hot";
  }
  if (/로컬|현지|local/iu.test(text)) {
    return "local";
  }
  if (/인기|유명|popular|rating/iu.test(text)) {
    return "popular";
  }
  return null;
}

function parseLodgingKind(text: string): LocalDiscoveryLodgingKind | null {
  if (/에어비|bnb|airbnb|민박/iu.test(text)) {
    return "airbnb";
  }
  if (
    /게스트\s*하우스|게스트하우스|호스텔|hostel|guesthouse|guest\s*house/iu.test(
      text,
    )
  ) {
    return "hotel";
  }
  if (/호텔|hotel|료칸|ryokan|펜션/iu.test(text)) {
    return "hotel";
  }
  return null;
}

function buildTransportQuestion(): LocalDiscoveryQuestion {
  return {
    slot: "transport",
    promptKo: copy.globe.localDiscoveryAskTransport,
    choices: [
      { id: "transport-walk", label: copy.globe.localDiscoveryTransportWalk, slot: "transport", value: "walk" },
      { id: "transport-car", label: copy.globe.localDiscoveryTransportCar, slot: "transport", value: "car" },
      { id: "transport-transit", label: copy.globe.localDiscoveryTransportTransit, slot: "transport", value: "transit" },
    ],
  };
}

function buildBudgetQuestion(): LocalDiscoveryQuestion {
  return {
    slot: "budget",
    promptKo: copy.globe.localDiscoveryAskBudget,
    choices: [
      { id: "budget-low", label: copy.globe.localDiscoveryBudgetLow, slot: "budget", value: "low" },
      { id: "budget-medium", label: copy.globe.localDiscoveryBudgetMedium, slot: "budget", value: "medium" },
      { id: "budget-high", label: copy.globe.localDiscoveryBudgetHigh, slot: "budget", value: "high" },
    ],
  };
}

function buildVibeQuestion(): LocalDiscoveryQuestion {
  return {
    slot: "vibe",
    promptKo: copy.globe.localDiscoveryAskVibe,
    choices: [
      { id: "vibe-quiet", label: copy.globe.localDiscoveryVibeQuiet, slot: "vibe", value: "quiet" },
      { id: "vibe-popular", label: copy.globe.localDiscoveryVibePopular, slot: "vibe", value: "popular" },
      { id: "vibe-local", label: copy.globe.localDiscoveryVibeLocal, slot: "vibe", value: "local" },
      { id: "vibe-hot", label: copy.globe.localDiscoveryVibeHot, slot: "vibe", value: "hot" },
    ],
  };
}

function buildLodgingKindQuestion(): LocalDiscoveryQuestion {
  return {
    slot: "lodgingKind",
    promptKo: copy.globe.localDiscoveryAskLodgingKind,
    choices: [
      { id: "lodging-hotel", label: copy.globe.localDiscoveryLodgingHotel, slot: "lodgingKind", value: "hotel" },
      { id: "lodging-airbnb", label: copy.globe.localDiscoveryLodgingAirbnb, slot: "lodgingKind", value: "airbnb" },
      { id: "lodging-any", label: copy.globe.localDiscoveryLodgingAny, slot: "lodgingKind", value: "any" },
    ],
  };
}

function buildResourceFocusQuestion(): LocalDiscoveryQuestion {
  return {
    slot: "resourceFocus",
    promptKo: copy.globe.localDiscoveryAskResourceFocus,
    choices: [
      {
        id: "resource-restaurant",
        label: copy.globe.localDiscoveryResourceRestaurant,
        slot: "resourceFocus",
        value: "restaurant",
      },
      {
        id: "resource-hotel",
        label: copy.globe.localDiscoveryResourceHotel,
        slot: "resourceFocus",
        value: "hotel",
      },
      {
        id: "resource-both",
        label: copy.globe.localDiscoveryResourceBoth,
        slot: "resourceFocus",
        value: "both",
      },
    ],
  };
}

const CLARIFY_QUESTION_PRIORITY: readonly LocalDiscoveryQuestion["slot"][] = [
  "resourceFocus",
  "menuFocus",
  "lodgingKind",
  "vibe",
  "transport",
  "budget",
];

function pickClarifyingQuestions(
  questions: readonly LocalDiscoveryQuestion[],
): LocalDiscoveryQuestion[] {
  for (const slot of CLARIFY_QUESTION_PRIORITY) {
    const match = questions.find((row) => row.slot === slot);
    if (match) {
      return [match];
    }
  }
  return questions.slice(0, 1);
}

function resolveWantsFromResourceFocus(
  focus: string | undefined,
): { wantsLodging: boolean; wantsEatery: boolean } | null {
  if (focus === "restaurant") {
    return { wantsLodging: false, wantsEatery: true };
  }
  if (focus === "hotel") {
    return { wantsLodging: true, wantsEatery: false };
  }
  if (focus === "both") {
    return { wantsLodging: true, wantsEatery: true };
  }
  return null;
}

function resolveResourceTypes(input: {
  wantsLodging: boolean;
  wantsEatery: boolean;
}): LocalDiscoveryResourceType[] {
  const types: LocalDiscoveryResourceType[] = [];
  if (input.wantsEatery) {
    types.push("restaurant");
  }
  if (input.wantsLodging) {
    types.push("hotel");
  }
  if (types.length === 0) {
    return ["restaurant", "hotel"];
  }
  return types;
}

function buildMenuFocusQuestion(cuisines: readonly CuisineCandidate[]): LocalDiscoveryQuestion {
  return {
    slot: "menuFocus",
    promptKo: copy.globe.localDiscoveryAskMenuFocus,
    choices: cuisines.map((row) => ({
      id: `menu-${row.id}`,
      label: row.labelKo,
      slot: "menuFocus" as const,
      value: row.id,
    })),
  };
}

function composeSpec(input: {
  resourceTypes: readonly LocalDiscoveryResourceType[];
  transport: LocalDiscoveryTransport;
  budget: LocalDiscoveryBudget;
  vibe: LocalDiscoveryVibe;
  lodgingKind: LocalDiscoveryLodgingKind;
  eateryFocus?: string | null;
  activityFocus?: string | null;
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  activityCluster?: readonly string[] | null;
}): LocalDiscoveryActionSpec {
  const cluster = input.activityCluster?.filter((node) => node.trim().length > 0);
  const amenityOnly =
    input.resourceTypes.length === 1 && input.resourceTypes[0] === "amenity";
  return {
    version: 1,
    resourceTypes: input.resourceTypes,
    transport: input.transport,
    budget: input.budget,
    vibe: input.vibe,
    lodgingKind: input.lodgingKind,
    radiusM: amenityOnly ? INSTANT_POI_RADIUS_M : radiusForTransport(input.transport),
    ...(input.eateryFocus?.trim() ? { eateryFocus: input.eateryFocus.trim() } : {}),
    ...(input.activityFocus?.trim()
      ? { activityFocus: input.activityFocus.trim() }
      : {}),
    ...(input.activitySubtype ? { activitySubtype: input.activitySubtype } : {}),
    ...(cluster && cluster.length > 0 ? { activityCluster: cluster } : {}),
  };
}

/**
 * Activity/amenity queries use a generic place loader — never fall back to the
 * hotel channel. Clarify chips (broad "놀거리") are asked upstream in the pin bar.
 */
function resolveDiscoveryDomainSpec(input: {
  text: string;
  answers: LocalDiscoveryPendingAnswers;
  previousSpec: LocalDiscoveryActionSpec | null;
}): LocalDiscoveryActionSpec | null {
  const instantFocus = resolveInstantPoiFocus(input.text);
  if (instantFocus) {
    const transport =
      (input.answers.transport as LocalDiscoveryTransport | undefined) ??
      parseTransport(input.text) ??
      input.previousSpec?.transport ??
      "walk";
    const budget =
      (input.answers.budget as LocalDiscoveryBudget | undefined) ??
      parseBudget(input.text) ??
      input.previousSpec?.budget ??
      "medium";
    return composeSpec({
      resourceTypes: ["amenity"],
      transport,
      budget,
      vibe: parseVibe(input.text) ?? input.previousSpec?.vibe ?? "popular",
      lodgingKind: "any",
      activityFocus: instantFocus,
      activitySubtype: null,
      activityCluster: null,
    });
  }

  if (isInstantLodgingSearch(input.text)) {
    const transport =
      (input.answers.transport as LocalDiscoveryTransport | undefined) ??
      parseTransport(input.text) ??
      input.previousSpec?.transport ??
      "walk";
    const budget =
      (input.answers.budget as LocalDiscoveryBudget | undefined) ??
      parseBudget(input.text) ??
      input.previousSpec?.budget ??
      "medium";
    const lodgingKind =
      (input.answers.lodgingKind as LocalDiscoveryLodgingKind | undefined) ??
      parseLodgingKind(input.text) ??
      input.previousSpec?.lodgingKind ??
      "any";
    return composeSpec({
      resourceTypes: ["hotel"],
      transport,
      budget,
      vibe: parseVibe(input.text) ?? input.previousSpec?.vibe ?? "popular",
      lodgingKind,
    });
  }

  if (isInstantEaterySearch(input.text)) {
    const transport =
      (input.answers.transport as LocalDiscoveryTransport | undefined) ??
      parseTransport(input.text) ??
      input.previousSpec?.transport ??
      "walk";
    const budget =
      (input.answers.budget as LocalDiscoveryBudget | undefined) ??
      parseBudget(input.text) ??
      input.previousSpec?.budget ??
      "medium";
    const eateryFocus = resolveInstantEateryFocus(input.text);
    return composeSpec({
      resourceTypes: ["restaurant"],
      transport,
      budget,
      vibe: parseVibe(input.text) ?? input.previousSpec?.vibe ?? "popular",
      lodgingKind: "any",
      ...(eateryFocus ? { eateryFocus } : {}),
    });
  }

  // A converged chip (activityFocus) is a concrete place query — route it
  // through the generic activity loader regardless of the original wording
  // (e.g. cafe/date convergence produces a full query, not an activity keyword).
  const convergedFocus = input.answers.activityFocus?.trim();
  const domain = convergedFocus ? "activity" : resolveLocalDiscoveryDomain(input.text);
  if (!domain) {
    return null;
  }
  const activityCluster = input.answers.activityCluster
    ?.split(ACTIVITY_CLUSTER_DELIMITER)
    .map((node) => node.trim())
    .filter((node) => node.length > 0);
  const focusDetail =
    domain === "activity"
      ? parseActivityFocusDetail(convergedFocus || input.text)
      : null;
  const activityFocus =
    convergedFocus ||
    (domain === "amenity"
      ? resolveInstantPoiFocus(input.text) ?? parseAmenityFocus(input.text)
      : focusDetail?.focus ?? parseActivitySpecificFocus(input.text)) ||
    null;
  const activitySubtype =
    domain === "activity"
      ? focusDetail?.subtype ??
        parseActivitySubtype(convergedFocus) ??
        parseActivitySubtype(input.text) ??
        "general"
      : null;
  const transport =
    (input.answers.transport as LocalDiscoveryTransport | undefined) ??
    parseTransport(input.text) ??
    input.previousSpec?.transport ??
    "walk";
  const budget =
    (input.answers.budget as LocalDiscoveryBudget | undefined) ??
    parseBudget(input.text) ??
    input.previousSpec?.budget ??
    "medium";
  return composeSpec({
    resourceTypes: [domain],
    transport,
    budget,
    vibe: parseVibe(input.text) ?? input.previousSpec?.vibe ?? "popular",
    lodgingKind: "any",
    activityFocus,
    activitySubtype,
    activityCluster: domain === "activity" ? activityCluster : null,
  });
}

/** Trigger → structured context. Questions when slots are ambiguous. */
export function resolveLocalDiscoveryAction(
  input: ResolveLocalDiscoveryActionInput,
): ResolveLocalDiscoveryActionResult {
  const text = input.message.trim();
  const answers: LocalDiscoveryPendingAnswers = { ...(input.answers ?? {}) };

  const domainSpec = resolveDiscoveryDomainSpec({
    text,
    answers,
    previousSpec: input.previousSpec ?? null,
  });
  if (domainSpec) {
    return { status: "ready", spec: domainSpec, answers };
  }

  const intent = classifyContextConditionAnchorRequest(text);
  const cuisineCandidates = parseCuisineCandidates(text);
  const resourceFocus = answers.resourceFocus;
  const focusWants = resolveWantsFromResourceFocus(resourceFocus);
  let wantsLodging =
    focusWants?.wantsLodging ?? input.wantsLodging ?? intent.lodgingSimilar;
  let wantsEatery =
    focusWants?.wantsEatery ??
    input.wantsEatery ??
    intent.eateryNearby ??
    cuisineCandidates.length > 0;
  const followUpTurn = input.followUpTurn === true;
  const previousSpec = input.previousSpec ?? null;

  let transport =
    (answers.transport as LocalDiscoveryTransport | undefined) ??
    parseTransport(text) ??
    input.inferredTransport ??
    null;

  let budget =
    (answers.budget as LocalDiscoveryBudget | undefined) ??
    parseBudget(text) ??
    input.inferredBudget ??
    null;

  let vibe =
    (answers.vibe as LocalDiscoveryVibe | undefined) ??
    parseVibe(text) ??
    input.inferredVibe ??
    null;

  let lodgingKind =
    (answers.lodgingKind as LocalDiscoveryLodgingKind | undefined) ??
    parseLodgingKind(text) ??
    input.inferredLodgingKind ??
    (wantsLodging ? "any" : "any");

  if (followUpTurn && previousSpec) {
    transport = transport ?? previousSpec.transport;
    budget = budget ?? previousSpec.budget;
    vibe = vibe ?? previousSpec.vibe;
    if (!parseLodgingKind(text) && !answers.lodgingKind) {
      lodgingKind = previousSpec.lodgingKind;
    }
  }

  const resourceTypes = resolveResourceTypes({ wantsLodging, wantsEatery });

  const menuFocusId =
    answers.menuFocus ??
    (cuisineCandidates.length === 1 ? cuisineCandidates[0]?.id : null) ??
    null;
  const eateryFocus =
    resolveCuisineFocusQuery(menuFocusId) ?? parseSingleCuisineFocus(text);
  const hasNarrowEateryFocus = Boolean(eateryFocus?.trim());

  const partial: Partial<LocalDiscoveryActionSpec> = {
    resourceTypes,
    lodgingKind,
    ...(eateryFocus ? { eateryFocus } : {}),
    ...(transport != null ? { transport } : {}),
    ...(budget != null ? { budget } : {}),
    ...(vibe != null ? { vibe } : {}),
  };

  const questions: LocalDiscoveryQuestion[] = [];

  if (isAmbiguousDiscoveryIntent(text) && !resourceFocus) {
    questions.push(buildResourceFocusQuestion());
  }

  if (wantsEatery && cuisineCandidates.length > 1 && !menuFocusId) {
    questions.push(buildMenuFocusQuestion(cuisineCandidates));
  }

  const skipMobilityBudgetQuestions =
    (followUpTurn && !parseTransport(text) && !parseBudget(text)) ||
    hasNarrowEateryFocus;

  if (
    !skipMobilityBudgetQuestions &&
    !transport &&
    (input.mobilityConfidence ?? 0) < CONFIDENCE_SKIP
  ) {
    questions.push(buildTransportQuestion());
  }
  if (
    !skipMobilityBudgetQuestions &&
    !budget &&
    (input.budgetConfidence ?? 0) < CONFIDENCE_SKIP
  ) {
    questions.push(buildBudgetQuestion());
  }
  if (
    !vibe &&
    wantsEatery &&
    !hasNarrowEateryFocus &&
    (input.foodConfidence ?? 0) < CONFIDENCE_SKIP
  ) {
    questions.push(buildVibeQuestion());
  }
  if (
    wantsLodging &&
    !answers.lodgingKind &&
    !parseLodgingKind(text) &&
    (input.lodgingConfidence ?? 0) < CONFIDENCE_SKIP &&
    lodgingKind === "any"
  ) {
    questions.push(buildLodgingKindQuestion());
  }

  if (questions.length > 0) {
    const prioritized = pickClarifyingQuestions(questions);
    return {
      status: "questions",
      questions: prioritized,
      answers,
      partial,
    };
  }

  return {
    status: "ready",
    spec: composeSpec({
      resourceTypes,
      transport: transport ?? "walk",
      budget: budget ?? "medium",
      vibe: vibe ?? "popular",
      lodgingKind: lodgingKind ?? "any",
      eateryFocus,
    }),
    answers,
  };
}

/** Continuous refinement — merge follow-up into existing spec. */
export function refineLocalDiscoverySpec(
  spec: LocalDiscoveryActionSpec,
  message: string,
): LocalDiscoveryActionSpec {
  const text = message.trim();
  if (!text) {
    return spec;
  }
  const wantsCloser = /더\s*가까|더\s*근처|가까운|closer|nearer/iu.test(text);
  const transport = parseTransport(text);
  const budget = parseBudget(text);
  const vibe = parseVibe(text);
  const lodgingKind = parseLodgingKind(text);
  const nextTransport = wantsCloser ? "walk" : (transport ?? spec.transport);
  return composeSpec({
    resourceTypes: spec.resourceTypes,
    transport: nextTransport,
    budget: budget ?? spec.budget,
    vibe: vibe ?? spec.vibe,
    lodgingKind: lodgingKind ?? spec.lodgingKind,
  });
}

function isLodgingKindRefinement(text: string): boolean {
  const kind = parseLodgingKind(text);
  if (!kind) {
    return false;
  }
  return !/주변|근처|찾|검색|추천|배치|nearby|search/iu.test(text);
}

export function isLocalDiscoveryRefinement(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }
  const intent = classifyContextConditionAnchorRequest(text);
  const hasNewSearchCue = /주변|근처|찾|검색|추천|배치|nearby|search/iu.test(text);
  if (hasNewSearchCue && (intent.lodgingSimilar || intent.eateryNearby)) {
    return false;
  }
  if (isAmbiguousDiscoveryIntent(text)) {
    return false;
  }
  return Boolean(
    isAlternatePlaceSearch(text) ||
      parseTransport(text) ||
      parseBudget(text) ||
      parseVibe(text) ||
      isLodgingKindRefinement(text) ||
      /더\s*싸|더\s*조용|더\s*가까|더\s*근처|가까운/iu.test(text),
  );
}

export function applyQuestionChoice(input: {
  answers: LocalDiscoveryPendingAnswers;
  choice: LocalDiscoveryQuestionChoice;
}): LocalDiscoveryPendingAnswers {
  const cluster = input.choice.cluster?.filter((node) => node.trim().length > 0);
  return {
    ...input.answers,
    [input.choice.slot]: input.choice.value,
    // A chip answer is a trigger: carry its activated node cluster so retrieval
    // can multi-query the reconstructed context, not just the single keyword.
    ...(cluster && cluster.length > 0
      ? { activityCluster: cluster.join(ACTIVITY_CLUSTER_DELIMITER) }
      : {}),
  };
}
