/**
 * Trip Context Intelligence — NL → Blueprint purpose / traveler / priority.
 * Makes Globe Ingress output Context-OS quality, not just travel shell.
 */

export type TripPurpose =
  | "shopping_trip"
  | "food_trip"
  | "sightseeing_trip"
  | "general_trip";

export type TripTraveler = "solo" | "couple" | "family" | "group";

export type TripActivityPriority =
  | "shopping"
  | "food"
  | "sightseeing"
  | "rest"
  | "theme_park";

export type TripContextIntelligence = {
  readonly purpose: TripPurpose;
  readonly traveler: TripTraveler | null;
  readonly priority: readonly TripActivityPriority[];
  readonly companionMode: string | null;
  readonly participantsHint: number | null;
};

function detectTraveler(text: string): {
  traveler: TripTraveler | null;
  companionMode: string | null;
  participantsHint: number | null;
} {
  if (/혼자|solo|혼자\s*가/iu.test(text)) {
    return { traveler: "solo", companionMode: "solo", participantsHint: 1 };
  }
  if (/커플|둘이|연인|couple/iu.test(text)) {
    return { traveler: "couple", companionMode: "couple", participantsHint: 2 };
  }
  if (/가족|애들|아이|family/iu.test(text)) {
    return { traveler: "family", companionMode: "family", participantsHint: 3 };
  }
  if (/친구|단체|group/iu.test(text)) {
    return { traveler: "group", companionMode: "group", participantsHint: 4 };
  }
  return { traveler: null, companionMode: null, participantsHint: null };
}

function detectPurposeAndPriority(text: string): {
  purpose: TripPurpose;
  priority: TripActivityPriority[];
} {
  const shoppingHeavy =
    /쇼핑\s*중심|쇼핑\s*위주|쇼핑\s*위주|쇼핑\s*으로|shopping\s*focus|쇼핑\s*>\s*맛집|맛집보다\s*쇼핑/iu.test(
      text,
    );
  const foodHeavy =
    /맛집\s*중심|맛집\s*위주|미식|food\s*focus|쇼핑보다\s*맛집/iu.test(text);
  const sightHeavy =
    /관광\s*중심|관광\s*위주|명소\s*위주|sightseeing/iu.test(text);

  if (shoppingHeavy) {
    return {
      purpose: "shopping_trip",
      priority: ["shopping", "sightseeing", "food", "rest"],
    };
  }
  if (foodHeavy) {
    return {
      purpose: "food_trip",
      priority: ["food", "sightseeing", "shopping", "rest"],
    };
  }
  if (sightHeavy) {
    return {
      purpose: "sightseeing_trip",
      priority: ["sightseeing", "food", "shopping", "rest"],
    };
  }

  // Soft signals
  if (/쇼핑/iu.test(text) && /맛집/iu.test(text) && /보다/iu.test(text)) {
    if (/맛집보다/iu.test(text) || /쇼핑\s*중심/iu.test(text)) {
      return {
        purpose: "shopping_trip",
        priority: ["shopping", "food", "sightseeing", "rest"],
      };
    }
  }

  return {
    purpose: "general_trip",
    priority: ["sightseeing", "food", "shopping", "rest"],
  };
}

/**
 * Extract structured trip intelligence from user NL.
 */
export function extractTripContextIntelligence(
  utterance: string,
): TripContextIntelligence {
  const text = utterance.trim();
  const traveler = detectTraveler(text);
  const purpose = detectPurposeAndPriority(text);
  return {
    purpose: purpose.purpose,
    traveler: traveler.traveler,
    priority: purpose.priority,
    companionMode: traveler.companionMode,
    participantsHint: traveler.participantsHint,
  };
}
