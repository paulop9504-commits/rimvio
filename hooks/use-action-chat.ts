"use client";



import { useCallback, useEffect, useState } from "react";

import { fetchWithTimeout, FetchTimeoutError } from "@/lib/http/fetch-with-timeout";

import { isUserConfirmingActions, isUserRequestingAlternate } from "@/lib/action-chat/action-confidence";
import { applyAlternateActionOffer } from "@/lib/action-chat/rotate-action-offer";

import {
  readClientMasterOrchestratorContext,
  serializeMasterContextForApi,
} from "@/lib/action-chat/client-master-context";
import { GLANGO_CONVERSATION_LINES } from "@/lib/action-chat/glango-persona";
import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import { toast } from "sonner";

import {

  actionChatScopeId,

  readActionChatMessages,

  writeActionChatMessages,

} from "@/lib/action-chat/chat-store";

import { buildActionsFromConfirmationData } from "@/lib/action-chat/build-confirmation-actions";
import { buildActionsFromBatchPending } from "@/lib/action-chat/build-batch-pending-actions";
import {
  applyLocationCorrectionToConfirm,
  attachConfirmInterrupt,
  buildLocationCorrectionFromInput,
  cancelPendingConfirm,
  classifyConfirmInterrupt,
  clearConfirmInterrupt,
  findPendingPlaceConfirm,
  respondToConfirmSystemQuery,
} from "@/lib/action-chat/confirm-interrupt";
import { flushBatchPendingTransactionally } from "@/lib/action-chat/transactional-flush";
import type {
  ConfirmationExtractedData,
  LocationSuggestion,
  OrchestratorConfirmationWire,
  TransactionalFlushReport,
} from "@/lib/action-chat/confirmation-types";
import { appendCorrectionLog } from "@/lib/corrections/correction-log";
import {
  armScheduledActionDelivery,
  disarmScheduledActionDelivery,
  restoreScheduledActionDeliveries,
} from "@/lib/action-chat/arm-scheduled-action-delivery";
import {
  buildScheduledPlaceNavActions,
  formatScheduledDeliverySummary,
  formatScheduledFireSummary,
  saveScheduledTravelToCalendar,
  shouldDeferActionsForSchedule,
} from "@/lib/action-chat/scheduled-action-delivery";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { evaluateProactiveTransportNudge } from "@/lib/transport/proactive-transport-nudge";
import { buildTransportLiveOrchestratorPayload } from "@/lib/transport/transport-live-service";

import type { LinkRow } from "@/types/database";
import { buildLinkedLinksWire } from "@/lib/feed/link-context-chain";



const ORCHESTRATE_TIMEOUT_MS = 18_000;



function findPriorUserInput(
  messages: ActionChatMessage[],
  assistantId: string
): string | null {
  const index = messages.findIndex((message) => message.id === assistantId);
  if (index <= 0) {
    return null;
  }

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (messages[cursor]?.role === "user") {
      return messages[cursor]!.text;
    }
  }

  return null;
}

function mergeConfirmedActions(
  extracted: ConfirmationExtractedData,
  confirmation?: OrchestratorConfirmationWire
) {
  const placeActions = buildActionsFromConfirmationData(extracted);
  const pendingActions = buildActionsFromBatchPending(confirmation?.batch_pending);

  const seen = new Set<string>();
  return [...placeActions, ...pendingActions].filter((action) => {
    const key = action.href ?? action.label;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function applyPlaceConfirmation(
  messages: ActionChatMessage[],
  messageId: string,
  extracted: ConfirmationExtractedData,
  summary: string,
  flushReport?: TransactionalFlushReport
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const actions = mergeConfirmedActions(extracted, message.confirmation);

    return {
      ...message,
      text:
        flushReport?.failed.length || flushReport?.hasPartialFailure
          ? (flushReport?.summary ?? summary)
          : summary,
      actions,
      actionsRevealed: true,
      pendingConfirm: false,
      flushReport,
      confirmation: message.confirmation
        ? {
            ...message.confirmation,
            meta: { intent: "EXECUTE" },
            extracted_data: extracted,
            batch_pending: [],
            interrupt: undefined,
          }
        : undefined,
    };
  });
}

function applyScheduledFire(
  messages: ActionChatMessage[],
  messageId: string,
  extracted: ConfirmationExtractedData
): ActionChatMessage[] {
  const placeLabel = extracted.place_name ?? extracted.address ?? "목적지";
  const actions = buildScheduledPlaceNavActions(extracted);

  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          text: formatScheduledFireSummary(placeLabel),
          actions,
          actionsRevealed: true,
          pendingConfirm: false,
          scheduledDelivery: {
            fire_at: extracted.datetime ?? message.scheduledDelivery?.fire_at ?? "",
            status: "fired",
          },
          scheduleExtract: extracted,
          confirmation: undefined,
        }
      : message
  );
}

