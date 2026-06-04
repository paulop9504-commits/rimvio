import type { ActionDisclosureTier } from "@/lib/action-chat/action-confidence";

import type { LinkActionItem } from "@/types/database";
import type { TransportLiveCard } from "@/lib/transport/transport-live-types";
import type { ActionAgentBatchItem } from "@/lib/action-chat/action-agent-types";
import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { OrchestratorConfirmationWire } from "@/lib/action-chat/confirmation-types";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import type { ScheduledActionDelivery } from "@/lib/action-chat/scheduled-action-delivery";
import type { PresentationWire } from "@/lib/presentation/presentation-mode";
import type { KnowledgeContainerId } from "@/lib/knowledge/knowledge-entity-types";



export type OrchestratorIntent = "ACTION" | "SCHEDULE" | "CONTAINER_MGMT";

export type TrustLevelAdjustment = "NONE" | "INCREASE" | "DECREASE";

export type ContainerWireAction = "CREATE" | "UPDATE" | "NONE";



export type OrchestratorActionWire = {

  label: string;

  icon?: string;

  action_type?: "DEEP_LINK" | "WEB_VIEW" | string;

  url: string;

};



export type OrchestratorScheduleWire = {

  is_conflict: boolean;

  message: string;

  tasks: Array<{ time: string; task: string }>;

};



export type OrchestratorContainerWire = {

  action: ContainerWireAction;

  title: string;

  should_save: boolean;

};



export type OrchestratorMetadataWire = {

  intent: OrchestratorIntent;

  trust_level_adjustment: TrustLevelAdjustment;

  /** Active container route for this turn (client persistence bridge). */
  container_id?: string;

  /** Sensitive action gate — HIGH requires authentication before execution. */
  security_level?: "LOW" | "MEDIUM" | "HIGH";

};

export type IntentRouteMeta = {

  intent_type: "NEW_TASK" | "CONTINUE";

  requires_context_switch: boolean;

  current_topic?: string | null;

  relevance_score?: number;

  micro_intent?: "CONTINUE" | "ACK" | "CLOSE" | "DIRECT_QUERY" | "PASSIVE_STATE" | "SOFT_SHIFT" | "NONE";

  micro_confidence?: number;

  stability_score?: number;

  /** 0–1 — lower means do not push follow-up questions. */
  turn_pressure?: number;

  /** Kernel projection — replaces legacy FOLLOW_UP concept. */
  continuity?: "CONTINUE" | "NEW_TASK" | "SHIFT" | "HOLD";

  kernel_entropy?: number;

  kernel_decision?: "DIRECT_ACTION" | "OPTIONS" | "CLARIFY";

  /** Immutable Kernel wire for UI renderer — presentation only. */
  kernel_ui?: import("@/lib/event-kernel/render-kernel-ui").KernelUiRenderInput;

  /** Kernel memory output — continuity only, not for intent decisions. */
  kernel_memory?: import("@/lib/event-kernel/memory/types").EventKernelMemoryOutput;

  /** Kernel search plan — design only, not execution. */
  kernel_search_plan?: import("@/lib/event-kernel/search-planner/types").EventKernelSearchPlan;

  execution_mode?: "action" | "conversation";

};



export type MasterOrchestratorWire = {

  summary: string;

  confidence_score?: number;

  metadata?: OrchestratorMetadataWire;

  meta?: IntentRouteMeta;

  actions: OrchestratorActionWire[];

  schedule?: OrchestratorScheduleWire;

  container?: OrchestratorContainerWire;

  transportLive?: TransportLiveCard;

  thought?: string;

  confirmation?: OrchestratorConfirmationWire;

  actionOsDock?: import("@/lib/action-os/types").DockUpdateWire & {
    strategy: import("@/lib/action-os/types").DockUpdateWire["strategy"];
  };

};

export type OrchestratorResponseWire = MasterOrchestratorWire;



import type { ComposerAttachmentWire } from "@/lib/action-chat/composer-attachments";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { TikiChoiceOption } from "@/lib/action-chat/parse-tiki-choice-options";
import type { HitRunFeedbackVerdict } from "@/lib/action-chat/hit-run-feedback/types";

export type ActionChatRole = "user" | "assistant";

export type OrchestrateHistoryTurn = {

  role: ActionChatRole;

  content: string;

};



