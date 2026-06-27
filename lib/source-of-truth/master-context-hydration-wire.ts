import type { ActiveContainerChain } from "@/lib/containers/container-chain";
import type { CanonicalContainerKey, ContainerAllowedAction } from "@/lib/containers/container-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type { TrustStaircaseStage } from "@/lib/preferences/action-trust";
import type { EventCandidateWire } from "@/lib/events/event-candidate";

/** Server hydration payload — L0 wire (subset of action-chat API payload). */
export type MasterContextHydrationPayload = {
  currentDate?: string;
  trustLevel?: TrustStaircaseStage;
  existingSchedule?: ExistingScheduleInput;
  activeChains?: CanonicalContainerKey[];
  activeChain?: ActiveContainerChain | null;
  activeContainers?: Array<{
    id: string;
    title: string;
    topic?: string | null;
    persona?: string | null;
    allowedActions?: ContainerAllowedAction[] | null;
    accent?: string | null;
    itemCount: number;
  }>;
  eventCandidates?: EventCandidateWire[];
  allReminders?: Array<{ id: string; title: string; fireAt: string; url?: string }>;
};
