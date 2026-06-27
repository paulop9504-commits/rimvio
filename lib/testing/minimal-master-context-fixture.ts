import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";

/** Minimal MasterContextApiPayload for self-learning / stress harnesses. */
export const MINIMAL_MASTER_CONTEXT: MasterContextApiPayload = {
  currentDate: "2026-06-02",
  trustLevel: 1,
  eventCandidates: [],
  existingSchedule: [],
  allReminders: [],
  userGoals: [],
  activitySources: [],
  conversationMemories: [],
  userStatus: null,
  recentUserStatus: [],
  preferences: [],
  nexusContacts: [],
  actionEventRecords: [],
  promotedActionTemplates: [],
  templateInstances: [],
  customTriggers: [],
  activeContainers: [],
  activeChains: [],
  activeChain: null,
  activeChainsWire: [],
  userPreferences: null,
  userDefinedActions: [],
  mapApp: "kakao",
  injection: "",
};
