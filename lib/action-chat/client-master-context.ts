import {
  buildActiveChainsWireFromKeys,
} from "@/lib/containers/context-generator";
import {
  readActiveChains,
  readActiveChainsAsLegacyChain,
} from "@/lib/containers/active-chains-state";
import { normalizeActiveChains } from "@/lib/containers/container-types";
import type { ActiveChainWire } from "@/lib/containers/container-types";
import type { CanonicalContainerKey } from "@/lib/containers/container-types";
import type { ContainerAllowedAction } from "@/lib/containers/container-types";
import type { ActiveContainerChain } from "@/lib/containers/container-chain";
import { readContextContainers } from "@/lib/containers/context-containers";
import { serializeUserGoalsForApi } from "@/lib/goal-roadmap/goal-roadmap-store";
import { serializeActivitySourcesForRetrieval } from "@/lib/schedule-intelligence/serialize-activity-sources";
import { serializeConversationMemoriesForApi } from "@/lib/conversation-memory/conversation-memory-store";
import {
  listRecentUserStatus,
  readUserStatus,
  serializeUserStatusForApi,
} from "@/lib/global-brain/user-status-store";
import {
  serializePreferencesForApi,
} from "@/lib/preference/preference-store";
import {
  serializeNexusContactsForApi,
} from "@/lib/nexus-db/contact-store";
import { serializePromotedTemplatesForApi } from "@/lib/action-registry/action-registry-store";
import { serializeTemplateInstancesForApi } from "@/lib/action-template/template-instance-store";
import { serializeCustomTriggersForApi } from "@/lib/action-os/custom-trigger-store";
import { listActionEventRecords } from "@/lib/action-event-registry/action-event-store";
import { readLinkReminders } from "@/lib/local-links/reminders";
import {
  buildMasterContextInjection,
  defaultMasterOrchestratorContext,
  type MasterOrchestratorContext,
} from "@/lib/action-chat/master-orchestrator-context";
import {
  formatDateKey,
  readExistingSchedule,
} from "@/lib/schedule/day-schedule";
import {
  readActionTrustMode,
  readActionTrustSuccessScore,
  resolveTrustStaircaseStage,
} from "@/lib/preferences/action-trust";
import {
  defaultMapApp,
  labelForMapApp,
  readMapApp,
  type MapApp,
} from "@/lib/preferences/map-app";
import { serializeUserDefinedActionsForApi } from "@/lib/actions/user-defined-action-store";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";

export function readClientMasterOrchestratorContext(): MasterOrchestratorContext {
  const currentDate = formatDateKey();
  const trustLevel = resolveTrustStaircaseStage({
    mode: readActionTrustMode(),
    successScore: readActionTrustSuccessScore(),
  });

  return defaultMasterOrchestratorContext({
    currentDate,
    trustLevel,
    existingSchedule: readExistingSchedule(currentDate),
    activeContainers: readContextContainers(),
    activeChain: readActiveChainsAsLegacyChain(),
    activeChains: readActiveChains(),
  });
}

export function serializeMasterContextForApi(context?: MasterOrchestratorContext) {
  const resolved = context ?? readClientMasterOrchestratorContext();
  const userPreferences =
    typeof window !== "undefined"
      ? `지도 앱 선호: ${labelForMapApp(readMapApp())}`
      : null;

  const activeChains = resolved.activeChains ?? readActiveChains();
  const activeChainsWire = buildActiveChainsWireFromKeys(activeChains);

  const allReminders = readLinkReminders().map((item) => ({
    id: item.id,
    title: item.title,
    fireAt: item.fireAt,
    url: item.url,
  }));

  return {
    currentDate: resolved.currentDate,
    trustLevel: resolved.trustLevel,
    existingSchedule: resolved.existingSchedule,
    allReminders,
    userGoals: serializeUserGoalsForApi(),
    activitySources: serializeActivitySourcesForRetrieval(),
    conversationMemories: serializeConversationMemoriesForApi(),
    userStatus: serializeUserStatusForApi(),
    recentUserStatus: listRecentUserStatus(5).map((item) => ({
      flag: item.flag,
      label: item.label,
      vitality: item.vitality,
      updatedAt: item.updatedAt,
    })),
    preferences: serializePreferencesForApi(),
    nexusContacts: serializeNexusContactsForApi(),
    actionEventRecords: listActionEventRecords(),
    promotedActionTemplates: serializePromotedTemplatesForApi(),
    templateInstances: serializeTemplateInstancesForApi(),
    customTriggers: serializeCustomTriggersForApi(),
    activeContainers: resolved.activeContainers.map((item) => ({
      id: item.id,
      title: item.title,
      topic: item.topic ?? null,
      itemCount: item.itemCount,
      persona: item.persona ?? null,
      allowedActions: item.allowedActions ?? null,
      accent: item.accent ?? null,
    })),
    /** Primary state: ordered container keys for Context Generator */
    activeChains,
    activeChain: resolved.activeChain ?? readActiveChainsAsLegacyChain(),
    activeChainsWire,
    userPreferences,
    userDefinedActions: serializeUserDefinedActionsForApi(),
    mapApp: typeof window !== "undefined" ? readMapApp(true) : defaultMapApp(true),
    injection: buildMasterContextInjection(resolved),
  };
}