function createMessage(

  role: ActionChatMessage["role"],

  text: string,

  extra?: Partial<ActionChatMessage>

): ActionChatMessage {

  return {

    id: crypto.randomUUID(),

    role,

    text,

    createdAt: new Date().toISOString(),

    ...extra,

  };

}



function revealAssistantMessage(

  messages: ActionChatMessage[],

  messageId: string

): ActionChatMessage[] {

  return messages.map((message) =>

    message.id === messageId

      ? { ...message, actionsRevealed: true, pendingConfirm: false }

      : message

  );

}

function revealAlternateAssistantMessage(

  messages: ActionChatMessage[],

  messageId: string

): ActionChatMessage[] {

  return messages.map((message) => {

    if (message.id !== messageId) {

      return message;

    }

    const actions = message.actions ?? [];

    if (actions.length <= 1) {

      return { ...message, actionsRevealed: true, pendingConfirm: false };

    }

    const alternate = applyAlternateActionOffer({

      actions,

      summary: message.text,

    });

    return {

      ...message,

      actions: alternate.actions,

      text: alternate.summary ?? message.text,

      actionsRevealed: true,

      pendingConfirm: false,

    };

  });

}



export function useActionChat(
  activeLink: LinkRow | null,
  chainedLinks: LinkRow[] = []
) {

  const scopeId = actionChatScopeId(activeLink?.id);

  const [messages, setMessages] = useState<ActionChatMessage[]>([]);

  const [sending, setSending] = useState(false);

  const [datePickerRequest, setDatePickerRequest] = useState<ActionUiTriggerWire | null>(
    null
  );



  useEffect(() => {

    setMessages(readActionChatMessages(scopeId));

  }, [scopeId]);



  const persist = useCallback(

    (next: ActionChatMessage[]) => {

      setMessages(next);

      writeActionChatMessages(scopeId, next);

    },

    [scopeId]

  );

  const fireScheduledAction = useCallback(
    (messageId: string, extracted: ConfirmationExtractedData) => {
      const current = readActionChatMessages(scopeId);
      persist(applyScheduledFire(current, messageId, extracted));
      const placeLabel = extracted.place_name ?? extracted.address ?? "목적지";
      toast(`${placeLabel} 길찾기를 꺼냈어요`);
    },
    [persist, scopeId]
  );

  const activateScheduledDelivery = useCallback(
    async (input: {
      messageId: string;
      extracted: ConfirmationExtractedData;
      sourceMessage: string;
    }) => {
      await saveScheduledTravelToCalendar({
        extracted: input.extracted,
        sourceMessage: input.sourceMessage,
      });

      const placeLabel = input.extracted.place_name ?? input.extracted.address ?? "일정";
      const fireAt = input.extracted.datetime;
      if (!fireAt) {
        return;
      }

      const summary = formatScheduledDeliverySummary({ placeLabel, fireAt });
      const current = readActionChatMessages(scopeId);

      persist(
        current.map((message) =>
          message.id === input.messageId
            ? {
                ...message,
                text: summary,
                actions: [],
                actionsRevealed: false,
                pendingConfirm: false,
                confirmation: undefined,
                scheduledDelivery: { fire_at: fireAt, status: "pending" },
                scheduleExtract: input.extracted,
              }
            : message
        )
      );

      armScheduledActionDelivery({
        scopeId,
        messageId: input.messageId,
        extracted: input.extracted,
        onFire: () => fireScheduledAction(input.messageId, input.extracted),
      });
    },
    [fireScheduledAction, persist, scopeId]
  );

  const cancelScheduledAction = useCallback(
    (messageId: string) => {
      disarmScheduledActionDelivery(scopeId, messageId);
      const current = readActionChatMessages(scopeId);
      persist(
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                scheduledDelivery: undefined,
                scheduleExtract: undefined,
              }
            : message
        )
      );
      toast("예약을 취소했어요");
    },
    [persist, scopeId]
  );

  const triggerScheduledActionNow = useCallback(
    (messageId: string) => {
      const current = readActionChatMessages(scopeId);
      const message = current.find((entry) => entry.id === messageId);
      const extracted = message?.scheduleExtract;
      if (!extracted) {
        return;
      }
      disarmScheduledActionDelivery(scopeId, messageId);
      fireScheduledAction(messageId, extracted);
    },
    [fireScheduledAction, scopeId]
  );

  useEffect(() => {
    restoreScheduledActionDeliveries({
      scopeId,
      onFire: (messageId, extracted) => {
        fireScheduledAction(messageId, extracted);
      },
    });
  }, [fireScheduledAction, scopeId]);



  useEffect(() => {

    const onRefresh = async (event: Event) => {

      const detail = (event as CustomEvent<{

        stopId?: string;

        routeId?: string;

        location?: string;

      }>).detail;



      try {

        const response = await fetch("/api/transport/live", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            stopId: detail?.stopId,

            routeNumber: detail?.routeId,

            location: detail?.location,

          }),

        });



        if (!response.ok) {

          return;

        }



        const payload = (await response.json()) as {

          card: ActionChatMessage["transportLive"];

          actions: ActionChatMessage["actions"];

          summary: string;

        };



        const current = readActionChatMessages(scopeId);

        persist(

          current.map((message) =>

            message.transportLive

              ? {

                  ...message,

                  transportLive: payload.card,

                  actions: payload.actions,

                  text: payload.summary,

                }

              : message

          )

        );

      } catch {

        // ignore refresh errors

      }

    };



    window.addEventListener("glango:transport-live-refresh", onRefresh);

    return () => window.removeEventListener("glango:transport-live-refresh", onRefresh);

  }, [persist, scopeId]);



  useEffect(() => {

    const context = readClientMasterOrchestratorContext();

    const nudge = evaluateProactiveTransportNudge({

      existingSchedule: context.existingSchedule,

    });

    if (!nudge) {

      return;

    }



    const flagKey = `glango:transport-nudge:${nudge.scheduleTime}:${nudge.scheduleTask}`;

    if (typeof window !== "undefined" && sessionStorage.getItem(flagKey)) {

      return;

    }



    const payload = buildTransportLiveOrchestratorPayload({

      message: `${nudge.routeHint}번 버스`,

      location: nudge.location,

      routeNumber: nudge.routeHint,

      calendarTitle: nudge.scheduleTask,

    });

    if (!payload) {

      return;

    }



    const current = readActionChatMessages(scopeId);

    if (current.some((message) => message.transportLive && message.text === nudge.message)) {

      return;

    }



    sessionStorage.setItem(flagKey, "1");

    persist([

      ...current,

      createMessage("assistant", nudge.message, {

        transportLive: payload.card,

        actions: payload.actions,

        actionsRevealed: true,

        confidence: 0.93,

        disclosure: "high",

      }),

    ]);

  }, [persist, scopeId]);



  const revealMessageActions = useCallback(

    (messageId: string) => {

      persist(revealAssistantMessage(readActionChatMessages(scopeId), messageId));

    },

    [persist, scopeId]

  );

  const revealAlternateMessageActions = useCallback(

    (messageId: string) => {

      persist(revealAlternateAssistantMessage(readActionChatMessages(scopeId), messageId));

    },

    [persist, scopeId]

  );

  const confirmPlace = useCallback(
    async (messageId: string) => {
      const current = readActionChatMessages(scopeId);
      const target = current.find((message) => message.id === messageId);
      const extracted = target?.confirmation?.extracted_data;
      if (!target || !extracted) {
        return;
      }

      if (shouldDeferActionsForSchedule(extracted)) {
        await activateScheduledDelivery({
          messageId,
          extracted,
          sourceMessage: findPriorUserInput(current, messageId) ?? "",
        });
        void appendCorrectionLog({
          user_input: findPriorUserInput(current, messageId) ?? "",
          ai_inferred_location: extracted.address,
          ai_inferred_place_name: extracted.place_name,
          user_corrected_location: extracted.address,
          user_corrected_place_name: extracted.place_name,
          outcome: "accepted",
        });
        return;
      }

      const flushReport = await flushBatchPendingTransactionally(
        target.confirmation?.batch_pending
      );

      const placeLabel = extracted.place_name ?? extracted.address ?? "선택한 장소";
      const summary =
        flushReport.failed.length > 0
          ? flushReport.summary
          : `${placeLabel}로 진행할게요.`;

      const next = applyPlaceConfirmation(
        clearConfirmInterrupt(current, messageId),
        messageId,
        extracted,
        summary,
        flushReport
      );
      persist(next);

      if (flushReport.hasPartialFailure || flushReport.failed.length > 0) {
        toast(flushReport.summary, {
          description:
            flushReport.failed.length > 0
              ? "실패한 항목은 다시 시도해 주세요."
              : undefined,
        });
      }

      void appendCorrectionLog({
        user_input: findPriorUserInput(current, messageId) ?? "",
        ai_inferred_location: extracted.address,
        ai_inferred_place_name: extracted.place_name,
        user_corrected_location: extracted.address,
        user_corrected_place_name: extracted.place_name,
        outcome: "accepted",
      });
    },
    [activateScheduledDelivery, persist, scopeId]
  );

  const correctPlace = useCallback(
    async (messageId: string, suggestion: LocationSuggestion) => {
      const current = readActionChatMessages(scopeId);
      const target = current.find((message) => message.id === messageId);
      const prior = target?.confirmation?.extracted_data;
      if (!target || !prior) {
        return;
      }

      const extracted: ConfirmationExtractedData = {
        ...prior,
        place_name: suggestion.place_name,
        address: suggestion.address,
      };

      if (shouldDeferActionsForSchedule(extracted)) {
        await activateScheduledDelivery({
          messageId,
          extracted,
          sourceMessage: findPriorUserInput(current, messageId) ?? "",
        });
        return;
      }

      const flushReport = await flushBatchPendingTransactionally(
        target.confirmation?.batch_pending
      );

      const next = applyPlaceConfirmation(
        clearConfirmInterrupt(current, messageId),
        messageId,
        extracted,
        flushReport.failed.length > 0
          ? flushReport.summary
          : `${suggestion.label}로 선택했어요.`,
        flushReport
      );
      persist(next);

      if (flushReport.failed.length > 0) {
        toast(flushReport.summary);
      }

      void appendCorrectionLog({
        user_input: findPriorUserInput(current, messageId) ?? "",
        ai_inferred_location: prior.address,
        ai_inferred_place_name: prior.place_name,
        user_corrected_location: suggestion.address,
        user_corrected_place_name: suggestion.place_name,
        outcome: "corrected",
      });
    },
    [activateScheduledDelivery, persist, scopeId]
  );

  const resumeConfirmInterrupt = useCallback(
    (messageId: string) => {
      persist(clearConfirmInterrupt(readActionChatMessages(scopeId), messageId));
    },
    [persist, scopeId]
  );

  const dismissConfirmForInterrupt = useCallback(
    (messageId: string): string | null => {
      const current = readActionChatMessages(scopeId);
      const target = current.find((message) => message.id === messageId);
      const interruptText = target?.confirmation?.interrupt?.user_message?.trim() ?? null;

      persist(
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                pendingConfirm: false,
                confirmation: undefined,
                text: "알겠어요. 다른 질문부터 도와드릴게요.",
              }
            : message
        )
      );

      return interruptText;
    },
    [persist, scopeId]
  );

  const WITTY_ACTION_REPLIES: Record<string, string> = {
    feed_knowledge:
      "좋아요! 뭐든 말해 주세요 — 그게 제 지식이 되고, 함께 자라요. 😊",
    compliment: "고마워요! 당신과 나, 둘 다 계속 자라면 되죠. 🌱",
    play_along: "좋아요! 편하게 말 걸어 주세요. 심심할 땐 저랑 잡담도 재밌어요.",
  };

  const handleWittyAction = useCallback(
    (messageId: string, action: string) => {
      const current = readActionChatMessages(scopeId);
      const reply =
        WITTY_ACTION_REPLIES[action] ?? "알겠어요! 더 이야기해 볼까요?";

      persist(
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                pendingConfirm: false,
                confirmation: undefined,
                thought: undefined,
                text: reply,
              }
            : message
        )
      );
    },
    [persist, scopeId]
  );

  const sendMessage = useCallback(

    async (text: string) => {

      const trimmed = text.trim();

      if (!trimmed || sending) {

        return;

      }



      const current = readActionChatMessages(scopeId);

      const userMessage = createMessage("user", trimmed);

      const pendingPlaceConfirm = findPendingPlaceConfirm(current);
      if (pendingPlaceConfirm) {
        const interruptKind = classifyConfirmInterrupt(trimmed);

        if (interruptKind === "continue_confirm") {
          persist([...current, userMessage]);
          void confirmPlace(pendingPlaceConfirm.id);
          return;
        }

        if (interruptKind === "cancel_task") {
          persist(cancelPendingConfirm(current, pendingPlaceConfirm.id, userMessage));
          return;
        }

        if (interruptKind === "system_query") {
          persist(
            respondToConfirmSystemQuery(current, pendingPlaceConfirm.id, userMessage)
          );
          return;
        }

        if (interruptKind === "location_correction") {
          const referenceDate =
            readClientMasterOrchestratorContext().currentDate ??
            new Date().toISOString().slice(0, 10);
          const corrected = buildLocationCorrectionFromInput(
            trimmed,
            pendingPlaceConfirm.confirmation?.extracted_data,
            referenceDate
          );
          persist(
            applyLocationCorrectionToConfirm(
              current,
              pendingPlaceConfirm.id,
              userMessage,
              corrected
            )
          );
          return;
        }

        if (interruptKind === "off_topic") {
          persist(
            attachConfirmInterrupt(current, pendingPlaceConfirm.id, userMessage, trimmed)
          );
          return;
        }
      }

      if (isUserConfirmingActions(trimmed)) {

        const pending = [...current]

          .reverse()

          .find(

            (message) =>

              message.role === "assistant" &&

              message.pendingConfirm &&

              !message.actionsRevealed &&

              (message.actions?.length ?? 0) > 0

          );



        if (pending) {

          persist([

            ...revealAssistantMessage(current, pending.id),

            userMessage,

          ]);

          return;

        }

      }

      if (isUserRequestingAlternate(trimmed)) {

        const pending = [...current]

          .reverse()

          .find(

            (message) =>

              message.role === "assistant" &&

              message.pendingConfirm &&

              !message.actionsRevealed &&

              (message.actions?.length ?? 0) > 1

          );



        if (pending) {

          persist([

            ...revealAlternateAssistantMessage(current, pending.id),

            userMessage,

          ]);

          return;

        }

      }



      const loadingId = crypto.randomUUID();

      const loadingMessage = createMessage("assistant", GLANGO_CONVERSATION_LINES.loading, {

        id: loadingId,

        loading: true,

      });



      const base = [...current, userMessage, loadingMessage];

      persist(base);

      setSending(true);



      try {

        const history = base

          .filter((message) => !message.loading)

          .slice(-8)

          .map((message) => ({

            role: message.role,

            content: message.text,

          }));



        const response = await fetchWithTimeout("/api/chat/orchestrate", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            message: trimmed,

            history,

            linkTitle: activeLink?.title ?? null,

            linkUrl: activeLink?.original_url ?? null,

            linkCategory: activeLink?.category ?? null,

            linkedLinks: buildLinkedLinksWire(chainedLinks),

            masterContext: serializeMasterContextForApi(),

          }),

          timeoutMs: ORCHESTRATE_TIMEOUT_MS,

          timeoutLabel: "chat_orchestrate",

        });



        if (!response.ok) {

          throw new Error("orchestrate_failed");

        }



        const payload = (await response.json()) as OrchestratorResultWire;

        const batchItems =
          payload.batchResults?.filter((item) => (item.actions?.length ?? 0) > 0) ?? [];
        if (batchItems.length >= 2) {
          const assistantMessages = batchItems.map((item) =>
            createMessage("assistant", item.summary, {
              actions: item.actions ?? [],
              confidence: payload.confidence ?? 0.9,
              disclosure: payload.disclosure ?? "high",
              actionsRevealed: true,
              pendingConfirm: false,
              metadata: payload.metadata ?? {
                intent: "ACTION",
                trust_level_adjustment: "NONE",
              },
            })
          );

          persist([
            ...base.filter((message) => message.id !== loadingId),
            ...assistantMessages,
          ]);
          return;
        }

        const assistantMessage = createMessage(

          "assistant",

          payload.summary || GLANGO_CONVERSATION_LINES.greeting,

          {

            actions: payload.actions ?? [],

            confidence: payload.confidence,

            disclosure: payload.disclosure,

            actionsRevealed: payload.actionsRevealed ?? false,

            pendingConfirm: payload.pendingConfirm ?? false,

            metadata: payload.metadata,

            meta: payload.meta,

            schedule: payload.schedule,

            container: payload.container,

            transportLive: payload.transportLive,

            uiTrigger: payload.uiTrigger,

            knowledgeSaved: payload.knowledgeSaved,

            confirmation: payload.confirmation,

            thought: payload.thought,

            scheduledDelivery: payload.scheduledDelivery,

            scheduleExtract: payload.scheduleExtract,

          }

        );

        if (payload.uiTrigger?.type === "DATE_PICKER") {
          setDatePickerRequest(payload.uiTrigger);
        }

        if (payload.knowledgeSaved?.length) {
          toast("Knowledge Container에 저장했어요", {
            description: payload.knowledgeSaved[0]?.value,
          });
        }

        persist([
          ...base.filter((message) => message.id !== loadingId),
          assistantMessage,
        ]);

        if (
          payload.scheduledDelivery?.status === "pending" &&
          payload.scheduleExtract?.datetime
        ) {
          void activateScheduledDelivery({
            messageId: assistantMessage.id,
            extracted: payload.scheduleExtract,
            sourceMessage: trimmed,
          });
        }

        return;

      } catch (error) {

        const fallbackText =

          error instanceof FetchTimeoutError

            ? GLANGO_CONVERSATION_LINES.timeout

            : GLANGO_CONVERSATION_LINES.fallback;



        persist([

          ...base.filter((message) => message.id !== loadingId),

          createMessage("assistant", fallbackText),

        ]);

      } finally {

        setSending(false);

      }

    },

    [activateScheduledDelivery, activeLink, chainedLinks, confirmPlace, persist, scopeId, sending]

  );



  const dismissDatePicker = useCallback(() => {
    setDatePickerRequest(null);
  }, []);

  const confirmDatePicker = useCallback(
    async (input: { date: string; time: string; task: string }) => {
      const label = `${input.date} ${input.time}`;
      await saveKnowledgeEntity({
        containerId: FIXED_CALENDAR_CONTAINER_ID,
        type: "schedule",
        label: input.task,
        value: label,
        sourceMessage: input.task,
      });
      setDatePickerRequest(null);
      void sendMessage(`${input.date} ${input.time} ${input.task} 일정 잡아줘`);
    },
    [sendMessage]
  );



  return {

    messages,

    sending,

    sendMessage,

    revealMessageActions,

    revealAlternateMessageActions,

    datePickerRequest,

    confirmDatePicker,

    dismissDatePicker,

    confirmPlace,

    correctPlace,

    resumeConfirmInterrupt,

    dismissConfirmForInterrupt,

    handleWittyAction,

    cancelScheduledAction,

    triggerScheduledActionNow,

  };

}



type OrchestratorResultWire = {

  summary: string;

  actions?: ActionChatMessage["actions"];

  confidence?: number;

  disclosure?: ActionChatMessage["disclosure"];

  actionsRevealed?: boolean;

  pendingConfirm?: boolean;

  metadata?: ActionChatMessage["metadata"];

  meta?: ActionChatMessage["meta"];

  schedule?: ActionChatMessage["schedule"];

  container?: ActionChatMessage["container"];

  transportLive?: ActionChatMessage["transportLive"];

  uiTrigger?: ActionChatMessage["uiTrigger"];

  knowledgeSaved?: ActionChatMessage["knowledgeSaved"];

  confirmation?: ActionChatMessage["confirmation"];

  thought?: ActionChatMessage["thought"];

  scheduledDelivery?: ActionChatMessage["scheduledDelivery"];

  scheduleExtract?: ActionChatMessage["scheduleExtract"];

  batchResults?: Array<{
    type: string;
    summary: string;
    actions?: ActionChatMessage["actions"];
    extracted_data: Record<string, string | null>;
  }>;

};


