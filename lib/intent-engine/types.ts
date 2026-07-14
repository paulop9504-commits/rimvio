/**
 * Rimvio Intent Engine — NL → structured Intent Blueprint only.
 * Does not answer, plan, or execute. Unknown stays UNKNOWN.
 *
 * @see docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md (L1 Intent never mutates Reality)
 */

export const INTENT_ENGINE_VERSION = 1 as const;

export type IntentCategory =
  | "Travel"
  | "Shopping"
  | "Work"
  | "Study"
  | "Health"
  | "Food"
  | "Finance"
  | "Social"
  | "Entertainment"
  | "Lifestyle"
  | "Project"
  | "UNKNOWN";

export type IntentMood =
  | "Romantic"
  | "Luxury"
  | "Minimal"
  | "Indie"
  | "Relax"
  | "Adventure"
  | "Family"
  | "Photography"
  | "Nature"
  | "Nightlife"
  | "Local"
  | "Business"
  | "UNKNOWN";

/** Closed style tokens from Intent Library (not free text). */
export type IntentStyleToken =
  | "vintage"
  | "film"
  | "local"
  | "cafe"
  | "bookstore"
  | "vinyl"
  | "quiet"
  | "minimal"
  | "creative"
  | "privacy"
  | "night_view"
  | "photo"
  | "relaxed_pace"
  | "packed_pace"
  | "value"
  | "premium"
  | "station_access"
  | "family_friendly"
  | "UNKNOWN";

export type FactKind = "explicit" | "inferred";

/** Atomic intent hit before semantic expand. */
export type ParsedIntentHit = {
  libraryId: string;
  category: IntentCategory;
  labelKo: string;
  /** How facts were obtained for this hit. */
  factKind: FactKind;
  confidence: number;
  /** Span / cue that triggered the library row (trace only). */
  cue?: string;
};

/** Semantic attribute map — numbers in [0,1] or closed budget bands. */
export type SemanticProfile = {
  readonly romantic?: number;
  readonly privacy?: number;
  readonly photo?: number;
  readonly night_view?: number;
  readonly shopping?: number;
  readonly local?: number;
  readonly cafe?: number;
  readonly quiet?: number;
  readonly luxury?: number;
  readonly adventure?: number;
  readonly family?: number;
  readonly business?: number;
  readonly pace_relaxed?: number;
  readonly pace_packed?: number;
  /** Closed band — never invent exact KRW. */
  readonly budget?: "value" | "medium" | "medium_high" | "premium" | "UNKNOWN";
};

export type EnrichedIntent = {
  libraryId: string;
  category: IntentCategory;
  labelKo: string;
  factKind: FactKind;
  confidence: number;
  moods: IntentMood[];
  styles: IntentStyleToken[];
  profile: SemanticProfile;
  constraints: string[];
  priorities: string[];
};

export type IntentBlueprint = {
  version: typeof INTENT_ENGINE_VERSION;
  /** Source utterance (fact). Empty if none. */
  sourceText: string;
  intents: EnrichedIntent[];
  mood: IntentMood[];
  style: IntentStyleToken[];
  constraints: string[];
  priority: string[];
  /** Merged semantic profile after composer + conflict resolver. */
  mergedProfile: SemanticProfile;
  confidence: number;
  missing_information: string[];
  follow_up_questions: string[];
};

export type IntentLibraryEntry = {
  id: string;
  category: IntentCategory;
  labelKo: string;
  /** Deterministic cue matchers — map to library meaning, not to actions. */
  cues: RegExp[];
  moods: IntentMood[];
  styles: IntentStyleToken[];
  profile: SemanticProfile;
  constraints?: string[];
  priorities?: string[];
  missingWhenAlone?: string[];
  followUpsWhenAlone?: string[];
};
