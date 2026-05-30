import type { CanonicalContainerKey } from "@/lib/containers/container-types";

export type NotificationSource = "external" | "internal";

export type ShadowCategory = "CRITICAL" | "WORK" | "PERSONAL" | "PASSIVE" | "SPAM";

export type ShadowRouteTier = "popup" | "action_stream" | "shadow" | "drop";

export type FutureActionType =
  | "OPEN_ZOOM"
  | "OPEN_CALENDAR"
  | "OPEN_BOARDING_PASS"
  | "TRACK_PACKAGE"
  | "OPEN_NAVIGATION"
  | "OPEN_EXCHANGE"
  | "FETCH_RELATED_NEWS"
  | "OPEN_LINK"
  | "OPEN_SLACK"
  | "OPEN_KAKAOTALK"
  | "OPEN_EMAIL"
  | "JOIN_MEETING";

export type FutureActionWire = {
  type: FutureActionType;
  label: string;
  deepLink?: string;
  showAt?: string;
  container?: CanonicalContainerKey;
  confidence?: number;
};

export type BehaviorSignal =
  | "HIGH_ENGAGEMENT"
  | "LOW_ENGAGEMENT"
  | "IGNORED"
  | "REPEATED_PATTERN"
  | "UNKNOWN";

export type BehaviorProfile = {
  /** source_app → affinity 0-20 */
  appAffinity?: Record<string, number>;
  /** container → affinity 0-20 */
  containerAffinity?: Record<string, number>;
  /** category → engagement 0-20 */
  categoryEngagement?: Partial<Record<ShadowCategory, number>>;
};

export type NotificationEventInput = {
  source: NotificationSource;
  source_app: string;
  title: string;
  content: string;
  timestamp: string;
  active_container?: CanonicalContainerKey | null;
  behavior_profile?: BehaviorProfile;
  /** internal only — skip LLM, pre-known metadata */
  internal_kind?: "link_reminder" | "scheduled_nav" | "price_alert" | "calendar";
  fire_at?: string | null;
};

export type ShadowProcessedRecord = {
  id: string;
  ingested_at: string;
  source: NotificationSource;
  source_app: string;
  category: ShadowCategory;
  priority_score: number;
  route: ShadowRouteTier;
  summary: string;
  reason: string;
  container: CanonicalContainerKey | "UNKNOWN";
  future_actions: FutureActionWire[];
  /** Stage A only — never inferred without user events */
  behavior_signal: "UNKNOWN";
  container_enrichment: {
    target_container: CanonicalContainerKey | "UNKNOWN";
    confidence: number;
  };
  shadow_record: {
    store: boolean;
    expires_in_hours: number;
  };
  raw: NotificationEventInput;
};

export type BehaviorEventInput = {
  shadow_id: string;
  event: "opened" | "ignored" | "clicked_action" | "opened_container";
  action_type?: FutureActionType;
  response_ms?: number;
};

export const ROUTE_THRESHOLDS = {
  popup: 95,
  action_stream: 80,
} as const;

export const CONTAINER_BOOST_MATCH = 20;
export const ACTIONABLE_BOOST = 8;
