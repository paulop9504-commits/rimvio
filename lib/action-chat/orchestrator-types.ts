import type { ActionDisclosureTier } from "@/lib/action-chat/action-confidence";

import type { LinkActionItem } from "@/types/database";
import type { TransportLiveCard } from "@/lib/transport/transport-live-types";
import type { ActionAgentBatchItem } from "@/lib/action-chat/action-agent-types";
import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { OrchestratorConfirmationWire } from "@/lib/action-chat/confirmation-types";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import type { ScheduledActionDelivery } from "@/lib/action-chat/scheduled-action-delivery";
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

};

export type IntentRouteMeta = {

  intent_type: "NEW_TASK" | "FOLLOW_UP";

  requires_context_switch: boolean;

  current_topic?: string | null;

  relevance_score?: number;

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

};

export type OrchestratorResponseWire = MasterOrchestratorWire;



export type ActionChatRole = "user" | "assistant";

export type OrchestrateHistoryTurn = {

  role: ActionChatRole;

  content: string;

};



export type ActionChatMessage = {

  id: string;

  role: ActionChatRole;

  text: string;

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

  flushReport?: import("@/lib/action-chat/confirmation-types").TransactionalFlushReport;

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


