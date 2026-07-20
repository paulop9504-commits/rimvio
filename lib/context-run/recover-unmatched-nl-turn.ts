/**
 * Unmatched NL turn recovery — never silent null.
 * Unknown / miss → one clarify chip set, or Reason-Later one-liner + chips.
 */

import type { ContextPackV1 } from "@/lib/context-builder";
import type { ClarifyLessChip } from "@/lib/rule-engine/clarify-less";
import { writeClarifyLessPending } from "@/lib/rule-engine/clarify-less-pending-store";
import type { RuleEngineDecision } from "@/lib/rule-engine/evaluate-utterance-rules";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import type { SessionGraphV1 } from "@/lib/graph-command/types";

export type UnmatchedNlRecovery = {
  readonly via: "clarify" | "reason";
  readonly assistantReplyKo: string;
  readonly clarifyChips: readonly ClarifyLessChip[];
};

function chips(rows: readonly { id: string; labelKo: string; value: string }[]): ClarifyLessChip[] {
  return rows.map((row) => ({
    id: row.id,
    labelKo: row.labelKo,
    gapId: "next",
    value: row.value,
  }));
}

function placeLabels(graph: SessionGraphV1 | null): string[] {
  if (!graph) {
    return [];
  }
  return graph.nodes
    .filter(
      (n) =>
        n.visible &&
        (n.kind === "lodging" || n.kind === "eatery" || n.kind === "poi") &&
        n.labelKo.trim(),
    )
    .slice(0, 3)
    .map((n) => n.labelKo.trim());
}

/**
 * Build recovery when Graph/soft/compound did not match.
 * Prefer 1–3 chips that re-enter the same pipeline as utterances.
 */
