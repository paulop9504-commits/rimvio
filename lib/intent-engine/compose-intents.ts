import type {
  EnrichedIntent,
  IntentMood,
  IntentStyleToken,
  SemanticProfile,
} from "@/lib/intent-engine/types";

function maxNum(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null) {
    return b;
  }
  if (b == null) {
    return a;
  }
  return Math.max(a, b);
}

const BUDGET_RANK: Record<NonNullable<SemanticProfile["budget"]>, number> = {
  value: 1,
  medium: 2,
  medium_high: 3,
  premium: 4,
  UNKNOWN: 0,
};

function mergeBudget(
  a: SemanticProfile["budget"] | undefined,
  b: SemanticProfile["budget"] | undefined,
): SemanticProfile["budget"] | undefined {
  if (!a || a === "UNKNOWN") {
    return b;
  }
  if (!b || b === "UNKNOWN") {
    return a;
  }
  return BUDGET_RANK[a] >= BUDGET_RANK[b] ? a : b;
}

/** Intent Composer — merge multiple enriched intents into one semantic surface. */
export function composeIntents(intents: EnrichedIntent[]): {
  mood: IntentMood[];
  style: IntentStyleToken[];
  constraints: string[];
  priority: string[];
  mergedProfile: SemanticProfile;
  confidence: number;
} {
  if (intents.length === 0) {
    return {
      mood: ["UNKNOWN"],
      style: ["UNKNOWN"],
      constraints: [],
      priority: [],
      mergedProfile: {},
      confidence: 0,
    };
  }

  const mood = uniquePreserveOrder(intents.flatMap((i) => i.moods));
  const style = uniquePreserveOrder(intents.flatMap((i) => i.styles));
  const constraints = uniquePreserveOrder(intents.flatMap((i) => i.constraints));
  const priority = uniquePreserveOrder(intents.flatMap((i) => i.priorities));

  let mergedProfile: SemanticProfile = {};
  for (const intent of intents) {
    mergedProfile = mergeProfiles(mergedProfile, intent.profile);
  }

  const confidence = clamp01(
    intents.reduce((sum, i) => sum + i.confidence, 0) / intents.length,
  );

  return { mood, style, constraints, priority, mergedProfile, confidence };
}

export function mergeProfiles(a: SemanticProfile, b: SemanticProfile): SemanticProfile {
  return {
    romantic: maxNum(a.romantic, b.romantic),
    privacy: maxNum(a.privacy, b.privacy),
    photo: maxNum(a.photo, b.photo),
    night_view: maxNum(a.night_view, b.night_view),
    shopping: maxNum(a.shopping, b.shopping),
    local: maxNum(a.local, b.local),
    cafe: maxNum(a.cafe, b.cafe),
    quiet: maxNum(a.quiet, b.quiet),
    luxury: maxNum(a.luxury, b.luxury),
    adventure: maxNum(a.adventure, b.adventure),
    family: maxNum(a.family, b.family),
    business: maxNum(a.business, b.business),
    pace_relaxed: maxNum(a.pace_relaxed, b.pace_relaxed),
    pace_packed: maxNum(a.pace_packed, b.pace_packed),
    budget: mergeBudget(a.budget, b.budget),
  };
}

function uniquePreserveOrder<T extends string>(values: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    out.push(value);
  }
  return out;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
