import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { IntentRoute } from "@/lib/action-chat/intent-router-core";
import type { ConversationEventState } from "@/lib/action-chat/conversation-event-state";
import type {
  BehaviorContext,
  IntentKernelResult,
  SaveTrajectoryEntry,
} from "@/lib/intent/kernel-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ConversationMemoryWire } from "@/lib/conversation-memory/types";
import type { PeopleGraph, PersonNode } from "@/lib/people-graph/person-types";

export type UnifiedMemoryHit = {
  topic: string;
  summary: string;
  createdAt: string;
  score: number;
};

export type PersonExperienceSlice = {
  personId: string;
  displayName: string;
  experiences: PersonNode["experiences"];
  places: PersonNode["places"];
};

/** SSOT — one turn's event kernel, behavior kernel, people, and recall signals. */
export type UnifiedExperienceContext = {
  scopeId: string;
  message: string;
  history: readonly OrchestrateHistoryTurn[];
  referenceDate: string;
  nowMs: number;

  eventState: ConversationEventState;
  route: IntentRoute;

  behaviorKernel: IntentKernelResult;
  behaviorContext: BehaviorContext;
  saveTrajectory: readonly SaveTrajectoryEntry[];

  peopleGraph: PeopleGraph;
  matchedPeople: readonly PersonNode[];
  conversationMemories: readonly ConversationMemoryWire[];
  memoryHits: readonly UnifiedMemoryHit[];

  eventCandidates: readonly EventCandidate[];
  personExperienceSlice: readonly PersonExperienceSlice[];

  promptBlock: string | null;
};
