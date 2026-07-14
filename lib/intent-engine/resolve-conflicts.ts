import type { IntentBlueprint, SemanticProfile } from "@/lib/intent-engine/types";

/**
 * Conflict Resolver — deterministic rules when moods / pace / venue styles collide.
 * Prefers explicit multi-intent blend over dropping either side.
 */
export function resolveIntentConflicts(
  blueprint: Omit<IntentBlueprint, "mergedProfile" | "mood" | "style" | "constraints" | "priority"> & {
    mood: IntentBlueprint["mood"];
    style: IntentBlueprint["style"];
    constraints: string[];
    priority: string[];
    mergedProfile: SemanticProfile;
  },
): Pick<
  IntentBlueprint,
  "mergedProfile" | "mood" | "style" | "constraints" | "priority" | "missing_information" | "follow_up_questions"
> {
  const profile = { ...blueprint.mergedProfile };
  const mood = [...blueprint.mood];
  const style = [...blueprint.style];
  const constraints = [...blueprint.constraints];
  const priority = [...blueprint.priority];
  const missing = [...blueprint.missing_information];
  const followUps = [...blueprint.follow_up_questions];

  const hasRomantic = (profile.romantic ?? 0) >= 0.8 || mood.includes("Romantic");
  const hasIndie = mood.includes("Indie") || (profile.local ?? 0) >= 0.8;
  const hasFamily = (profile.family ?? 0) >= 0.8 || mood.includes("Family");
  const hasBusiness = (profile.business ?? 0) >= 0.8 || mood.includes("Business");

  // Romantic + Indie → privacy stays high; venue style leans local/cafe (not chain landmark).
  if (hasRomantic && hasIndie) {
    profile.privacy = Math.max(profile.privacy ?? 0, 0.85);
    profile.cafe = Math.max(profile.cafe ?? 0, 0.85);
    profile.local = Math.max(profile.local ?? 0, 0.85);
    profile.quiet = Math.max(profile.quiet ?? 0, 0.7);
    // Soften generic shopping relative to creative browsing.
    if ((profile.shopping ?? 0) < 0.5) {
      profile.shopping = 0.55;
    }
    upsertPriority(priority, "local", 0);
    upsertPriority(priority, "atmosphere", 1);
    if (!constraints.includes("prefer_indie_romantic_blend")) {
      constraints.push("prefer_indie_romantic_blend");
    }
  }

  // Family overrides nightlife / packed when colliding.
  if (hasFamily && mood.includes("Nightlife")) {
    removeMood(mood, "Nightlife");
    profile.pace_relaxed = Math.max(profile.pace_relaxed ?? 0, 0.75);
    profile.pace_packed = Math.min(profile.pace_packed ?? 0, 0.35);
  }

  // Business overrides romantic pace / aesthetic luxury pressure.
  if (hasBusiness) {
    profile.pace_packed = Math.max(profile.pace_packed ?? 0, 0.7);
    profile.pace_relaxed = Math.min(profile.pace_relaxed ?? 1, 0.4);
    upsertPriority(priority, "access", 0);
    if (!constraints.includes("near_station_or_venue")) {
      constraints.push("near_station_or_venue");
    }
  }

  // Packed vs relaxed — keep the higher signal; clear the weaker if gap large.
  if ((profile.pace_relaxed ?? 0) > 0.65 && (profile.pace_packed ?? 0) > 0.65) {
    if ((profile.pace_relaxed ?? 0) >= (profile.pace_packed ?? 0)) {
      profile.pace_packed = Math.min(profile.pace_packed ?? 0, 0.4);
    } else {
      profile.pace_relaxed = Math.min(profile.pace_relaxed ?? 0, 0.4);
    }
  }

  // Destination still unknown when travel-like but no place fact in text.
  const travelLike =
    blueprint.intents.some((i) => i.category === "Travel" || i.category === "Work") ||
    hasRomantic ||
    hasFamily;
  if (travelLike && !hasExplicitPlaceCue(blueprint.sourceText)) {
    if (!missing.includes("destination")) {
      missing.push("destination");
    }
    if (!followUps.includes("어디로 가실 예정인가요?")) {
      followUps.push("어디로 가실 예정인가요?");
    }
  }

  return {
    mergedProfile: profile,
    mood,
    style,
    constraints,
    priority,
    missing_information: missing,
    follow_up_questions: followUps,
  };
}

function upsertPriority(priority: string[], value: string, index: number): void {
  const filtered = priority.filter((p) => p !== value);
  filtered.splice(Math.min(index, filtered.length), 0, value);
  priority.length = 0;
  priority.push(...filtered);
}

function removeMood(mood: IntentBlueprint["mood"], value: IntentBlueprint["mood"][number]): void {
  const idx = mood.indexOf(value);
  if (idx >= 0) {
    mood.splice(idx, 1);
  }
}

function hasExplicitPlaceCue(text: string): boolean {
  return /(?:도쿄|오사카|교토|후쿠오카|삿포로|나고야|오키나와|서울|부산|제주|런던|파리|뉴욕|방콕|타이베이|오사까)/u.test(
    text,
  );
}