export type MasterContextApiPayload = ReturnType<typeof serializeMasterContextForApi> & {
  userPreferences?: string | null;
  userDefinedActions?: UserDefinedAction[];
  activeChains?: CanonicalContainerKey[];
  activeChain?: ActiveContainerChain | null;
  activeChainsWire?: ActiveChainWire[];
  locationMemory?: import("@/lib/location-memory/types").LocationMemoryWire | null;
  priorPlaceChoice?: import("@/lib/corrections/prior-place-choice").PriorPlaceChoiceWire | null;
  placePreferences?: import("@/lib/corrections/place-preference-knowledge").PlacePreferenceWire[];
  allReminders?: Array<{ id: string; title: string; fireAt: string; url?: string }>;
  userGoals?: import("@/lib/goal-roadmap/types").UserGoalWire[];
  activitySources?: import("@/lib/schedule-intelligence/types").ScheduleActivityWire[];
  conversationMemories?: import("@/lib/conversation-memory/types").ConversationMemoryWire[];
  userStatus?: import("@/lib/global-brain/types").UserStatusWire | null;
  recentUserStatus?: Array<{
    flag: import("@/lib/global-brain/types").UserStatusFlag;
    label: string;
    vitality: import("@/lib/vitality/types").VitalityTag;
    updatedAt: string;
  }>;
  preferences?: Array<{ key: string; value: string; label: string }>;
  nexusContacts?: Array<{ name: string; lastContactAt: string | null; importance?: number }>;
  actionEventRecords?: import("@/lib/action-event-registry/types").ActionEventRecord[];
  actionEvents?: import("@/lib/action-event-registry/types").ActionEventWire[];
  promotedActionTemplates?: Array<{
    id: string;
    context_key: string;
    category: string;
    scenario: string;
    usage_count: number;
    main_action: import("@/lib/action-registry/types").ActionRegistryEntry["main_action"];
    shadow_actions: import("@/lib/action-registry/types").ActionRegistryEntry["shadow_actions"];
  }>;
  /** When false (default), specialist container action gate is off for general chat. */
  containerGateEnabled?: boolean;
  activeContainers?: Array<{
    id: string;
    title: string;
    topic: string | null;
    itemCount: number;
    persona?: string | null;
    allowedActions?: ContainerAllowedAction[] | null;
    accent?: string | null;
  }>;
};

export function masterContextFromApiPayload(
  payload?: Partial<MasterContextApiPayload> | null
): MasterOrchestratorContext {
  if (!payload) {
    return defaultMasterOrchestratorContext();
  }

  return defaultMasterOrchestratorContext({
    currentDate: payload.currentDate,
    trustLevel: payload.trustLevel,
    existingSchedule: payload.existingSchedule ?? [],
    activeChains: payload.activeChains
      ? normalizeActiveChains(payload.activeChains)
      : [],
    activeChain: payload.activeChain ?? null,
    activeContainers: (payload.activeContainers ?? []).map((item) => {
      const now = new Date().toISOString();
      return {
        id: item.id,
        title: item.title,
        topic: item.topic ?? undefined,
        persona: item.persona ?? undefined,
        allowedActions: item.allowedActions ?? undefined,
        accent: item.accent ?? undefined,
        itemCount: item.itemCount,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        archivedAt: null,
      };
    }),
  });
}
