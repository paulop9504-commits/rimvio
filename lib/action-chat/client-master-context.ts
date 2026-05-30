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
import { readLinkReminders } from "@/lib/local-links/reminders";
import {
  buildMasterContextInjection,
  defaultMasterOrchestratorContext,
  type MasterOrchestratorContext,
} from "@/lib/action-chat/master-orchestrator-context";
import {
  formatDateKey,
  remindersToDaySchedule,
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
    existingSchedule: remindersToDaySchedule(readLinkReminders(), currentDate),
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

  return {
    currentDate: resolved.currentDate,
    trustLevel: resolved.trustLevel,
    existingSchedule: resolved.existingSchedule,
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