export type ActionChatMessage = {

  id: string;

  role: ActionChatRole;

  text: string;

  /** Inline composer attachments shown in the user bubble. */
  composerAttachments?: ComposerAttachmentWire[];

  /** 3-axis chat scope for this turn (decision / meal / schedule). */
  chatAxis?: ChatAxis;

  /** Parsed Tiki A/B/C options — tap sends choice reply without typing. */
  tikiChoices?: TikiChoiceOption[];

  /** Client-only 👍/👎 vote for hit-and-run feedback loop. */
  hitRunFeedback?: HitRunFeedbackVerdict | null;

  createdAt: string;

  actions?: LinkActionItem[];

  loading?: boolean;

  confidence?: number;

  disclosure?: ActionDisclosureTier;

  actionsRevealed?: boolean;

  pendingConfirm?: boolean;

  metadata?: OrchestratorMetadataWire;

  meta?: IntentRouteMeta;

  schedule?: OrchestratorScheduleWire;

  container?: OrchestratorContainerWire;

  transportLive?: TransportLiveCard;

  uiTrigger?: ActionUiTriggerWire;

  knowledgeSaved?: Array<{
    id: string;
    label: string;
    value: string;
    type: string;
    containerId: KnowledgeContainerId;
  }>;

  thought?: string;

  confirmation?: OrchestratorConfirmationWire;

  scheduledDelivery?: ScheduledActionDelivery;

  scheduleExtract?: ConfirmationExtractedData;

  cafeDiscovery?: import("@/lib/context-resolver/places/types").CafeDiscoveryWire;

  guardrail?: import("@/lib/safety/types").GuardrailWire;

  /** Schedule conflict advisory — Vitality + block overlap tradeoff */
  scheduleAdvisory?: import("@/lib/schedule/schedule-block-types").ScheduleAdvisoryWire;

  /** Content policy — DEFLECT / REFUSE with vitality redirect chips */
  policy?: import("@/lib/policy/types").PolicyWire;

  /** MEMORY empathy buffer — ASK_CHOICE before efficiency shortcuts */
  experienceChoice?: import("@/lib/experience/types").ExperienceChoiceWire;

  /** Brand-only turn — frequent intent chips (가격 · 매장찾기 · …) */
  entityQuickPick?: import("@/lib/context-resolver/discovery/entity-quick-pick-types").EntityQuickPickWire;

  /** Time verification — relative countdown or absolute calendar vs timer */
  timeChoice?: import("@/lib/time-decision/types").TimeChoiceWire;

  /** Time choice resolved — client executes calendar and/or timer */
  timeChoiceExecution?: {
    mode: import("@/lib/time-decision/types").TimeChoiceOption["mode"];
  };

  morningBriefing?: import("@/lib/morning-orchestrator/types").MorningBriefingWire;

  dataArchitect?: import("@/lib/data-architect/types").DataArchitectWire;

  presentation?: PresentationWire;

  flushReport?: import("@/lib/action-chat/confirmation-types").TransactionalFlushReport;

  flightStatusCard?: import("@/lib/trip-controller/types").FlightStatusCardWire;

  packingChecklist?: import("@/lib/trip-controller/types").PackingChecklistWire;

  actionOsDock?: {
    strategy: import("@/lib/action-os/types").DockUpdateWire["strategy"];
    main_action: import("@/lib/action-os/types").DockActionWire;
    shadow_actions: import("@/lib/action-os/types").DockActionWire[];
  };

  /** @타이머 — compact inline countdown in chat (no orchestrator). */
  inlineChatTimer?: import("@/lib/action-chat/mention-timer/inline-chat-timer").InlineChatTimerWire;

  /** @캘린더 — compact inline calendar in chat (no orchestrator). */
  inlineChatCalendar?: import("@/lib/action-chat/mention-calendar/inline-chat-calendar").InlineChatCalendarWire;

  /** @알림 — link-reminder ingest chip (no orchestrator). */
  inlineChatReminder?: import("@/lib/action-chat/mention-reminder/inline-chat-reminder").InlineChatReminderWire;

  /** @네비 — nav deeplink chip (no orchestrator). */
  inlineChatNavigate?: import("@/lib/action-chat/mention-navigate/inline-chat-navigate").InlineChatNavigateWire;

  /** @일정정리 — calendar read + rebalance chip (no orchestrator). */
  inlineChatScheduleOrganize?: import("@/lib/action-chat/mention-schedule-organize/inline-chat-schedule-organize").InlineChatScheduleOrganizeWire;

  /** @송금 — transfer deeplink + dutch pay summary (no orchestrator). */
  inlineChatTransfer?: import("@/lib/action-chat/mention-transfer/inline-chat-transfer").InlineChatTransferWire;

  /** @주차 — parking photo or location record (no orchestrator). */
  inlineChatParking?: import("@/lib/action-chat/mention-parking/inline-chat-parking").InlineChatParkingWire;

  /** @집중 — focus timer + notification absorb (no orchestrator). */
  inlineChatFocus?: import("@/lib/action-chat/mention-focus/inline-chat-focus").InlineChatFocusWire;

  /** Generic @ action chip — taxi, paste, delivery, etc. */
  inlineChatAction?: import("@/lib/action-chat/mention-actions/inline-chat-action").InlineChatActionWire;

  /** @톡 — 피드 인라인 대화 스레드(히스토리 + 구분선, 하단 composer 로 전송) */
  feedPeerTalkThread?: import("@/lib/action-chat/feed-peer-talk/feed-peer-talk-types").FeedPeerTalkThreadWire;

};



