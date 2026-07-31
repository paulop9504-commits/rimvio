/**
 * Intent Router — InteractionMode before tool/domain routing.
 * Soft propose → Draft plan → Hard Workspace. Not a parallel Ultimate Parser.
 */

export const INTERACTION_MODES = [
  "chat",
  "explore",
  "create",
  "manage",
  "execute",
] as const;

export type InteractionMode = (typeof INTERACTION_MODES)[number];

export const INTENT_DOMAINS = [
  "travel",
  "finance",
  "shopping",
  "real_estate",
  "health",
  "work",
  "education",
  "general",
] as const;

export type IntentDomain = (typeof INTENT_DOMAINS)[number];

/**
 * soft — propose only ("이런 작업으로 보입니다")
 * draft — AI prepared Intent Plan / Context draft (not Workspace yet)
 * hard — Workspace open / actions possible
 */
export type IntentConfidence = "soft" | "draft" | "hard";

/** Active Context changes SEARCH → add_entity / project_update. */
export type IntentContextState = "none" | "active_project";

export type IntentSurface =
  | "chat"
  | "globe_explore"
  | "workspace"
  | "execute_queue"
  | "soft_propose"
  | "draft_preview";

export type IntentRoute = {
  readonly mode: InteractionMode;
  readonly domain: IntentDomain;
  readonly confidence: IntentConfidence;
  readonly contextState: IntentContextState;
  /** SEARCH inside active project → patch graph, not cold explore. */
  readonly action:
    | "none"
    | "chat"
    | "explore"
    | "create_project"
    | "add_entity"
    | "project_update"
    | "execute";
  readonly surface: IntentSurface;
  readonly destinationKo: string | null;
  readonly stayLabelKo: string | null;
  readonly reasonKo: string;
};
