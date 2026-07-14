import { bindSituation } from "@/lib/context-run/bind-situation";
import { assertCommitPermitted } from "@/lib/context-run/commit-gate";
import { commitMentionContextIngress } from "@/lib/context-run/commit-mention-context";
import { commitTextContextIngress } from "@/lib/context-run/commit-text-context";
import { dispatchExecutionFeedGoal } from "@/lib/context-run/execution-feed-bridge";
import type {
  BoundSituation,
  ContextRunEffectHandlers,
  ContextRunIngress,
  ContextRunPlan,
  ContextRunTurnResult,
} from "@/lib/context-run/ingress-types";
import {
  discoveryHintMessage,
  discoveryPhotoHintMessage,
  planContextRun,
  planMarketPortalFallback,
  planPersonalContextAskFallback,
  planTextIngestFallback,
} from "@/lib/context-run/plan-context-run";
import { ensureRunState, touchRunStateNode } from "@/lib/context-run/run-state-store";
import {
  appendGlobeChatTextMessage,
  readGlobeChatMessages,
} from "@/lib/globe/chat/globe-chat-session-store";
import { generateSmallTalkReply } from "@/lib/globe/context-condition-ai/small-talk/generate-small-talk-reply";
import { ensureGlobeChatGraphId } from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import {
  buildComposerGraphId,
  resolveGlobeComposerSurface,
} from "@/lib/context-run/resolve-globe-composer-surface";
import { resolvePrimarySurface } from "@/lib/context-run/surface-resolver";
import {
  syncMarketComposeStartToFeed,
  syncMarketQuickListStartToFeed,
} from "@/lib/context-run/sync-market-compose-to-feed";
import { ingestGlobeContextFromFiles } from "@/lib/feed/ingest-globe-context-capture";
import { maybeOfferKnowledgePlacementAfterCapture } from "@/lib/globe/offer-knowledge-placement-after-capture";
import { ingestPastedLinks } from "@/lib/share/inbox-paste";
import {
  fetchExternalContextSourcesClient,
  resolveExternalContextAsk,
} from "@/lib/external-context-ask";
import { resolveExperienceRunTurn, ensureTripContextEvent } from "@/lib/experience-run";
import { buildMarketQuickListDraft } from "@/lib/globe/market/build-market-quick-list-draft";
import { dispatchGlobeIntentSupplyClear } from "@/lib/globe/intent-supply/globe-intent-supply-bridge";
import { runGlobeMapIntentSupply } from "@/lib/globe/intent-supply/run-globe-map-intent-supply";
import { parseMentionForContract } from "@/lib/context-run/plan-mention-contract";
import {
  getMentionFeature,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import { evaluateContractGate } from "@/lib/event-kernel/slot-filling/contract-gated-execution";
import { runGlobeComposerAction } from "@/lib/globe/run-globe-composer-action";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { resolvePersonalContextAsk } from "@/lib/personal-context-ask";
import { interpretMessyForPersonalAsk } from "@/lib/messy-prompt-interpreter/adapters/personal-ask-adapter";
import {
  syncExperienceRunClarifyToFeed,
  syncExperienceRunSummaryToFeed,
} from "@/lib/context-run/sync-experience-run-to-feed";
import { syncGlobeIngressCompileToFeed } from "@/lib/context-run/sync-globe-ingress-to-feed";
import { buildTripIngressCreatedChatAssistantLine } from "@/lib/globe/trip-situation-router/build-trip-flow-chat-lines";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { resolveIngressContextConverge } from "@/lib/globe-ingress";
import { buildPendingContextCreateDraft } from "@/lib/globe-ingress/build-pending-context-create-draft";
import {
  cancelPendingContextCreate,
  commitPendingContextCreate,
} from "@/lib/globe-ingress/commit-pending-context-create";
import {
  CONTEXT_CREATE_CHOICE_CANCEL,
  CONTEXT_CREATE_CHOICE_CREATE,
  offerPendingContextCreate,
} from "@/lib/globe-ingress/offer-pending-context-create";
import {
  isPendingContextCreateApprove,
  isPendingContextCreateCancel,
} from "@/lib/globe-ingress/detect-pending-context-create-reply";
import { readPendingContextCreate } from "@/lib/globe-ingress/pending-context-create-store";
import {
  proposeContextAnchorMoveFromNl,
  tryResolvePendingContextAnchorMoveReply,
} from "@/lib/globe-ingress/commit-context-anchor-move";
import { isContextAnchorMoveUtterance } from "@/lib/globe-ingress/detect-context-anchor-move";
import { readPendingContextAnchorMove } from "@/lib/globe-ingress/pending-context-anchor-move-store";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";
import { copy } from "@/lib/copy/human-ko";
import {
  syncComposeDraftToFeed,
  syncComposeIntentToFeed,
} from "@/lib/context-run/sync-compose-draft-to-feed";
import {
  syncPortalComposeClarifyToFeed,
  syncPortalComposeSocialSummaryToFeed,
  syncPortalComposeStartToFeed,
} from "@/lib/context-run/sync-portal-compose-to-feed";
import { readActiveRunState } from "@/lib/context-run/run-state-store";
import { commitPortalSocialContext } from "@/lib/portal/commit-portal-social-context";
import {
  clearPortalComposeRunState,
  readPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";
import { detectPortalIntentFromText } from "@/lib/portal/detect-portal-intent-from-text";
import { requestPortalComposeRunTurn } from "@/lib/portal/request-portal-compose-run-turn";
import {
  syncPortalComposeClarifyToChat,
  syncPortalComposeTurnToChat,
} from "@/lib/globe/chat/sync-portal-compose-to-chat";
import { sellItemDraftToComposeText } from "@/lib/portal/compose-draft/draft-to-market-intent";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { classifyGlobeWorkSurface } from "@/lib/work-queue/classify-globe-work-surface";
import { syncWorkQueueFromActiveRuns } from "@/lib/work-queue/sync-work-queue-from-runs";

function refreshWorkQueue(handlers: ContextRunEffectHandlers): void {
  syncWorkQueueFromActiveRuns();
  handlers.onWorkQueueChanged?.();
}

function isComposerTextIngress(ingress: ContextRunIngress): boolean {
  return ingress.kind === "text" && ingress.surface === "composer";
}

/**
 * Single ingress for Context Run Engine (composer + capture sheet text).
 * UI must call this instead of branching ingest / supply / portal directly.
 */
export async function dispatchContextRun(
  ingress: ContextRunIngress,
  handlers: ContextRunEffectHandlers,
): Promise<ContextRunTurnResult> {
  const bound = bindSituation(ingress);
  const { graphId, goalKo } = bound;

  if (
    ingress.kind === "text" &&
    ingress.surface === "composer" &&
    ingress.layerMode === "personal"
  ) {
    ensureGlobeChatGraphId();
  }

  /** Context Anchor — pending create / move replies before planner. */
  if (
    isComposerTextIngress(ingress) &&
    ingress.layerMode === "personal" &&
    ingress.kind === "text"
  ) {
    const replyText = ingress.text.trim();
    const replyGraphId = resolveActiveComposerGraphId(
      replyText || bound.goalKo,
    );
    ensureRunState({ graphId: replyGraphId, goal: replyText || bound.goalKo });

    if (readPendingContextCreate(replyGraphId)) {
      appendGlobeChatTextMessage({
        graphId: replyGraphId,
        role: "user",
        text: replyText,
      });
      if (
        isPendingContextCreateCancel(replyText) ||
        replyText === CONTEXT_CREATE_CHOICE_CANCEL
      ) {
        cancelPendingContextCreate({ graphId: replyGraphId });
        return { graphId: replyGraphId, status: "done", planKind: "noop" };
      }
      if (
        isPendingContextCreateApprove(replyText) ||
        replyText === CONTEXT_CREATE_CHOICE_CREATE
      ) {
        const committed = commitPendingContextCreate({
          graphId: replyGraphId,
          handlers,
        });
        if (committed) {
          refreshWorkQueue(handlers);
          return {
            graphId: replyGraphId,
            status: "done",
            planKind: "globe_ingress",
            globeIngress: committed.compiled,
          };
        }
      }
      appendGlobeChatTextMessage({
        graphId: replyGraphId,
        role: "assistant",
        text: copy.globe.contextAnchor.chipPrompt,
      });
      return { graphId: replyGraphId, status: "done", planKind: "noop" };
    }

    if (readPendingContextAnchorMove(replyGraphId)) {
      appendGlobeChatTextMessage({
        graphId: replyGraphId,
        role: "user",
        text: replyText,
      });
      const resolved = tryResolvePendingContextAnchorMoveReply({
        graphId: replyGraphId,
        text: replyText,
      });
      if (resolved.kind !== "none") {
        if (resolved.kind === "committed") {
          handlers.onAttached?.(resolved.event.id);
          handlers.toastSuccess?.(
            copy.globe.contextAnchor.moveCommitted(
              resolved.event.metadata?.globePlaceLabel &&
                typeof resolved.event.metadata.globePlaceLabel === "string"
                ? resolved.event.metadata.globePlaceLabel
                : "Anchor",
            ),
          );
        }
        return { graphId: replyGraphId, status: "done", planKind: "noop" };
      }
    }

    const activeEventId = ingress.contextEventId?.trim();
    if (activeEventId && isContextAnchorMoveUtterance(replyText)) {
      appendGlobeChatTextMessage({
        graphId: replyGraphId,
        role: "user",
        text: replyText,
      });
      proposeContextAnchorMoveFromNl({
        graphId: replyGraphId,
        eventId: activeEventId,
        utterance: replyText,
      });
      return { graphId: replyGraphId, status: "done", planKind: "noop" };
    }
  }

  const plan = planContextRun(bound);
  if (plan.kind === "noop") {
    return { graphId, status: "noop", planKind: "noop" };
  }

  const runGraphId = plan.graphId ?? graphId;
  const runGoalKo = plan.goalKo ?? goalKo;

  if (ingress.kind === "text" && ingress.layerMode === "personal") {
    dispatchExecutionFeedGoal({ graphId: runGraphId, goalKo: runGoalKo });
  }
  if (plan.kind !== "map_intent_supply" && plan.kind !== "mention_contract") {
    dispatchGlobeIntentSupplyClear();
  }
  ensureRunState({ graphId: runGraphId, goal: runGoalKo });

  if (
    ingress.kind === "text" &&
    ingress.layerMode === "personal" &&
    ingress.text.trim() &&
    !("resumePortalRun" in plan && plan.resumePortalRun)
  ) {
    const classified = classifyGlobeWorkSurface(ingress.text);
    if (classified) {
      handlers.onWorkSurfaceClassified?.(classified);
    }
  }

  if (isComposerTextIngress(ingress) && ingress.kind === "text") {
    const trimmed = ingress.text.trim();
    if (trimmed) {
      appendGlobeChatTextMessage({
        graphId: runGraphId,
        role: "user",
        text: trimmed,
      });
    }
  }

  try {
    return await executeContextRunPlan(bound, plan, handlers);
  } catch (caught) {
    const errorMessage =
      caught instanceof Error ? caught.message : "Context run failed";
    return {
      graphId,
      status: "error",
      planKind: plan.kind,
      errorMessage,
    };
  }
}

async function executeContextRunPlan(
  bound: BoundSituation,
  plan: ContextRunPlan,
  handlers: ContextRunEffectHandlers,
): Promise<ContextRunTurnResult> {
  const { graphId } = bound;
  const ingress = bound.ingress;
  const eventId =
    ingress.kind === "text" ? ingress.contextEventId?.trim() || null : null;

  const surface = plan.composerPhase
    ? resolvePrimarySurface({
        graphId,
        composerPhase: plan.composerPhase,
      })
    : undefined;

  switch (plan.kind) {
    case "small_talk": {
      // Chat lane: reply conversationally, run no search/ingest. Compose a
      // context-aware reply (time/status/history/tone/persona → situational line
      // + open question), LLM when available, deterministic otherwise. The user
      // turn was already appended above.
      const priorTurns = readGlobeChatMessages(graphId)
        .filter((m): m is Extract<typeof m, { kind: "text" }> => m.kind === "text")
        .map((m) => ({ role: m.role, text: m.text }));
      // Drop the just-appended current user turn so history reflects the past.
      const currentText = ingress.kind === "text" ? ingress.text.trim() : "";
      const history =
        priorTurns.length > 0 &&
        priorTurns[priorTurns.length - 1]?.role === "user" &&
        priorTurns[priorTurns.length - 1]?.text === currentText
          ? priorTurns.slice(0, -1)
          : priorTurns;
      const small = await generateSmallTalkReply({
        text: currentText || bound.goalKo,
        history,
        scopeId: graphId,
      });
      appendGlobeChatTextMessage({
        graphId,
        role: "assistant",
        text: small.replyKo || plan.smallTalkReplyKo || "네, 편하게 말해줘요 🙂",
      });
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "discovery_browse": {
      handlers.openFieldDiscovery();
      return { graphId, status: "done", planKind: plan.kind, surface };
    }
    case "discovery_hint": {
      handlers.toastMessage?.(discoveryHintMessage());
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "external_url": {
      if (plan.url && plan.urlLabel) {
        handlers.navigateUrl(plan.url, plan.urlLabel);
      }
      return { graphId, status: "done", planKind: plan.kind, surface };
    }
    case "portal_compose_run": {
      const intentId = (plan.portalIntentId ??
        readPortalComposeRunState(readActiveRunState()?.graphId)?.intentId) as
        | PortalIntentId
        | undefined;
      if (!intentId) {
        return { graphId, status: "noop", planKind: "noop" };
      }

      const activeRun = readActiveRunState();
      const pending = plan.resumePortalRun
        ? readPortalComposeRunState(plan.graphId)
        : activeRun
          ? readPortalComposeRunState(activeRun.graphId)
          : null;
      const runGraphId = plan.graphId ?? pending?.graphId ?? activeRun?.graphId ?? graphId;

      let resolvedEventId = pending?.eventId?.trim() || "";

      if (
        !resolvedEventId &&
        !plan.composeAmbientChat &&
        ingress.kind === "text"
      ) {
        resolvedEventId = ingress.contextEventId?.trim() ?? "";
      }

      if (!resolvedEventId) {
        const seed = plan.resumePortalRun
          ? pending?.accumulatedText ?? bound.goalKo
          : bound.goalKo;
        const outcome = await commitTextContextIngress(seed);
        resolvedEventId = outcome.result.event.id;
      }

      if (!plan.resumePortalRun) {
        // Goal sync happens in compose_intent / compose_draft feed handlers.
      }

      const result = await requestPortalComposeRunTurn({
        graphId: runGraphId,
        intentId,
        categoryId: plan.portalCategoryId ?? pending?.categoryId ?? null,
        message: plan.resumePortalRun
          ? (pending?.accumulatedText ?? bound.goalKo)
          : bound.goalKo,
        eventId: resolvedEventId,
        liveLat: ingress.kind === "text" ? ingress.lat : null,
        liveLng: ingress.kind === "text" ? ingress.lng : null,
        resumeState: plan.resumePortalRun ? pending : null,
        answerText: plan.resumePortalRun ? bound.goalKo : null,
      });

      if (result.kind === "compose_converse") {
        writePortalComposeRunState(result.state);
        syncComposeIntentToFeed({
          graphId: runGraphId,
          goalKo: bound.goalKo,
          assistantKo: result.assistantKo,
        });
        syncPortalComposeTurnToChat({
          graphId: runGraphId,
          userText: bound.goalKo,
          assistantText: result.assistantKo,
        });
        return { graphId, status: "done", planKind: plan.kind };
      }

      if (result.kind === "compose_intent") {
        writePortalComposeRunState(result.state);
        syncComposeIntentToFeed({
          graphId: runGraphId,
          goalKo: bound.goalKo,
          assistantKo: result.assistantKo,
        });
        syncPortalComposeTurnToChat({
          graphId: runGraphId,
          userText: bound.goalKo,
          assistantText: result.assistantKo,
        });
        return { graphId, status: "done", planKind: plan.kind };
      }

      if (result.kind === "compose_draft") {
        writePortalComposeRunState(result.state);
        const composeText =
          sellItemDraftToComposeText(result.draft) || result.state.accumulatedText;
        if (result.canPublish) {
          syncComposeDraftToFeed({
            graphId: runGraphId,
            goalKo: bound.goalKo,
            assistantKo: result.assistantKo,
            schemaId: result.schemaId,
            draft: result.draft,
          });
        } else {
          syncComposeIntentToFeed({
            graphId: runGraphId,
            goalKo: bound.goalKo,
            assistantKo: result.assistantKo,
          });
        }
        syncPortalComposeTurnToChat({
          graphId: runGraphId,
          userText: plan.resumePortalRun ? bound.goalKo : bound.goalKo,
          assistantText: result.assistantKo,
        });
        if (isComposerTextIngress(ingress) && result.canPublish) {
          handlers.onMarketComposeFeedReady?.({
            kind: "quick_list",
            eventId: result.state.eventId,
            composeText,
            draft: result.state.marketDraft ?? undefined,
          });
        } else if (
          isComposerTextIngress(ingress) &&
          result.state.marketDraft &&
          !result.canPublish
        ) {
          handlers.onMarketComposeFeedReady?.({
            kind: "wizard",
            eventId: result.state.eventId,
            composeText,
            draft: result.state.marketDraft,
          });
        }
        refreshWorkQueue(handlers);
        return { graphId, status: "done", planKind: plan.kind };
      }

      if (result.kind === "clarify") {
        writePortalComposeRunState(result.state);
        touchRunStateNode(`portal:${result.slotId}`);
        syncPortalComposeClarifyToFeed({
          graphId: runGraphId,
          questionKo: result.questionKo,
          goalKo: bound.goalKo,
          slotId: result.slotId,
        });
        syncPortalComposeClarifyToChat({
          graphId: runGraphId,
          userText: bound.goalKo,
          questionKo: result.questionKo,
          clarifyKind: result.clarifyKind,
          slotId: result.slotId,
          choices: result.choices,
          categoryOptions: result.categoryOptions,
        });
        handlers.onPortalComposeClarify?.({
          questionKo: result.questionKo,
          slotId: result.slotId,
        });
        refreshWorkQueue(handlers);
        return { graphId, status: "done", planKind: plan.kind };
      }

      clearPortalComposeRunState(runGraphId);

      if (result.kind === "quick_list_ready") {
        syncMarketQuickListStartToFeed({
          composeText: result.composeText,
          eventId: result.eventId,
        });
        if (isComposerTextIngress(ingress)) {
          handlers.onMarketComposeFeedReady?.({
            kind: "quick_list",
            eventId: result.eventId,
            composeText: result.composeText,
          });
          return { graphId, status: "done", planKind: plan.kind };
        }
        const quickListed = await handlers.tryQuickListMarket(result.composeText);
        if (quickListed) {
          handlers.onAttached?.(result.eventId);
          return { graphId, status: "done", planKind: plan.kind };
        }
        const portalPlan = planMarketPortalFallback(bound, result.composeText);
        return executeContextRunPlan(bound, portalPlan, handlers);
      }

      if (result.kind === "launch_wizard") {
        syncMarketComposeStartToFeed({
          composeText: result.composeText,
          eventId: result.eventId,
        });
        if (isComposerTextIngress(ingress)) {
          handlers.onMarketComposeFeedReady?.({
            kind: "wizard",
            draft: result.draft,
            eventId: result.eventId,
            composeText: result.composeText,
          });
          return { graphId, status: "done", planKind: plan.kind };
        }
        handlers.onLaunchMarketProjection?.({
          draft: result.draft,
          eventId: result.eventId,
          composeText: result.composeText,
        });
        return { graphId, status: "done", planKind: plan.kind };
      }

      commitPortalSocialContext({
        eventId: result.eventId,
        title: result.title,
        intentId: result.intentId,
        categoryId: result.categoryId,
        socialSlots: result.socialSlots,
      });
      syncPortalComposeSocialSummaryToFeed({
        graphId: runGraphId,
        titleKo: result.title,
        summaryKo: result.summaryKo,
        intentId: result.intentId,
      });
      handlers.onAttached?.(result.eventId);
      handlers.toastSuccess?.(result.summaryKo);
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "market_quick_list": {
      const composeText = plan.composeText?.trim() ?? bound.goalKo;
      syncMarketQuickListStartToFeed({ composeText, eventId });
      if (isComposerTextIngress(ingress)) {
        handlers.onMarketComposeFeedReady?.({
          kind: "quick_list",
          eventId: eventId?.trim() || "",
          composeText,
        });
        return { graphId, status: "done", planKind: plan.kind, surface };
      }
      const quickListed = await handlers.tryQuickListMarket(composeText);
      if (quickListed) {
        return { graphId, status: "done", planKind: plan.kind, surface };
      }
      const portalPlan = planMarketPortalFallback(
        bound,
        composeText,
        plan.composerPhase === "market_supply_pass"
          ? "market_supply_pass"
          : "market_compose",
      );
      return executeContextRunPlan(bound, portalPlan, handlers);
    }
    case "market_portal": {
      const composeText = plan.composeText?.trim() ?? bound.goalKo;
      const detected = detectPortalIntentFromText(composeText);
      const intentId = (detected?.intentId ?? "offer") as PortalIntentId;
      let resolvedEventId = eventId?.trim() || "";
      if (!resolvedEventId) {
        const outcome = await commitTextContextIngress(composeText);
        resolvedEventId = outcome.result.event.id;
      }
      const runGraphId = buildComposerGraphId(resolvedEventId, composeText);
      const result = await requestPortalComposeRunTurn({
        graphId: runGraphId,
        intentId,
        categoryId: detected?.categoryId ?? null,
        message: composeText,
        eventId: resolvedEventId,
        liveLat: ingress.kind === "text" ? ingress.lat : null,
        liveLng: ingress.kind === "text" ? ingress.lng : null,
      });
      if (result.kind === "compose_converse") {
        writePortalComposeRunState(result.state);
        syncComposeIntentToFeed({
          graphId: runGraphId,
          goalKo: composeText,
          assistantKo: result.assistantKo,
        });
        syncPortalComposeTurnToChat({
          graphId: runGraphId,
          userText: composeText,
          assistantText: result.assistantKo,
        });
        return { graphId, status: "done", planKind: plan.kind };
      }
      if (result.kind === "compose_intent") {
        writePortalComposeRunState(result.state);
        syncComposeIntentToFeed({
          graphId: runGraphId,
          goalKo: composeText,
          assistantKo: result.assistantKo,
        });
        syncPortalComposeTurnToChat({
          graphId: runGraphId,
          userText: composeText,
          assistantText: result.assistantKo,
        });
        return { graphId, status: "done", planKind: plan.kind };
      }
      if (result.kind === "compose_draft") {
        writePortalComposeRunState(result.state);
        const mergedText =
          sellItemDraftToComposeText(result.draft) || result.state.accumulatedText;
        if (result.canPublish) {
          syncComposeDraftToFeed({
            graphId: runGraphId,
            goalKo: composeText,
            assistantKo: result.assistantKo,
            schemaId: result.schemaId,
            draft: result.draft,
          });
        } else {
          syncComposeIntentToFeed({
            graphId: runGraphId,
            goalKo: composeText,
            assistantKo: result.assistantKo,
          });
        }
        syncPortalComposeTurnToChat({
          graphId: runGraphId,
          userText: composeText,
          assistantText: result.assistantKo,
        });
        if (isComposerTextIngress(ingress) && result.canPublish) {
          handlers.onMarketComposeFeedReady?.({
            kind: "quick_list",
            eventId: result.state.eventId,
            composeText: mergedText,
            draft: result.state.marketDraft ?? undefined,
          });
        } else if (
          isComposerTextIngress(ingress) &&
          result.state.marketDraft &&
          !result.canPublish
        ) {
          handlers.onMarketComposeFeedReady?.({
            kind: "wizard",
            eventId: result.state.eventId,
            composeText: mergedText,
            draft: result.state.marketDraft,
          });
        }
        refreshWorkQueue(handlers);
        return { graphId, status: "done", planKind: plan.kind };
      }
      if (result.kind === "clarify") {
        writePortalComposeRunState(result.state);
        touchRunStateNode(`portal:${result.slotId}`);
        syncPortalComposeClarifyToFeed({
          graphId: runGraphId,
          questionKo: result.questionKo,
          goalKo: composeText,
          slotId: result.slotId,
        });
        syncPortalComposeClarifyToChat({
          graphId: runGraphId,
          userText: composeText,
          questionKo: result.questionKo,
          clarifyKind: result.clarifyKind,
          slotId: result.slotId,
          choices: result.choices,
          categoryOptions: result.categoryOptions,
        });
        handlers.onPortalComposeClarify?.({
          questionKo: result.questionKo,
          slotId: result.slotId,
        });
        refreshWorkQueue(handlers);
        return { graphId, status: "done", planKind: plan.kind };
      }
      clearPortalComposeRunState(runGraphId);
      if (result.kind === "quick_list_ready") {
        syncMarketQuickListStartToFeed({
          composeText: result.composeText,
          eventId: result.eventId,
        });
        if (isComposerTextIngress(ingress)) {
          handlers.onMarketComposeFeedReady?.({
            kind: "quick_list",
            eventId: result.eventId,
            composeText: result.composeText,
          });
          return { graphId, status: "done", planKind: plan.kind };
        }
        const quickListed = await handlers.tryQuickListMarket(result.composeText);
        if (quickListed) {
          handlers.onAttached?.(result.eventId);
          return { graphId, status: "done", planKind: plan.kind };
        }
        const fallbackDraft = buildMarketQuickListDraft({
          text: result.composeText,
          eventId: result.eventId,
        });
        if (fallbackDraft) {
          handlers.onLaunchMarketProjection?.({
            draft: fallbackDraft,
            eventId: result.eventId,
            composeText: result.composeText,
          });
        }
        return { graphId, status: "done", planKind: plan.kind };
      }
      if (result.kind === "launch_wizard") {
        syncMarketComposeStartToFeed({
          composeText: result.composeText,
          eventId: result.eventId,
        });
        if (isComposerTextIngress(ingress)) {
          handlers.onMarketComposeFeedReady?.({
            kind: "wizard",
            draft: result.draft,
            eventId: result.eventId,
            composeText: result.composeText,
          });
          return { graphId, status: "done", planKind: plan.kind };
        }
        handlers.onLaunchMarketProjection?.({
          draft: result.draft,
          eventId: result.eventId,
          composeText: result.composeText,
        });
        return { graphId, status: "done", planKind: plan.kind };
      }
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "map_intent_supply": {
      const supplyInput = plan.supplyInput;
      if (!supplyInput) {
        return executeContextRunPlan(
          bound,
          planTextIngestFallback(bound),
          handlers,
        );
      }
      const supply = await runGlobeMapIntentSupply(supplyInput);

      if (supply?.status === "pass") {
        if (supply.pass === "market") {
          const quickPlan: ContextRunPlan = {
            kind: "market_quick_list",
            graphId,
            goalKo: bound.goalKo,
            composerPhase: "market_supply_pass",
            composeText: bound.goalKo,
          };
          return executeContextRunPlan(bound, quickPlan, handlers);
        }
        if (supply.pass === "navigation") {
          const nav = runGlobeComposerAction(bound.goalKo);
          if (nav?.kind === "url") {
            handlers.navigateUrl(nav.url, nav.label);
            return { graphId, status: "done", planKind: plan.kind, supply };
          }
        }
      }

      if (supply?.status === "supplied") {
        const { ack } = supply;
        syncPortalComposeTurnToChat({
          graphId,
          userText: bound.goalKo,
          assistantText: ack.summaryKo,
        });
        if (supply.lodgingEventId) {
          handlers.onLodgingDiscovery?.({
            eventId: supply.lodgingEventId,
            summaryKo: ack.summaryKo,
          });
        }
        if (supply.foodEventId) {
          handlers.onEateryDiscovery?.({
            eventId: supply.foodEventId,
            summaryKo: ack.summaryKo,
          });
        }
        handlers.onAttached?.(ack.eventId);
        if (!supply.lodgingEventId && !supply.foodEventId) {
          handlers.toastSuccess?.(ack.summaryKo);
        }
        return { graphId, status: "done", planKind: plan.kind, supply };
      }

      return executeContextRunPlan(
        bound,
        planTextIngestFallback(bound),
        handlers,
      );
    }
    case "mention_contract": {
      if (plan.needsConfirmOnly) {
        const feature = plan.mentionFeatureId
          ? getMentionFeature(plan.mentionFeatureId)
          : null;
        if (feature?.confirmCopy) {
          handlers.toastMessage?.(feature.confirmCopy);
        }
        if (plan.mentionSourceRef) {
          touchRunStateNode(plan.mentionSourceRef);
        }
        return { graphId, status: "done", planKind: plan.kind };
      }

      const gate = evaluateContractGate(bound.goalKo);
      if (gate.state === "MISSING_SLOT") {
        handlers.toastMessage?.(gate.question);
        if (plan.mentionSourceRef) {
          touchRunStateNode(plan.mentionSourceRef);
        }
        return { graphId, status: "done", planKind: plan.kind };
      }

      const mention = parseMentionForContract(bound.goalKo);
      if (!mention) {
        return executeContextRunPlan(
          bound,
          planTextIngestFallback(bound),
          handlers,
        );
      }

      const captured = await commitMentionContextIngress({
        rawText: bound.goalKo,
        mention,
      });
      touchRunStateNode(mention.feature.sourceRef);

      const routing = mention.routingMessage.trim();
      let supply: Awaited<ReturnType<typeof runGlobeMapIntentSupply>> | null = null;

      if (routing) {
        supply = await runGlobeMapIntentSupply({
          message: routing,
          contextEventId: captured.result.event.id,
          lat: ingress.kind === "text" ? ingress.lat : null,
          lng: ingress.kind === "text" ? ingress.lng : null,
          layerMode: ingress.kind === "text" ? ingress.layerMode : "personal",
        });

        if (supply?.status === "supplied") {
          const { ack } = supply;
          if (supply.lodgingEventId) {
            handlers.onLodgingDiscovery?.({
              eventId: supply.lodgingEventId,
              summaryKo: ack.summaryKo,
            });
          }
          if (supply.foodEventId) {
            handlers.onEateryDiscovery?.({
              eventId: supply.foodEventId,
              summaryKo: ack.summaryKo,
            });
          }
          handlers.onAttached?.(ack.eventId);
          if (!supply.lodgingEventId && !supply.foodEventId) {
            handlers.toastSuccess?.(ack.summaryKo);
          }
        }
      }

      handlers.onTextIngested?.({
        eventId: captured.result.event.id,
        toastLine: captured.toastLine,
        needsPlaceVerify: captured.placeVerify?.needsPlaceVerify,
      });

      return {
        graphId,
        status: "done",
        planKind: plan.kind,
        supply,
      };
    }
    case "text_ingest": {
      const outcome = await commitTextContextIngress(bound.goalKo);
      handlers.onTextIngested?.({
        eventId: outcome.result.event.id,
        toastLine: outcome.toastLine,
        needsPlaceVerify: outcome.placeVerify?.needsPlaceVerify,
      });
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "photo_ingest": {
      const photoInput = plan.photoInput;
      if (!photoInput?.files.length) {
        return { graphId, status: "noop", planKind: "noop" };
      }
      assertCommitPermitted({
        risk: "none",
        autoEnvelope: "photo_attach",
      });
      const summary = await ingestGlobeContextFromFiles(photoInput.files, {
        hintEventId: photoInput.contextEventId,
        hintTitle: photoInput.hintTitle,
        forceAttachToHint:
          photoInput.forceAttachToTarget && Boolean(photoInput.contextEventId),
        onProgress: handlers.onPhotoIngestProgress,
        onFilePrepare: handlers.onPhotoFilePrepare,
      });
      handlers.onPhotoIngested?.(summary);
      if (summary.succeeded > 0) {
        const pending = maybeOfferKnowledgePlacementAfterCapture({
          files: photoInput.files,
          summary,
        });
        if (pending) {
          handlers.onKnowledgePlacementPending?.(pending);
        }
      }
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "photo_walkthrough": {
      const files = plan.photoInput?.files ?? [];
      if (files.length > 0) {
        await handlers.onPhotoWalkthrough?.(files);
      }
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "discovery_photo_hint": {
      handlers.toastMessage?.(discoveryPhotoHintMessage());
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "share_ingest": {
      const shareText = plan.shareText?.trim() ?? bound.goalKo;
      if (!shareText) {
        return { graphId, status: "noop", planKind: "noop" };
      }
      assertCommitPermitted({
        risk: "none",
        autoEnvelope: "context_text_ingest",
      });
      await ingestPastedLinks(shareText);
      handlers.onShareIngested?.();
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "gps_dwell_confirm_open": {
      const eventId = plan.gpsDwellEventId?.trim();
      if (eventId) {
        handlers.onGpsDwellConfirmOpen?.(eventId);
      }
      return { graphId, status: "done", planKind: plan.kind };
    }
    case "globe_ingress": {
      let compiled = plan.globeIngress;
      if (!compiled) {
        return executeContextRunPlan(
          bound,
          planPersonalContextAskFallback(bound),
          handlers,
        );
      }
      const ingressText = bound.ingress;
      const existingContextId =
        ingressText.kind === "text" ? ingressText.contextEventId : null;
      const forceNew =
        ingressText.kind === "text" && ingressText.forceNewContext === true;

      // Cursor magic — Find before mint when hub is null.
      if (!existingContextId?.trim() && !forceNew) {
        const converge = resolveIngressContextConverge({
          utterance: bound.goalKo,
          events: listLifeEventCandidates(),
        });

        if (converge.decision === "ask_chips") {
          handlers.onIngressConvergeChips?.(converge);
          syncPortalComposeTurnToChat({
            graphId,
            userText: bound.goalKo,
            assistantText: copy.globe.tripSituationRouter.convergeHint,
          });
          return {
            graphId,
            status: "done",
            planKind: plan.kind,
          };
        }
      }

      // Mint path — Draft preview + 「생성」before Reality Commit (Article 0).
      // Hub refresh (existingContextId) still commits immediately.
      if (existingContextId?.trim()) {
        const classified = classifyExperienceRunIntent(bound.goalKo);
        const event = ensureTripContextEvent({
          message: bound.goalKo,
          existingEventId: existingContextId,
          profile: classified?.profile,
        });

        syncGlobeIngressCompileToFeed(compiled, bound.goalKo);
        const assistantText = buildTripIngressCreatedChatAssistantLine({
          eventTitle: event.title,
          blueprint: compiled.blueprint,
        });
        syncPortalComposeTurnToChat({
          graphId,
          userText: bound.goalKo,
          assistantText,
        });

        handlers.onGlobeIngressCompiled?.({ compiled, eventId: event.id });
        handlers.onAttached?.(event.id);
        refreshWorkQueue(handlers);
        return {
          graphId,
          status: "done",
          planKind: plan.kind,
          globeIngress: compiled,
        };
      }

      const classified = classifyExperienceRunIntent(bound.goalKo);
      const mintGraphId = resolveActiveComposerGraphId(bound.goalKo);
      const draft = buildPendingContextCreateDraft({
        graphId: mintGraphId,
        utterance: bound.goalKo,
        compiled,
        profile: classified?.profile ?? null,
      });
      offerPendingContextCreate({ draft, skipUserEcho: true });
      handlers.toastMessage?.(copy.globe.contextAnchor.chipPrompt);
      refreshWorkQueue(handlers);
      return {
        graphId,
        status: "done",
        planKind: plan.kind,
        globeIngress: compiled,
      };
    }
    case "experience_run": {
      const ingressText = bound.ingress;
      const runResult = await resolveExperienceRunTurn({
        message: bound.goalKo,
        lat: ingressText.kind === "text" ? ingressText.lat : null,
        lng: ingressText.kind === "text" ? ingressText.lng : null,
      });

      if (runResult.kind === "clarify") {
        syncExperienceRunClarifyToFeed(runResult, bound.goalKo);
        syncPortalComposeTurnToChat({
          graphId,
          userText: bound.goalKo,
          assistantText: runResult.questionKo,
        });
        handlers.onExperienceRunClarify?.(runResult);
        refreshWorkQueue(handlers);
        return {
          graphId,
          status: "done",
          planKind: plan.kind,
          experienceRun: runResult,
        };
      }

      if (runResult.kind === "summary") {
        syncExperienceRunSummaryToFeed(runResult.summary, bound.goalKo);
        const assistantText =
          runResult.summary.meaningLineKo?.trim() ||
          runResult.summary.bodyKo.trim() ||
          runResult.summary.titleKo;
        syncPortalComposeTurnToChat({
          graphId,
          userText: bound.goalKo,
          assistantText,
        });
        handlers.onExperienceRunSummary?.(runResult);
        refreshWorkQueue(handlers);
        return {
          graphId,
          status: "done",
          planKind: plan.kind,
          experienceRun: runResult,
        };
      }

      return executeContextRunPlan(
        bound,
        planPersonalContextAskFallback(bound),
        handlers,
      );
    }
    case "personal_context_ask": {
      let query = bound.goalKo;
      if (
        bound.ingress.kind === "text" &&
        bound.ingress.surface !== "capture_sheet"
      ) {
        const interpreted = await interpretMessyForPersonalAsk({
          messyInput: bound.goalKo,
          scope: "personal",
        });
        query = interpreted.refinedMessage;
      }
      const personal = resolvePersonalContextAsk({
        query,
        events: listLifeEventCandidates(),
        scope: "personal",
      });
      handlers.onPersonalContextAsk?.(personal);
      return {
        graphId,
        status: "done",
        planKind: plan.kind,
        personalAsk: personal,
      };
    }
    case "external_context_ask": {
      const ingressText = bound.ingress;
      try {
        const sources = await fetchExternalContextSourcesClient({
          lat: ingressText.kind === "text" ? ingressText.lat : null,
          lng: ingressText.kind === "text" ? ingressText.lng : null,
        });
        const external = resolveExternalContextAsk({
          query: bound.goalKo,
          sources,
          lat: ingressText.kind === "text" ? ingressText.lat : null,
          lng: ingressText.kind === "text" ? ingressText.lng : null,
        });
        handlers.onExternalContextAsk?.(external);
        return {
          graphId,
          status: "done",
          planKind: plan.kind,
          externalAsk: external,
        };
      } catch {
        handlers.onExternalContextAskError?.();
        return { graphId, status: "done", planKind: plan.kind };
      }
    }
    default:
      return { graphId, status: "noop", planKind: "noop" };
  }
}
