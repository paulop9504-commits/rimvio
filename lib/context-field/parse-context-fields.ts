/**
 * Deterministic Korean NL → ContextFieldPack.
 * Shared by discovery resolve/refine and graph filter parse.
 */

import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import { parseUtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import type {
  LocalDiscoveryBudget,
  LocalDiscoveryTransport,
  LocalDiscoveryVibe,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type {
  ContextCompanion,
  ContextField,
  ContextFieldPack,
} from "@/lib/context-field/types";

export function parseTransportField(text: string): LocalDiscoveryTransport | null {
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

export function parseBudgetField(text: string): LocalDiscoveryBudget | null {
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

/** Mood / vibe cues — quiet wins over hot over local over popular. */
export function parseVibeField(text: string): LocalDiscoveryVibe | null {
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

export function parseCompanionField(text: string): ContextCompanion | null {
  if (/혼자|솔로|혼자\s*가|solo/iu.test(text)) {
    return "solo";
  }
  if (/데이트|연인|커플|couple|date\s*night/iu.test(text)) {
    return "date";
  }
  if (/가족|아이\s*동반|kids|family/iu.test(text)) {
    return "family";
  }
  if (/친구\s*들?|단체|그룹|party|group/iu.test(text)) {
    return "group";
  }
  return null;
}

export function parseMaxWalkMinutesField(text: string): number | null {
  const walk = text.match(
    /(?:걸어서|도보|walking)?\s*(\d+)\s*분\s*(?:안|이내|내|이하)?/iu,
  );
  if (walk?.[1]) {
    const n = Number(walk[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function parseCategoryLabel(text: string, dishFocus: string | null, cuisineId: string | null): {
  label: string;
  cuisineId: string | null;
} | null {
  if (dishFocus?.trim()) {
    return { label: dishFocus.trim(), cuisineId };
  }
  if (/고깃집|고기집|고기\s*집|야키니쿠|焼肉|yakiniku|bbq/iu.test(text)) {
    return { label: "고깃집", cuisineId: cuisineId ?? "yakiniku" };
  }
  return null;
}

function emptyPack(fields: readonly ContextField[]): ContextFieldPack {
  const byId = Object.fromEntries(fields.map((f) => [f.id, f])) as Partial<
    Record<ContextField["id"], ContextField>
  >;
  return {
    version: 1,
    fields,
    price: (byId.price as ContextFieldPack["price"]) ?? null,
    budget: (byId.budget as ContextFieldPack["budget"]) ?? null,
    location: (byId.location as ContextFieldPack["location"]) ?? null,
    distance: (byId.distance as ContextFieldPack["distance"]) ?? null,
    popularity: (byId.popularity as ContextFieldPack["popularity"]) ?? null,
    mood: (byId.mood as ContextFieldPack["mood"]) ?? null,
    category: (byId.category as ContextFieldPack["category"]) ?? null,
    companion: (byId.companion as ContextFieldPack["companion"]) ?? null,
    transport: (byId.transport as ContextFieldPack["transport"]) ?? null,
    weather: (byId.weather as ContextFieldPack["weather"]) ?? null,
    crowd: (byId.crowd as ContextFieldPack["crowd"]) ?? null,
    time: (byId.time as ContextFieldPack["time"]) ?? null,
  };
}

/** Compile utterance constraints into a ContextFieldPack. */
export function parseContextFields(message: string): ContextFieldPack {
  const text = message.trim();
  if (!text) {
    return emptyPack([]);
  }

  const fields: ContextField[] = [];
  const slots = parseUtteranceIntentSlots(text);

  const maxKrw = parseMaxNightlyPriceKrw(text);
  if (maxKrw != null) {
    fields.push({ id: "price", maxKrw, confidence: 0.95 });
  }

  const softBudget = parseBudgetField(text);
  if (softBudget) {
    fields.push({ id: "budget", softBudget, confidence: 0.85 });
  }

  const nearHotel = /(?:호텔|숙소|게스트\s*하우스|호스텔)\s*(?:근처|주변|곁|옆)/iu.test(
    text,
  );
  const areaHint = slots.areaHint?.trim() || slots.stationHint?.trim() || null;
  if (nearHotel || areaHint) {
    fields.push({
      id: "location",
      nearHotel,
      areaHint,
      confidence: nearHotel ? 0.9 : 0.75,
    });
  }

  const maxWalkMinutes = parseMaxWalkMinutesField(text);
  const closer = /더\s*가까|더\s*근처|가까운|closer|nearer/iu.test(text);
  if (maxWalkMinutes != null || closer) {
    fields.push({
      id: "distance",
      maxWalkMinutes,
      closer,
      confidence: maxWalkMinutes != null ? 0.92 : 0.8,
    });
  }

  const localFavoriteOnly =
    /현지인|로컬\s*(?:맛집|만)|local\s*favorite|현지\s*(?:만|맛집)/iu.test(text);
  const popularityVibe = parseVibeField(text);
  if (
    localFavoriteOnly ||
    popularityVibe === "local" ||
    popularityVibe === "popular" ||
    popularityVibe === "hot"
  ) {
    const vibe =
      popularityVibe === "quiet"
        ? null
        : popularityVibe === "local" ||
            popularityVibe === "popular" ||
            popularityVibe === "hot"
          ? popularityVibe
          : localFavoriteOnly
            ? "local"
            : null;
    fields.push({
      id: "popularity",
      localFavoriteOnly,
      vibe,
      confidence: 0.88,
    });
  }

  const moodVibe = parseVibeField(text);
  if (moodVibe === "quiet") {
    fields.push({ id: "mood", vibe: "quiet", confidence: 0.9 });
  } else if (moodVibe && !localFavoriteOnly) {
    // Non-quiet vibes also recorded as mood when not already popularity-primary.
    fields.push({ id: "mood", vibe: moodVibe, confidence: 0.8 });
  }

  const category = parseCategoryLabel(text, slots.dishFocus, slots.cuisineId);
  if (category) {
    fields.push({
      id: "category",
      label: category.label,
      cuisineId: category.cuisineId,
      confidence: slots.dishFocus ? 0.92 : 0.85,
    });
  }

  const companion = parseCompanionField(text);
  if (companion) {
    fields.push({ id: "companion", value: companion, confidence: 0.9 });
  }

  const transport = parseTransportField(text);
  if (transport) {
    fields.push({ id: "transport", value: transport, confidence: 0.9 });
  } else if (nearHotel || closer) {
    // Near-hotel / closer implies walk radius unless another mode is stated.
    fields.push({ id: "transport", value: "walk", confidence: 0.7 });
  }

  if (/비\s*오|비오|우천|장마|rain(?:y|ing)?/iu.test(text)) {
    fields.push({ id: "weather", value: "rain", confidence: 0.85 });
  }

  if (
    /웨이팅\s*없|대기\s*없|줄\s*없|대기\s*(?:시간\s*)?짧|기다림\s*없|no\s*wait/iu.test(
      text,
    )
  ) {
    fields.push({ id: "crowd", value: "no_wait", confidence: 0.88 });
  }

  if (/오늘|금일|\btoday\b/iu.test(text)) {
    fields.push({ id: "time", value: "today", confidence: 0.9 });
  }

  return emptyPack(fields);
}

/** True when pack has constraints that require re-scout / spatial patch. */
export function contextFieldsRequireSpatialPatch(pack: ContextFieldPack): boolean {
  if (pack.price?.maxKrw != null) {
    return true;
  }
  if (pack.distance?.maxWalkMinutes != null) {
    return true;
  }
  if (pack.popularity?.localFavoriteOnly && pack.category) {
    return true;
  }
  return false;
}
