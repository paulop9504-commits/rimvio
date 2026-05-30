import { buildLayeredMasterOrchestratorSystemPrompt } from "@/lib/action-chat/layered-system-prompt";

import type {
  OrchestrateHistoryTurn,
  OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";

import {
  masterContextFromApiPayload,
  type MasterContextApiPayload,
} from "@/lib/action-chat/client-master-context";

import { normalizeMasterOrchestratorWire } from "@/lib/action-chat/normalize-master-result";

import { parseMasterOrchestratorJson } from "@/lib/action-chat/wire-to-actions";

import { orchestrateByRules } from "@/lib/action-chat/rule-orchestrator";

import { orchestrateConversation } from "@/lib/action-chat/conversation-turns";

import { tryScheduledTravelAction } from "@/lib/action-chat/try-scheduled-travel-action";
import { tryDeepLinkDispatchOrchestration } from "@/lib/deep-link-dispatch/orchestrate-deep-link-dispatch";
import { orchestrateShadowDashboard } from "@/lib/notification-shadow/orchestrate-shadow-dashboard";
import { tryBatchConfirmPriority } from "@/lib/action-chat/batch-confirm-priority";
import { enforceConfirmationTrigger } from "@/lib/action-chat/confirm-enforcement";
import { tryContainerActionGate } from "@/lib/containers/enforce-container-actions";
import {
  autoSaveKnowledgeFromMessage,
  buildDatePickerOrchestratorResult,
  detectVerbWithoutTime,
  mapKnowledgeEntitiesToWire,
  tryKnowledgeRecall,
} from "@/lib/action-chat/action-oriented-handler";

import {
  applyContextIsolation,
  applyIntentRouteToResult,
  resolveIntentRoute,
} from "@/lib/action-chat/intent-router";

import { isOpenAiConfigured, openAiApiKey, openAiVisionModel } from "@/lib/llm/openai-config";
import {
  classifyIntentRouter,
  parseConversationalAssistantText,
  parseWittyConversationJson,
} from "@/lib/action-chat/mode-switching";
import {
  buildWittyOrchestratorResult,
  tryWittyConversation,
} from "@/lib/action-chat/witty-response-generator";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";

export type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";



export async function orchestrateUserMessage(input: {

  message: string;

  history?: OrchestrateHistoryTurn[];

  linkTitle?: string | null;

  linkUrl?: string | null;

  linkCategory?: string | null;

  linkedLinks?: Array<{
    id: string;
    title: string;
    url: string | null;
    category: string | null;
  }>;

  masterContext?: MasterContextApiPayload | null;

  userDefinedActions?: UserDefinedAction[];

}): Promise<OrchestratorResult> {

  const message = input.message.trim();

  const context = masterContextFromApiPayload(input.masterContext);
  const userDefinedActions =
    input.userDefinedActions ?? input.masterContext?.userDefinedActions ?? [];

  const route = resolveIntentRoute({

    message,

    history: input.history,

    linkTitle: input.linkTitle,

  });

  const scoped = applyContextIsolation(input, route);



  const containerGate = tryContainerActionGate({
    message,
    activeChains: context.activeChains,
    legacyChainIds: context.activeChain?.containerIds,
  });
  if (containerGate) {
    return applyIntentRouteToResult(containerGate, route);
  }

  const knowledgeRecall = await tryKnowledgeRecall(message);
  if (knowledgeRecall) {
    return applyIntentRouteToResult(knowledgeRecall, route);
  }

  const verbDraft = detectVerbWithoutTime(message);
  if (verbDraft) {
    return applyIntentRouteToResult(
      buildDatePickerOrchestratorResult({ draftTask: verbDraft }),
      route
    );
  }

  const autoSaved = await autoSaveKnowledgeFromMessage(message);
  const autoSavedWire =
    autoSaved.length > 0 ? mapKnowledgeEntitiesToWire(autoSaved) : undefined;

  const finalize = (result: OrchestratorResult): OrchestratorResult => {
    const enforced = enforceConfirmationTrigger({
      message,
      result,
      referenceDate: context.currentDate,
      existingSchedule: context.existingSchedule,
    });

    const next = !autoSavedWire?.length
      ? enforced
      : {
          ...enforced,
          knowledgeSaved: [...(enforced.knowledgeSaved ?? []), ...autoSavedWire],
          summary:
            enforced.knowledgeSaved?.length || enforced.uiTrigger
              ? enforced.summary
              : `저장했어요 · ${autoSavedWire[0]?.label ?? "데이터"}`,
        };

    return applyIntentRouteToResult(next, route);
  };



  if (!message) {

    return finalize(

      orchestrateByRules({ ...scoped, masterContext: context, intentRoute: route, userDefinedActions })

    );

  }



  const wittyRule = tryWittyConversation(message);
  if (wittyRule) {
    return finalize(wittyRule);
  }

  const scheduledTravel = tryScheduledTravelAction({
    message,
    referenceDate: context.currentDate,
  });
  if (scheduledTravel) {
    return finalize(scheduledTravel);
  }

  const deepLinkDispatch = tryDeepLinkDispatchOrchestration({ message });
  if (deepLinkDispatch) {
    return finalize(deepLinkDispatch);
  }

  const shadowDashboard = orchestrateShadowDashboard(message);
  if (shadowDashboard) {
    return finalize(shadowDashboard);
  }

  const conversation = orchestrateConversation({

    message,

    linkTitle: scoped.linkTitle,

  });

  if (conversation) {

    return finalize(conversation);

  }



  if (!isOpenAiConfigured()) {

    return finalize(

      orchestrateByRules({ ...scoped, masterContext: context, intentRoute: route, userDefinedActions })

    );

  }

  const earlyConfirm = tryBatchConfirmPriority({
    message,
    referenceDate: context.currentDate,
    existingSchedule: context.existingSchedule,
  });
  if (earlyConfirm) {
    return finalize(earlyConfirm);
  }



  try {
    const router = classifyIntentRouter(message);
    const mode = router.mode;
    const tone = router.tone;
    const systemPrompt = buildLayeredMasterOrchestratorSystemPrompt({
      context,
      route,
      message,
      linkTitle: scoped.linkTitle,
      userPreferencesOverride: input.masterContext?.userPreferences ?? null,
      mode,
    });

    const linkContext = [
      input.linkedLinks && input.linkedLinks.length >= 2
        ? `Linked context chain (priority order):\n${input.linkedLinks
            .map(
              (link, index) =>
                `${index + 1}. ${link.title}${link.url ? ` — ${link.url}` : ""}`
            )
            .join("\n")}`
        : null,
      scoped.linkTitle ? `Active link title: ${scoped.linkTitle}` : null,
      scoped.linkUrl ? `Active link URL: ${scoped.linkUrl}` : null,
      scoped.linkCategory ? `Category: ${scoped.linkCategory}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const historyBlock = (scoped.history ?? [])
      .slice(-6)
      .map((turn) => `${turn.role}: ${turn.content}`)
      .join("\n");

    const userPayload = [
      linkContext ? `Link context:\n${linkContext}` : null,
      historyBlock ? `Recent chat:\n${historyBlock}` : null,
      `User message:\n${message}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const requestBody: Record<string, unknown> = {
      model: openAiVisionModel(),
      temperature: mode === "conversation" ? 0.7 : 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
    };

    if (mode === "action") {
      requestBody.response_format = { type: "json_object" };
    } else if (tone === "WITTY") {
      requestBody.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });



    if (!response.ok) {

      return finalize(

        orchestrateByRules({ ...scoped, masterContext: context, intentRoute: route, userDefinedActions })

      );

    }



    const payload = (await response.json()) as {

      choices?: Array<{ message?: { content?: string } }>;

    };

    const raw = payload.choices?.[0]?.message?.content?.trim();

    if (mode === "conversation") {
      if (tone === "WITTY" && raw) {
        const witty = parseWittyConversationJson(raw);
        if (witty) {
          return finalize(buildWittyOrchestratorResult(witty, "openai"));
        }
      }

      const text = raw ? parseConversationalAssistantText(raw) : "";
      if (!text) {
        return finalize(
          orchestrateByRules({ ...scoped, masterContext: context, intentRoute: route, userDefinedActions })
        );
      }

      return finalize({
        summary: text,
        actions: [],
        source: "openai",
        confidence: 1,
        disclosure: "none",
        actionsRevealed: false,
        pendingConfirm: false,
      });
    }

    const parsed = raw ? parseMasterOrchestratorJson(raw) : null;



    if (!parsed) {

      return finalize(

        orchestrateByRules({ ...scoped, masterContext: context, intentRoute: route, userDefinedActions })

      );

    }



    return finalize(

      normalizeMasterOrchestratorWire({

        wire: parsed,

        source: "openai",

        existingSchedule: context.existingSchedule,

      })

    );

  } catch {

    return finalize(

      orchestrateByRules({ ...scoped, masterContext: context, intentRoute: route, userDefinedActions })

    );

  }

}