export function recoverUnmatchedNlTurn(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly ruleDecision: RuleEngineDecision;
  readonly pack: ContextPackV1;
  readonly graph: SessionGraphV1 | null;
}): UnmatchedNlRecovery {
  const intent = input.ruleDecision.intent;
  const utterance = input.utterance.trim();
  const places = placeLabels(input.graph);
  const lodgingOpen = Boolean(input.pack.lodgingDiff?.lastBatchId);
  const allowReason = input.ruleDecision.allowLlmReasoning;

  if (intent === "Move") {
    if (places.length === 0) {
      const next = chips([
        {
          id: "recover_search_lodging",
          labelKo: "숙소 찾기",
          value: "숙소 찾아줘",
        },
        {
          id: "recover_search_eatery",
          labelKo: "맛집 찾기",
          value: "맛집 찾아줘",
        },
      ]);
      writeClarifyLessPending(input.contextEventId, {
        originalUtterance: utterance || "옮겨줘",
        intentLabelKo: "Move",
        candidateIds: next.map((c) => c.value),
        atIso: new Date().toISOString(),
      });
      return {
        via: "clarify",
        assistantReplyKo: "옮길 핀이 없어요. 먼저 찾을까요?",
        clarifyChips: next,
      };
    }
    const next = chips(
      places.map((label, index) => ({
        id: `recover_move_${index}`,
        labelKo: `${label} 옮기기`,
        value: `${label}을 여행 맥락으로 옮겨`,
      })),
    );
    writeClarifyLessPending(input.contextEventId, {
      originalUtterance: utterance || "옮겨줘",
      intentLabelKo: "Move",
      candidateIds: places,
      atIso: new Date().toISOString(),
    });
    return {
      via: "clarify",
      assistantReplyKo: "어느 걸 옮길까요?",
      clarifyChips: next.slice(0, 3),
    };
  }

  if (intent === "Reserve" || intent === "Purchase") {
    const next = chips(
      places.length > 0
        ? places.map((label, index) => ({
            id: `recover_reserve_${index}`,
            labelKo: intent === "Purchase" ? `${label} 결제` : `${label} 예약`,
            value:
              intent === "Purchase"
                ? `${label} 결제해`
                : `${label} 예약 준비해`,
          }))
        : [
            {
              id: "recover_find_then_reserve",
              labelKo: "숙소 찾아 예약",
              value: "숙소 찾아서 예약 준비해",
            },
          ],
    );
    writeClarifyLessPending(input.contextEventId, {
      originalUtterance: utterance,
      intentLabelKo: intent,
      candidateIds: next.map((c) => c.value),
      atIso: new Date().toISOString(),
    });
    return {
      via: "clarify",
      assistantReplyKo: places.length
        ? intent === "Purchase"
          ? "어느 걸로 결제 준비할까요?"
          : "어느 걸로 예약 준비할까요?"
        : intent === "Purchase"
          ? "결제할 대상이 없어요. 먼저 찾아볼까요?"
          : "예약할 대상이 없어요. 먼저 찾아볼까요?",
      clarifyChips: next.slice(0, 3),
    };
  }

  if (intent === "Share") {
    const next = chips(
      places.length > 0
        ? places.map((label, index) => ({
            id: `recover_share_${index}`,
            labelKo: `${label} 공유`,
            value: `${label} 공유해`,
          }))
        : [
            {
              id: "recover_search_then_share",
              labelKo: "숙소 찾기",
              value: "숙소 찾아줘",
            },
            {
              id: "recover_eatery_then_share",
              labelKo: "맛집 찾기",
              value: "맛집 찾아줘",
            },
          ],
    );
    writeClarifyLessPending(input.contextEventId, {
      originalUtterance: utterance || "공유해",
      intentLabelKo: "Share",
      candidateIds: next.map((c) => c.value),
      atIso: new Date().toISOString(),
    });
    return {
      via: "clarify",
      assistantReplyKo: places.length
        ? "어느 걸 공유할까요?"
        : "공유할 핀이 없어요. 먼저 찾을까요?",
      clarifyChips: next.slice(0, 3),
    };
  }

  if (intent === "Create") {
    const next = chips([
      {
        id: "recover_create_context",
        labelKo: "여행 맥락 만들기",
        value: "여행 맥락 만들어",
      },
      {
        id: "recover_search_lodging",
        labelKo: "숙소 찾기",
        value: "숙소 찾아줘",
      },
    ]);
    writeClarifyLessPending(input.contextEventId, {
      originalUtterance: utterance,
      intentLabelKo: "Create",
      candidateIds: next.map((c) => c.value),
      atIso: new Date().toISOString(),
    });
    return {
      via: "clarify",
      assistantReplyKo: "어떤 맥락을 만들까요?",
      clarifyChips: next,
    };
  }

  if (intent === "Simulate") {
    const next = chips([
      {
        id: "recover_sim_rain",
        labelKo: "비 오면",
        value: "비 오면 어때",
      },
      {
        id: "recover_sim_hotel",
        labelKo: "이 호텔이면",
        value: places[0]
          ? `${places[0]}이면 어때`
          : "숙소 찾아줘",
      },
    ]);
    writeClarifyLessPending(input.contextEventId, {
      originalUtterance: utterance,
      intentLabelKo: "Simulate",
      candidateIds: next.map((c) => c.value),
      atIso: new Date().toISOString(),
    });
    return {
      via: "clarify",
      assistantReplyKo: "어떤 상황을 시뮬할까요?",
      clarifyChips: next,
    };
  }

  if (intent === "Group") {
    if (places.length < 2) {
      const next = chips([
        {
          id: "recover_search_then_group",
          labelKo: "숙소 찾기",
          value: "숙소 찾아줘",
        },
        {
          id: "recover_eatery_then_group",
          labelKo: "맛집 찾기",
          value: "맛집 찾아줘",
        },
      ]);
      writeClarifyLessPending(input.contextEventId, {
        originalUtterance: utterance || "묶어줘",
        intentLabelKo: "Group",
        candidateIds: next.map((c) => c.value),
        atIso: new Date().toISOString(),
      });
      return {
        via: "clarify",
        assistantReplyKo: "묶을 핀이 부족해요. 먼저 찾을까요?",
        clarifyChips: next,
      };
    }
    const next = chips([
      {
        id: "recover_group_first_two",
        labelKo: `${places[0]}·${places[1]} 묶기`,
        value: `${places[0]}이랑 ${places[1]} 묶어줘`,
      },
    ]);
    writeClarifyLessPending(input.contextEventId, {
      originalUtterance: utterance || "묶어줘",
      intentLabelKo: "Group",
      candidateIds: next.map((c) => c.value),
      atIso: new Date().toISOString(),
    });
    return {
      via: "clarify",
      assistantReplyKo: "어느 걸 묶을까요?",
      clarifyChips: next,
    };
  }

  if (intent === "Note") {
    if (places.length === 0) {
      const next = chips([
        {
          id: "recover_search_then_note",
          labelKo: "숙소 찾기",
          value: "숙소 찾아줘",
        },
      ]);
      writeClarifyLessPending(input.contextEventId, {
        originalUtterance: utterance || "메모해",
        intentLabelKo: "Note",
        candidateIds: next.map((c) => c.value),
        atIso: new Date().toISOString(),
      });
      return {
        via: "clarify",
        assistantReplyKo: "메모할 핀이 없어요. 먼저 찾을까요?",
        clarifyChips: next,
      };
    }
    const next = chips(
      places.map((label, index) => ({
        id: `recover_note_${index}`,
        labelKo: `${label} 메모`,
        value: `${label}에 메모해`,
      })),
    );
    writeClarifyLessPending(input.contextEventId, {
      originalUtterance: utterance || "메모해",
      intentLabelKo: "Note",
      candidateIds: places,
      atIso: new Date().toISOString(),
    });
    return {
      via: "clarify",
      assistantReplyKo: "어디에 메모할까요?",
      clarifyChips: next.slice(0, 3),
    };
  }

  // Reason-Later / Unknown — one chip set, never silent.
  const reasonChips = chips([
    lodgingOpen
      ? {
          id: "recover_research",
          labelKo: "같은 조건 다시",
          value: "다시 찾아줘",
        }
      : {
          id: "recover_lodging",
          labelKo: "숙소 찾기",
          value: "숙소 찾아줘",
        },
    {
      id: "recover_eatery",
      labelKo: "맛집 찾기",
      value: "맛집 찾아줘",
    },
    {
      id: "recover_amenity",
      labelKo: "약국·편의",
      value: "주변 약국 찾아줘",
    },
  ]);

  writeClarifyLessPending(input.contextEventId, {
    originalUtterance: utterance,
    intentLabelKo: intent,
    candidateIds: reasonChips.map((c) => c.value),
    atIso: new Date().toISOString(),
  });

  const family = classifyIntentFamily(utterance);
  const reasonLine = allowReason
    ? family === "Analyze" || family === "Unknown"
      ? "아직 바로 실행할 명령은 못 잡았어요. 다음에 뭐 할까요?"
      : `${intent}으로 이해했어요. 실행할 다음을 골라 주세요.`
    : "다음에 뭐 할까요?";

  return {
    via: allowReason ? "reason" : "clarify",
    assistantReplyKo: reasonLine,
    clarifyChips: reasonChips,
  };
}

/** Scout handoff — Operator/pin-bar must continue Field discovery (not silent). */
export function buildScoutHandoffResult(input: {
  readonly contextEventId: string;
  readonly ruleDecision: RuleEngineDecision;
  readonly pack: ContextPackV1;
  readonly utterance: string;
}): {
  readonly ok: true;
  readonly via: "scout_handoff";
  readonly contextEventId: string;
  readonly assistantReplyKo: string;
  readonly reservedOpIds: readonly [];
  readonly waitingCommit: false;
  readonly ruleDecision: RuleEngineDecision;
  readonly contextPack: ContextPackV1;
  readonly handoffKind: "discovery_scout";
} {
  return {
    ok: true,
    via: "scout_handoff",
    contextEventId: input.contextEventId,
    assistantReplyKo: "조건에 맞춰 찾아볼게요",
    reservedOpIds: [],
    waitingCommit: false,
    ruleDecision: input.ruleDecision,
    contextPack: input.pack,
    handoffKind: "discovery_scout",
  };
}