export type OrchestratorResult = {

  summary: string;

  actions: LinkActionItem[];

  source: "openai" | "rules" | "conversation";

  confidence?: number;

  disclosure?: ActionDisclosureTier;

  actionsRevealed?: boolean;

  pendingConfirm?: boolean;

  metadata?: OrchestratorMetadataWire;

  meta?: IntentRouteMeta;

  schedule?: OrchestratorScheduleWire;

  container?: OrchestratorContainerWire;

  transportLive?: TransportLiveCard;

  /** Batch Action-Agent: one container card per extracted task */
  batchResults?: ActionAgentBatchItem[];

  uiTrigger?: ActionUiTriggerWire;

  knowledgeSaved?: Array<{
    id: string;
    label: string;
    value: string;
    type: string;
    containerId: KnowledgeContainerId;
  }>;

  confirmation?: OrchestratorConfirmationWire;

  scheduledDelivery?: ScheduledActionDelivery;

  scheduleExtract?: ConfirmationExtractedData;

  thought?: string;

  /** SHOW_CAFE_CARDS — decision-oriented place options */
  cafeDiscovery?: import("@/lib/context-resolver/places/types").CafeDiscoveryWire;

  /** High-stakes safeguard — block + negotiate when risk >= threshold */
  guardrail?: import("@/lib/safety/types").GuardrailWire;

  /** Schedule conflict advisory — Vitality + block overlap tradeoff */
  scheduleAdvisory?: import("@/lib/schedule/schedule-block-types").ScheduleAdvisoryWire;

  /** Content policy — DEFLECT / REFUSE with vitality redirect chips */
  policy?: import("@/lib/policy/types").PolicyWire;

  /** MEMORY empathy buffer — ASK_CHOICE before efficiency shortcuts */
  experienceChoice?: import("@/lib/experience/types").ExperienceChoiceWire;

  /** Brand-only turn — frequent intent chips (가격 · 매장찾기 · …) */
  entityQuickPick?: import("@/lib/context-resolver/discovery/entity-quick-pick-types").EntityQuickPickWire;

  /** Time verification — relative countdown or absolute calendar vs timer */
  timeChoice?: import("@/lib/time-decision/types").TimeChoiceWire;

  /** Time choice resolved — client executes calendar and/or timer */
  timeChoiceExecution?: {
    mode: import("@/lib/time-decision/types").TimeChoiceOption["mode"];
  };

  /** Morning proactive briefing — CARE & ACT or JARVIS tone */
  morningBriefing?: import("@/lib/morning-orchestrator/types").MorningBriefingWire;

  /** Data Architect — container classification result */
  dataArchitect?: import("@/lib/data-architect/types").DataArchitectWire;

  /** Global Brain — client persists user status / preference / nexus patches */
  globalBrain?: import("@/lib/global-brain/types").GlobalBrainWire;

  /** Event Candidate — canonical reality layer (always emitted when detected) */
  eventCandidateUpsert?: import("@/lib/events/event-candidate").EventCandidateWire;

  /** OCR approval batch — client must persist each row to local Event SSOT */
  eventCandidateUpserts?: import("@/lib/events/event-candidate").EventCandidateWire[];

  /** VISUAL | ACTION | TIMELINE | DASHBOARD | POLICY_REDIRECT */
  presentation?: PresentationWire;

  flightStatusCard?: import("@/lib/trip-controller/types").FlightStatusCardWire;

  packingChecklist?: import("@/lib/trip-controller/types").PackingChecklistWire;

  actionOsDock?: ActionChatMessage["actionOsDock"];

  /** Phase × Tier trace lines — dev / QA only */
  orchestratorTrace?: string[];

};



export const EMPTY_SCHEDULE_WIRE: OrchestratorScheduleWire = {

  is_conflict: false,

  message: "",

  tasks: [],

};



export const EMPTY_CONTAINER_WIRE: OrchestratorContainerWire = {

  action: "NONE",

  title: "",

  should_save: false,

};


