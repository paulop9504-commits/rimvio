import type { ComposerDecisionPhase } from "@/lib/context-run/execution-decision";
import type { ContextRunSurfaceResolutionFull } from "@/lib/context-run/surface-resolver";
import type { ExternalContextAskResult } from "@/lib/external-context-ask";
import type { ExperienceRunResult } from "@/lib/experience-run/experience-run-types";
import type { GlobeMapIntentSupplyResult } from "@/lib/globe/intent-supply/globe-map-intent-types";
import type { PersonalContextAskResult } from "@/lib/personal-context-ask/personal-context-ask-types";
import type { GlobeBulkMediaIngestSummary } from "@/lib/feed/ingest-globe-context-media";
import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";

export type ContextRunIngress =
  | {
      kind: "text";
      text: string;
      surface: "composer" | "capture_sheet";
      layerMode: "personal" | "discovery";
      contextEventId?: string | null;
      lat?: number | null;
      lng?: number | null;
    }
  | {
      kind: "photo";
      files: File[];
      surface: "composer" | "capture_sheet" | "globe_home";
      layerMode: "personal" | "discovery";
      mode: "direct" | "walkthrough";
      contextEventId?: string | null;
      hintTitle?: string | null;
      forceAttachToTarget?: boolean;
    }
  | {
      kind: "share";
      text: string;
      shareKind: "url" | "memo";
      surface: "capture_sheet";
      layerMode: "personal" | "discovery";
    }
  | {
      kind: "gps_dwell_confirm";
      eventId: string;
      surface: "globe_inbox";
    };

export type BoundSituation = {
  graphId: string;
  goalKo: string;
  ingress: ContextRunIngress;
};

export type ContextRunPlanKind =
  | "noop"
  | "discovery_browse"
  | "discovery_hint"
  | "external_url"
  | "market_quick_list"
  | "market_portal"
  | "map_intent_supply"
  | "text_ingest"
  | "experience_run"
  | "personal_context_ask"
  | "external_context_ask"
  | "photo_ingest"
  | "photo_walkthrough"
  | "discovery_photo_hint"
  | "share_ingest"
  | "gps_dwell_confirm_open"
  | "mention_contract"
  | "portal_compose_run";

export type ContextRunPlan = {
  kind: ContextRunPlanKind;
  graphId: string;
  goalKo: string;
  composerPhase?: ComposerDecisionPhase;
  composeText?: string;
  url?: string;
  urlLabel?: string;
  supplyInput?: {
    message: string;
    contextEventId?: string | null;
    lat?: number | null;
    lng?: number | null;
    layerMode: "personal" | "discovery";
  };
  photoInput?: {
    files: File[];
    contextEventId?: string | null;
    hintTitle?: string | null;
    forceAttachToTarget?: boolean;
  };
  shareText?: string;
  gpsDwellEventId?: string;
  mentionFeatureId?: string;
  mentionContextKey?: string;
  mentionSourceRef?: string;
  routingMessage?: string;
  contractAction?: string | null;
  needsConfirmOnly?: boolean;
  portalIntentId?: PortalIntentId;
  portalCategoryId?: PortalCategoryId | null;
  resumePortalRun?: boolean;
  /** Personal composer — greet / ambiguous text → chat only; do not bind active map cluster. */
  composeAmbientChat?: boolean;
};

export type ContextRunEffectHandlers = {
  openPortal: (input: {
    eventId?: string | null;
    composeText?: string;
  }) => void | Promise<void>;
  openFieldDiscovery: () => void;
  tryQuickListMarket: (composeText: string) => Promise<boolean>;
  navigateUrl: (url: string, label: string) => void;
  onLodgingDiscovery?: (input: {
    eventId: string;
    summaryKo: string;
  }) => void;
  onEateryDiscovery?: (input: {
    eventId: string;
    summaryKo: string;
  }) => void;
  onAttached?: (
    eventId: string,
    options?: { needsPlaceVerify?: boolean },
  ) => void;
  onTextIngested?: (input: {
    eventId: string;
    toastLine: string;
    needsPlaceVerify?: boolean;
  }) => void;
  toastSuccess?: (message: string) => void;
  toastMessage?: (message: string) => void;
  onExperienceRunClarify?: (
    result: Extract<ExperienceRunResult, { kind: "clarify" }>,
  ) => void;
  onExperienceRunSummary?: (
    result: Extract<ExperienceRunResult, { kind: "summary" }>,
  ) => void;
  onPersonalContextAsk?: (result: PersonalContextAskResult) => void;
  onExternalContextAsk?: (result: ExternalContextAskResult) => void;
  onExternalContextAskError?: () => void;
  onPhotoWalkthrough?: (files: File[]) => void | Promise<void>;
  onPhotoIngested?: (summary: GlobeBulkMediaIngestSummary) => void;
  onPhotoIngestProgress?: (done: number, total: number) => void;
  onPhotoFilePrepare?: (message: string) => void;
  onShareIngested?: () => void;
  onGpsDwellConfirmOpen?: (eventId: string) => void;
  onPortalComposeClarify?: (input: {
    questionKo: string;
    slotId: string;
  }) => void;
  onLaunchMarketProjection?: (input: {
    draft: MarketIntentDraft;
    eventId: string;
    composeText: string;
  }) => void;
  /** Composer — keep market prep in Execution Feed chat; sheet opens on CTA only. */
  onMarketComposeFeedReady?: (input: {
    kind: "wizard" | "quick_list";
    draft?: MarketIntentDraft;
    eventId: string;
    composeText: string;
  }) => void;
};

export type ContextRunTurnResult = {
  graphId: string;
  status: "noop" | "done" | "error";
  planKind: ContextRunPlanKind;
  surface?: ContextRunSurfaceResolutionFull;
  supply?: GlobeMapIntentSupplyResult | null;
  experienceRun?: ExperienceRunResult;
  personalAsk?: PersonalContextAskResult;
  externalAsk?: ExternalContextAskResult;
  errorMessage?: string;
};
