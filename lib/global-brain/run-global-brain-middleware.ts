import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

import type { IntentRoute } from "@/lib/action-chat/intent-router";

import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";

import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";

import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";

import { buildGlobalBrainSnapshot } from "@/lib/global-brain/detect-event-horizon";

import { buildGlobalBrainContextBlock } from "@/lib/global-brain/build-context-injection-block";
import { promotedApiWireToEntries } from "@/lib/action-registry/action-registry-store";

import { buildUserLocationWire } from "@/lib/global-brain/build-user-location-wire";

import { classifyVitalityStateWithLlm } from "@/lib/vitality-state/classify-vitality-state-llm";

import { mapVitalityMatchToUserStatus } from "@/lib/global-brain/map-vitality-to-status";

import { resolveTemporalExpression } from "@/lib/time/temporal-resolver";
import { parseScheduleListBatch } from "@/lib/schedule/parse-schedule-list-batch";

import { extractPreferenceFromMessage } from "@/lib/preference/preference-store";

import { extractNexusContactFromMessage } from "@/lib/nexus-db/contact-store";
import {
  evaluateActionEventRegistry,
  toActionEventWire,
} from "@/lib/action-event-registry/evaluate-lifecycle";
import { listActionEventRecords } from "@/lib/action-event-registry/action-event-store";
import { tryExtractActionEventFromMessage } from "@/lib/action-event-registry/extract-action-event-from-message";

import type {

  EventHorizonInsight,

  GlobalBrainSnapshot,

  UserStatusRecord,

} from "@/lib/global-brain/types";

import type { VitalityStateMatch } from "@/lib/vitality-state/vitality-state-types";

import type { TemporalResolution } from "@/lib/time/temporal-types";



export type GlobalBrainMiddlewareResult = {

  snapshot: GlobalBrainSnapshot;

  promptBlock: string;

  shouldEnrich: boolean;

  vitalityMatch: VitalityStateMatch | null;

  statusPatch: UserStatusRecord | null;

  preferencePatch: { key: string; value: string; label: string } | null;

  nexusContactTouch: { name: string } | null;

  resolvedTemporal: TemporalResolution | null;

  proactiveResult: OrchestratorResult | null;

  actionEventUpsert: GlobalBrainWire["actionEventUpsert"];

};



function hasExplicitActionIntent(message: string): boolean {

  return /https?:\/\/|지도|맛집|길\s*찾|네비|검색|예약|일정\s*잡|전화(?:해|걸)|추천\s*해|찾아\s*줘|열어\s*줘|알려\s*줘/iu.test(

    message

  );

}



function shouldProactiveEventHorizon(input: {

  message: string;

  insights: EventHorizonInsight[];

  userStatus: UserStatusRecord | null;

}): boolean {

  if (input.insights.length === 0) {

    return false;

  }

  if (hasExplicitActionIntent(input.message)) {

    return false;

  }

  const top = input.insights[0];

  if (!top || top.severity !== "high") {

    return false;

  }

  const trimmed = input.message.trim();

  if (trimmed.length <= 32 || isConversationalOnlyMessage(trimmed)) {

    return true;

  }

  if (input.userStatus && trimmed.length <= 48) {

    return true;

  }

  return false;

}



function buildEventHorizonProactiveResult(

  insight: EventHorizonInsight,

  snapshot: GlobalBrainSnapshot

): OrchestratorResult {

  const statusHint = snapshot.userStatus?.label

    ? `${snapshot.userStatus.label} 상태를 기억하고 있어요. `

    : "";



  return {

    summary: `${statusHint}${insight.headline} ${insight.suggestion}`,

    actions: [

      {

        id: "event-horizon-reschedule",

        label: "일정 조정하기",

        kind: "custom",

        payload: {

          experienceChoicePrompt: "오늘 일정 중 미룰 수 있는 것 찾아서 조정해줘",

        },

      },

      {

        id: "event-horizon-core-only",

        label: "급한 것만",

        kind: "custom",

        payload: {

          experienceChoicePrompt: "오늘 꼭 필요한 일만 남기고 나머지 정리해줘",

        },

      },

    ],

    source: "rules",

    confidence: 0.88,

    disclosure: "high",

    actionsRevealed: true,

    pendingConfirm: false,

    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },

    thought: `GlobalBrain · EventHorizon · ${insight.kind}`,

  };

}



function shouldEnrichContext(input: {

  message: string;

  snapshot: GlobalBrainSnapshot;

}): boolean {

  if (input.snapshot.scheduleListBatch) {
    return true;
  }

  if (input.snapshot.resolvedTemporal) {

    return true;

  }

  if (input.snapshot.userLocation?.spatial_mode !== "unknown") {

    return true;

  }

  if (input.snapshot.userStatus) {

    return true;

  }

  if (input.snapshot.eventHorizon.length > 0) {

    return true;

  }

  if (input.snapshot.remainingSchedule.length > 0) {

    return true;

  }

  if (input.snapshot.userGoals.length > 0) {

    return true;

  }

  if (input.snapshot.preferences.length > 0) {

    return true;

  }

  if (!isConversationalOnlyMessage(input.message.trim())) {

    return true;

  }

  return false;

}



/**

 * Global Brain middleware — every user turn passes here first.

 */

