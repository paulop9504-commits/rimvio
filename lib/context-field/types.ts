/**
 * Context Field IR — typed constraints compiled from natural language.
 * Write targets remain LocalDiscoveryActionSpec + GraphFilterPredicate.
 */

import type {
  LocalDiscoveryBudget,
  LocalDiscoveryTransport,
  LocalDiscoveryVibe,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export type ContextFieldId =
  | "price"
  | "budget"
  | "location"
  | "distance"
  | "popularity"
  | "mood"
  | "category"
  | "companion"
  | "transport"
  | "weather"
  | "crowd"
  | "time";

export type ContextCompanion = "solo" | "date" | "family" | "group";

export type ContextFieldHints = {
  readonly weather?: "rain";
  readonly crowd?: "no_wait";
  readonly timeScope?: "today";
};

export type ContextPriceField = {
  readonly id: "price";
  readonly maxKrw: number | null;
  readonly confidence: number;
};

export type ContextBudgetField = {
  readonly id: "budget";
  readonly softBudget: LocalDiscoveryBudget;
  readonly confidence: number;
};

export type ContextLocationField = {
  readonly id: "location";
  readonly nearHotel: boolean;
  readonly areaHint: string | null;
  readonly confidence: number;
};

export type ContextDistanceField = {
  readonly id: "distance";
  readonly maxWalkMinutes: number | null;
  readonly closer: boolean;
  readonly confidence: number;
};

export type ContextPopularityField = {
  readonly id: "popularity";
  readonly localFavoriteOnly: boolean;
  readonly vibe: Extract<LocalDiscoveryVibe, "local" | "popular" | "hot"> | null;
  readonly confidence: number;
};

export type ContextMoodField = {
  readonly id: "mood";
  readonly vibe: LocalDiscoveryVibe;
  readonly confidence: number;
};

export type ContextCategoryField = {
  readonly id: "category";
  readonly label: string;
  readonly cuisineId: string | null;
  readonly confidence: number;
};

export type ContextCompanionField = {
  readonly id: "companion";
  readonly value: ContextCompanion;
  readonly confidence: number;
};

export type ContextTransportField = {
  readonly id: "transport";
  readonly value: LocalDiscoveryTransport;
  readonly confidence: number;
};

export type ContextWeatherField = {
  readonly id: "weather";
  readonly value: "rain";
  readonly confidence: number;
};

export type ContextCrowdField = {
  readonly id: "crowd";
  readonly value: "no_wait";
  readonly confidence: number;
};

export type ContextTimeField = {
  readonly id: "time";
  readonly value: "today";
  readonly confidence: number;
};

export type ContextField =
  | ContextPriceField
  | ContextBudgetField
  | ContextLocationField
  | ContextDistanceField
  | ContextPopularityField
  | ContextMoodField
  | ContextCategoryField
  | ContextCompanionField
  | ContextTransportField
  | ContextWeatherField
  | ContextCrowdField
  | ContextTimeField;

export type ContextFieldPack = {
  readonly version: 1;
  readonly fields: readonly ContextField[];
  readonly price: ContextPriceField | null;
  readonly budget: ContextBudgetField | null;
  readonly location: ContextLocationField | null;
  readonly distance: ContextDistanceField | null;
  readonly popularity: ContextPopularityField | null;
  readonly mood: ContextMoodField | null;
  readonly category: ContextCategoryField | null;
  readonly companion: ContextCompanionField | null;
  readonly transport: ContextTransportField | null;
  readonly weather: ContextWeatherField | null;
  readonly crowd: ContextCrowdField | null;
  readonly time: ContextTimeField | null;
};
