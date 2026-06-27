import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { buildConversationEventState } from "@/lib/action-chat/conversation-event-state";
import { eventStateToIntentRoute } from "@/lib/action-chat/intent-router";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import {
  memoriesFromWire,
  searchConversationMemories,
} from "@/lib/conversation-memory/conversation-memory-store";
import type { ConversationMemoryWire } from "@/lib/conversation-memory/types";
import { buildIntentKernelForChat } from "@/lib/experience-context/build-intent-kernel-for-chat";
import { composeUnifiedContextPromptBlock } from "@/lib/experience-context/compose-unified-context-prompt-block";
import { matchPeopleInMessage } from "@/lib/experience-context/match-people-in-message";
import {
  detectExperienceDomainCue,
  projectPersonExperienceSlice,
} from "@/lib/experience-context/project-person-experience-slice";
import type {
  UnifiedExperienceContext,
  UnifiedMemoryHit,
} from "@/lib/experience-context/unified-experience-context-types";
import type { BehaviorContext, SaveTrajectoryEntry } from "@/lib/intent/kernel-types";
import { readSaveTrajectory } from "@/lib/intent/save-trajectory-client";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { buildPeopleGraph } from "@/lib/people-graph/build-people-graph";

export type BuildUnifiedExperienceContextInput = {
  message: string;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  scopeId?: string;
  masterContext: MasterOrchestratorContext;
  masterContextApi?: MasterContextApiPayload | null;
  contacts?: readonly PeerContact[];
  saveTrajectory?: readonly SaveTrajectoryEntry[];
};

function inferDomainCategory(message: string): string | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (/(?:여행|다녀|trip|travel|출장|휴가)/iu.test(text)) {
    return "travel";
  }
  if (/(?:맛집|식당|카페|먹)/iu.test(text)) {
    return "food";
  }
  if (/(?:일정|약속|미팅|회의)/iu.test(text)) {
    return "schedule";
  }
  return null;
}

function resolveContacts(input: BuildUnifiedExperienceContextInput): PeerContact[] {
  if (input.contacts?.length) {
    return [...input.contacts];
  }

  if (typeof window !== "undefined") {
    const local = readPeerContacts();
    if (local.length > 0) {
      return local;
    }
  }

  const nexus = input.masterContextApi?.nexusContacts ?? [];
  const now = new Date().toISOString();
  return nexus.map((contact, index) => ({
    peerThreadId: `nexus-${index}`,
    displayName: contact.name,
    createdAt: contact.lastContactAt ?? now,
    updatedAt: contact.lastContactAt ?? now,
  }));
}

function resolveSaveTrajectory(
  input: BuildUnifiedExperienceContextInput,
): SaveTrajectoryEntry[] {
  if (input.saveTrajectory?.length) {
    return [...input.saveTrajectory];
  }
  if (typeof window !== "undefined") {
    return readSaveTrajectory();
  }
  return [];
}

function resolveConversationMemories(
  masterContextApi?: MasterContextApiPayload | null,
): ConversationMemoryWire[] {
  return memoriesFromWire(masterContextApi?.conversationMemories);
}

function scoreMemoryHits(
  message: string,
  records: ConversationMemoryWire[],
  limit = 5,
): UnifiedMemoryHit[] {
  const needle = message.trim().toLowerCase();
  if (!needle || records.length === 0) {
    return [];
  }

  const tokens = needle
    .split(/\s+/u)
    .filter((part) => part.length >= 2)
    .slice(0, 8);

  return records
    .map((item) => {
      const haystack =
        `${item.topic} ${item.summary} ${item.keywords.join(" ")}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += token.length >= 3 ? 3 : 2;
        }
      }
      if (haystack.includes(needle)) {
        score += 5;
      }
      return {
        topic: item.topic,
        summary: item.summary,
        createdAt: item.createdAt,
        score,
      };
    })
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function buildUnifiedExperienceContext(
  input: BuildUnifiedExperienceContextInput,
): UnifiedExperienceContext {
  const scopeId = input.scopeId ?? "default";
  const nowMs = Date.now();
  const message = input.message.trim();
  const history = input.history ?? [];
  const referenceDate = input.masterContext.currentDate;

  const eventState = buildConversationEventState({
    message,
    history,
    linkTitle: input.linkTitle,
    scopeId,
  });
  const route = eventStateToIntentRoute(eventState);

  const saveTrajectory = resolveSaveTrajectory(input);
  const domainCategory = inferDomainCategory(message);
  const behaviorContext: BehaviorContext = {
    hour: new Date(nowMs).getHours(),
    saveHistory: saveTrajectory,
    current: {
      query: message,
      title: eventState.current_topic,
      category: domainCategory,
      domain: route.intent_type,
    },
  };

  const behaviorKernel = buildIntentKernelForChat({
    message,
    route,
    behavior: behaviorContext,
    now: nowMs,
  });

  const eventCandidates = listLifeEventCandidates();
  const peopleGraph = buildPeopleGraph({
    contacts: resolveContacts(input),
    events: eventCandidates,
    now: new Date(nowMs),
  });

  const matchedPeople = matchPeopleInMessage(message, peopleGraph.people);
  const conversationMemories = resolveConversationMemories(input.masterContextApi);
  const searchedMemories = searchConversationMemories({
    query: message,
    limit: 5,
    records: conversationMemories,
  });
  const memoryHits = scoreMemoryHits(
    message,
    searchedMemories.length > 0 ? searchedMemories : conversationMemories,
    5,
  );

  const domainCue = detectExperienceDomainCue(message);
  const personExperienceSlice = projectPersonExperienceSlice({
    matchedPeople,
    domainCue,
  });

  const promptBlock = composeUnifiedContextPromptBlock({
    matchedPeople,
    personExperienceSlice,
    memoryHits,
    behaviorKernel,
    eventState,
  });

  return {
    scopeId,
    message,
    history,
    referenceDate,
    nowMs,
    eventState,
    route,
    behaviorKernel,
    behaviorContext,
    saveTrajectory,
    peopleGraph,
    matchedPeople,
    conversationMemories,
    memoryHits,
    eventCandidates,
    personExperienceSlice,
    promptBlock,
  };
}
