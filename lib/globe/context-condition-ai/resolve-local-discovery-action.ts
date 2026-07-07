import { classifyContextConditionAnchorRequest } from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import type {
  LocalDiscoveryActionSpec,
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
import { copy } from "@/lib/copy/human-ko";
import {
  parseCuisineCandidates,
  parseSingleCuisineFocus,
  resolveCuisineFocusQuery,
  type CuisineCandidate,
} from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";

const CONFIDENCE_SKIP = 0.58;

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
  if (/호텔|hotel/iu.test(text)) {
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
}): LocalDiscoveryActionSpec {
  return {
    version: 1,
    resourceTypes: input.resourceTypes,
    transport: input.transport,
    budget: input.budget,
    vibe: input.vibe,
    lodgingKind: input.lodgingKind,
    radiusM: radiusForTransport(input.transport),
    ...(input.eateryFocus?.trim() ? { eateryFocus: input.eateryFocus.trim() } : {}),
  };
}

/** Trigger → structured context. Questions when slots are ambiguous. */
export function resolveLocalDiscoveryAction(
  input: ResolveLocalDiscoveryActionInput,
): ResolveLocalDiscoveryActionResult {
  const text = input.message.trim();
  const intent = classifyContextConditionAnchorRequest(text);
  const cuisineCandidates = parseCuisineCandidates(text);
  const wantsLodging = input.wantsLodging ?? intent.lodgingSimilar;
  const wantsEatery =
    input.wantsEatery ?? intent.eateryNearby ?? cuisineCandidates.length > 0;
  const resourceTypes = resolveResourceTypes({ wantsLodging, wantsEatery });

  const answers: LocalDiscoveryPendingAnswers = { ...(input.answers ?? {}) };

  const transport =
    (answers.transport as LocalDiscoveryTransport | undefined) ??
    parseTransport(text) ??
    input.inferredTransport ??
    null;

  const budget =
    (answers.budget as LocalDiscoveryBudget | undefined) ??
    parseBudget(text) ??
    input.inferredBudget ??
    null;

  const vibe =
    (answers.vibe as LocalDiscoveryVibe | undefined) ??
    parseVibe(text) ??
    input.inferredVibe ??
    null;

  const lodgingKind =
    (answers.lodgingKind as LocalDiscoveryLodgingKind | undefined) ??
    parseLodgingKind(text) ??
    input.inferredLodgingKind ??
    (wantsLodging ? "any" : "any");

  const menuFocusId =
    answers.menuFocus ??
    (cuisineCandidates.length === 1 ? cuisineCandidates[0]?.id : null) ??
    null;
  const eateryFocus =
    resolveCuisineFocusQuery(menuFocusId) ?? parseSingleCuisineFocus(text);

  const partial: Partial<LocalDiscoveryActionSpec> = {
    resourceTypes,
    lodgingKind,
    ...(eateryFocus ? { eateryFocus } : {}),
    ...(transport != null ? { transport } : {}),
    ...(budget != null ? { budget } : {}),
    ...(vibe != null ? { vibe } : {}),
  };

  const questions: LocalDiscoveryQuestion[] = [];

  if (wantsEatery && cuisineCandidates.length > 1 && !menuFocusId) {
    questions.push(buildMenuFocusQuestion(cuisineCandidates));
  }

  if (
    !transport &&
    (input.mobilityConfidence ?? 0) < CONFIDENCE_SKIP
  ) {
    questions.push(buildTransportQuestion());
  }
  if (!budget && (input.budgetConfidence ?? 0) < CONFIDENCE_SKIP) {
    questions.push(buildBudgetQuestion());
  }
  if (!vibe && wantsEatery && (input.foodConfidence ?? 0) < CONFIDENCE_SKIP) {
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
    return {
      status: "questions",
      questions,
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
  return {
    ...input.answers,
    [input.choice.slot]: input.choice.value,
  };
}
