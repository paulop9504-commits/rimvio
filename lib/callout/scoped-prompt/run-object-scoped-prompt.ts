/**
 * Object Scoped Prompt runner
 *
 * Current Object Context + User Intent
 *   → Context AI (deterministic scoped compile)
 *   → Simulation Draft
 *   → Prepare Draft
 *
 * Forbidden: general ChatGPT essay, Reality Commit.
 */

import {
  createReservationDraft,
} from "@/lib/callout/prepare/create-reservation-draft";
import type {
  ReservationDateRange,
  ReservationPrice,
} from "@/lib/callout/prepare/types";
import {
  createSimulationDraft,
} from "@/lib/callout/simulation/run-what-if-simulation";
import type {
  CurrentRealitySnapshot,
  SimulationItineraryAnchor,
  SimulationProposal,
} from "@/lib/callout/simulation/types";
import { parseObjectScopedIntent } from "@/lib/callout/scoped-prompt/parse-object-scoped-intent";
import type {
  ObjectScopedPromptReject,
  ObjectScopedPromptRequest,
  ObjectScopedPromptResult,
  ObjectScopedPromptStage,
} from "@/lib/callout/scoped-prompt/types";
import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";

export type ObjectScopedPromptHostInput = {
  readonly request: ObjectScopedPromptRequest;
  /** Alternative objects for change → Simulation (same type preferred) */
  readonly proposals?: readonly SimulationProposal[];
  readonly anchors?: readonly SimulationItineraryAnchor[];
  readonly dateRange?: ReservationDateRange | null;
  readonly guestCount?: number | null;
  readonly price?: ReservationPrice | null;
};

function toCurrentReality(
  request: ObjectScopedPromptRequest,
): CurrentRealitySnapshot {
  const { object } = request;
  return {
    objectId: object.id,
    title: object.title,
    typeLabelKo: object.type,
    priceWon: parseWonAmount(object.facts.priceLabelKo),
    priceLabelKo: object.facts.priceLabelKo,
    lat: object.location.lat,
    lng: object.location.lng,
    dayLabelKo: null,
  };
}

function buildReplyKo(input: {
  title: string;
  intentLabel: string;
  kind: string;
  simCount: number;
  prepared: boolean;
}): string {
  const bits = [
    `「${input.title}」범위`,
    input.intentLabel,
  ];
  if (input.kind === "change" || input.kind === "simulate") {
    bits.push(
      input.simCount > 0
        ? `Simulation ${input.simCount}건`
        : "Simulation 준비",
    );
  }
  if (input.prepared || input.kind === "prepare") {
    bits.push("Prepare Draft");
  }
  bits.push("Commit 아님");
  return bits.join(" · ");
}

/**
 * Compile Object Scoped Prompt into Simulation / Prepare drafts.
 * Host applies workspaceHint — this function never Commits Reality.
 */
export function runObjectScopedPrompt(
  input: ObjectScopedPromptHostInput,
): ObjectScopedPromptResult | ObjectScopedPromptReject {
  const { request } = input;
  const parsed = parseObjectScopedIntent(request.utterance);
  if ("reject" in parsed) {
    return {
      ok: false,
      reasonKo: parsed.reasonKo,
      escapedScope: /일반 채팅/.test(parsed.reasonKo),
    };
  }

  const stages: ObjectScopedPromptStage[] = [
    "object_context",
    "user_intent",
    "context_ai",
  ];

  const current = toCurrentReality(request);
  const proposals = (input.proposals ?? []).filter(
    (p) => p.objectId !== request.object.id,
  );

  let simulationDraft = null as ObjectScopedPromptResult["simulationDraft"];
  let shouldCreateSimulation = false;
  let workspaceOp: ObjectScopedPromptResult["workspaceHint"]["op"] = "none";
  let simulateScenarioKo: string | null = null;

  if (parsed.kind === "change" || parsed.kind === "simulate") {
    shouldCreateSimulation = true;
    stages.push("simulation");
    workspaceOp = parsed.kind === "change" ? "find_similar" : "simulate";
    simulateScenarioKo = `${parsed.labelKo}: ${parsed.utterance}`;

    const proposal = proposals[0];
    if (proposal) {
      simulationDraft = createSimulationDraft({
        contextId: request.contextId,
        scenarioKind:
          request.object.type === "hotel" ? "change_hotel" : "change_object",
        current,
        proposal,
        anchors: input.anchors ?? [],
      });
    }
  } else if (parsed.kind === "compare") {
    workspaceOp = "compare";
  } else if (parsed.kind === "explore") {
    workspaceOp = "find_similar";
  }

  let reservationDraft = null as ObjectScopedPromptResult["reservationDraft"];
  let shouldCreatePrepare = false;

  if (
    parsed.kind === "prepare" ||
    parsed.kind === "change" ||
    parsed.kind === "simulate"
  ) {
    // Change/Simulate end in Prepare readiness — Draft only.
    shouldCreatePrepare = parsed.kind === "prepare" || Boolean(simulationDraft);
    if (parsed.kind === "prepare" || shouldCreatePrepare) {
      stages.push("prepare");
    }
    if (parsed.kind === "prepare") {
      reservationDraft = createReservationDraft({
        contextId: request.contextId,
        object: request.object,
        dateRange: input.dateRange,
        guestCount: input.guestCount,
        price: input.price,
      });
      workspaceOp = workspaceOp === "none" ? "select" : workspaceOp;
    }
  }

  return {
    ok: true,
    scope: {
      objectId: request.object.id,
      objectType: request.object.type,
      title: request.object.title,
    },
    intent: parsed,
    stagesCompleted: stages,
    replyKo: buildReplyKo({
      title: request.object.title,
      intentLabel: parsed.labelKo,
      kind: parsed.kind,
      simCount: simulationDraft ? 1 : 0,
      prepared: Boolean(reservationDraft) || shouldCreatePrepare,
    }),
    workspaceHint: {
      op: workspaceOp,
      simulateScenarioKo,
    },
    shouldCreateSimulation,
    shouldCreatePrepare,
    simulationDraft,
    reservationDraft,
  };
}