function buildDegradedGlobalBrainResult(input: {
  message: string;
  masterContext?: MasterContextApiPayload | null;
  context: MasterOrchestratorContext;
}): GlobalBrainMiddlewareResult {
  const resolvedTemporal = resolveTemporalExpression({
    message: input.message,
    referenceDate: input.context.currentDate,
  });
  const scheduleListBatch = parseScheduleListBatch(
    input.message,
    input.context.currentDate
  );
  const snapshot = buildGlobalBrainSnapshot({
    referenceDate: input.context.currentDate,
    existingSchedule: input.context.existingSchedule,
    userGoals: input.masterContext?.userGoals,
    userStatus: input.masterContext?.userStatus ?? null,
    resolvedTemporal,
    scheduleListBatch,
  });

  return {
    snapshot,
    promptBlock: "",
    shouldEnrich: false,
    vitalityMatch: null,
    statusPatch: null,
    preferencePatch: null,
    nexusContactTouch: null,
    resolvedTemporal,
    proactiveResult: null,
    actionEventUpsert: null,
  };
}

export async function runGlobalBrainMiddleware(input: {
  message: string;
  masterContext?: MasterContextApiPayload | null;
  route: IntentRoute;
  context: MasterOrchestratorContext;
}): Promise<GlobalBrainMiddlewareResult> {
  try {
    return await runGlobalBrainMiddlewareCore(input);
  } catch (error) {
    console.error("[global-brain] middleware failed — degrading", error);
    return buildDegradedGlobalBrainResult(input);
  }
}

async function runGlobalBrainMiddlewareCore(input: {

  message: string;

  masterContext?: MasterContextApiPayload | null;

  route: IntentRoute;

  context: MasterOrchestratorContext;

}): Promise<GlobalBrainMiddlewareResult> {

  const recentStateMessages = (input.masterContext?.recentUserStatus ?? []).map((item) => ({

    flag: item.flag,

    label: item.label,

    updatedAt: item.updatedAt,

  }));

  const vitalityMatch = await classifyVitalityStateWithLlm(input.message);

  const resolvedTemporal = resolveTemporalExpression({

    message: input.message,

    referenceDate: input.context.currentDate,

  });



  const scheduleListBatch = parseScheduleListBatch(
    input.message,
    input.context.currentDate
  );

  const registryRecords =
    input.masterContext?.actionEventRecords ?? listActionEventRecords();
  const evaluatedEvents = evaluateActionEventRegistry(registryRecords);
  const actionEvents = evaluatedEvents.map(toActionEventWire);

  const extractedEvent = tryExtractActionEventFromMessage({
    message: input.message,
    referenceDate: input.context.currentDate,
  });
  const actionEventUpsert = extractedEvent
    ? {
        task: extractedEvent.task,
        place_name: extractedEvent.placeName,
        target_time_iso: extractedEvent.targetTimeIso,
        kind: extractedEvent.kind,
        priority: extractedEvent.priority,
        source_message: extractedEvent.sourceMessage,
      }
    : null;

  const userLocation = buildUserLocationWire({

    locationMemory: input.masterContext?.locationMemory,

    message: input.message,

  });



  const snapshot = buildGlobalBrainSnapshot({

    referenceDate: input.context.currentDate,

    existingSchedule: input.context.existingSchedule,

    userGoals: input.masterContext?.userGoals,

    userStatus: input.masterContext?.userStatus ?? null,

    recentStateMessages,

    activitySources: input.masterContext?.activitySources,

    resolvedTemporal,

    userLocation,

    preferences: input.masterContext?.preferences ?? [],

    nexusContacts: input.masterContext?.nexusContacts ?? [],

    scheduleListBatch,

    actionEvents,

  });

  const statusPatch = vitalityMatch

    ? mapVitalityMatchToUserStatus(vitalityMatch, input.message)

    : null;



  const preferencePatch = extractPreferenceFromMessage(input.message);

  const nexusDraft = extractNexusContactFromMessage(input.message);

  const nexusContactTouch = nexusDraft ? { name: nexusDraft.name } : null;



  if (statusPatch) {

    snapshot.userStatus = statusPatch;

    snapshot.recentStateMessages = [

      {

        flag: statusPatch.flag,

        label: statusPatch.label,

        updatedAt: statusPatch.updatedAt,

      },

      ...snapshot.recentStateMessages,

    ].slice(0, 5);

    snapshot.eventHorizon = buildGlobalBrainSnapshot({

      referenceDate: input.context.currentDate,

      existingSchedule: input.context.existingSchedule,

      userGoals: input.masterContext?.userGoals,

      userStatus: statusPatch,

      recentStateMessages: snapshot.recentStateMessages,

      activitySources: input.masterContext?.activitySources,

      resolvedTemporal,

      userLocation,

      preferences: input.masterContext?.preferences ?? [],

      nexusContacts: input.masterContext?.nexusContacts ?? [],

      scheduleListBatch,

      actionEvents,

    }).eventHorizon;

  }



  const shouldEnrich = shouldEnrichContext({ message: input.message, snapshot });

  const promptBlock = buildGlobalBrainContextBlock({
    snapshot,
    shouldEnrich,
    promotedTemplates: promotedApiWireToEntries(input.masterContext?.promotedActionTemplates),
  });



  const proactiveResult =

    vitalityMatch || resolvedTemporal || scheduleListBatch || hasExplicitActionIntent(input.message)

      ? null

      : shouldProactiveEventHorizon({

          message: input.message,

          insights: snapshot.eventHorizon,

          userStatus: snapshot.userStatus,

        })

        ? buildEventHorizonProactiveResult(snapshot.eventHorizon[0]!, snapshot)

        : null;



  return {

    snapshot,

    promptBlock,

    shouldEnrich,

    vitalityMatch,

    statusPatch,

    preferencePatch,

    nexusContactTouch,

    resolvedTemporal,

    proactiveResult,

    actionEventUpsert,

  };

}


