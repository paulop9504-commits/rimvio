/**
 * Generate Draft Action from Agent Plan — Proposal only, never Commit.
 * Hotel replace runs Reality Simulation (SIMULATION_ONLY) before Draft.
 */

import { createWorkspaceCommand } from "@/lib/workspace-command/command-parser";
import { proposeDraftAction } from "@/lib/workspace-command/draft-action-engine";
import { saveDraftMutation } from "@/lib/workspace-command/draft-mutation-store";
import type { WorkspaceActionProposal } from "@/lib/workspace-command/types";
import type {
  WorkspaceAgentContext,
  WorkspaceAgentPlan,
} from "@/lib/workspace-agent/types";
import { findSimilar, getRealityEntity } from "@/lib/reality-graph";
import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";
import {
  buildRealityStateSlice,
  simulateHotelChange,
  type SimulationResult,
} from "@/lib/simulation-engine";

export type GeneratedAgentAction = {
  readonly proposal: WorkspaceActionProposal;
  readonly alternativesKo: readonly string[];
  readonly proposalKind: "hotel_change" | "context_modify" | "generic";
  readonly simulation: SimulationResult | null;
};

function numProp(
  props: Readonly<Record<string, unknown>>,
  key: string,
): number | null {
  const v = props[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function generateWorkspaceAgentAction(input: {
  readonly workspaceId: string;
  readonly utterance: string;
  readonly context: WorkspaceAgentContext;
  readonly plan: WorkspaceAgentPlan;
}): GeneratedAgentAction {
  const command = createWorkspaceCommand({
    workspaceId: input.workspaceId,
    rawText: input.utterance,
  });

  const proposal = proposeDraftAction({
    command,
    intent: input.plan.intent,
    targetObjectId: input.context.currentHotel?.objectId,
  });

  const alternativesKo: string[] = [];
  let simulation: SimulationResult | null = null;
  const entityId = input.context.currentHotel?.entityId;
  const hotel = input.context.currentHotel;

  if (entityId && hotel && input.plan.intent.action === "replace") {
    const similar = findSimilar(entityId, { limit: 3 });
    for (const e of similar) {
      const name = String(e.properties.name ?? e.properties.title ?? e.id);
      alternativesKo.push(name);
    }

    const candidate = similar[0];
    if (candidate) {
      const currentEntity = getRealityEntity(entityId);
      const curProps = currentEntity?.properties ?? {};
      const candPrice =
        numProp(candidate.properties, "priceWon") ??
        parseWonAmount(
          String(
            candidate.properties.priceLabelKo ??
              candidate.properties.amountLabel ??
              "",
          ) || null,
        );
      const candTravel = numProp(candidate.properties, "travelMinutes");
      const candRating = numProp(candidate.properties, "rating");
      const curPrice =
        numProp(curProps, "priceWon") ?? parseWonAmount(hotel.priceLabelKo);
      const curTravel = numProp(curProps, "travelMinutes") ?? 0;
      const curRating = numProp(curProps, "rating");

      simulation = simulateHotelChange({
        workspaceId: input.workspaceId,
        current: buildRealityStateSlice({
          objectId: hotel.objectId,
          title: hotel.title,
          kind: "hotel",
          priceWon: curPrice,
          priceLabelKo: hotel.priceLabelKo,
          rating: curRating,
          travelMinutes: curTravel,
          lat: numProp(curProps, "lat"),
          lng: numProp(curProps, "lng"),
        }),
        candidate: buildRealityStateSlice({
          objectId: candidate.id,
          title: String(
            candidate.properties.name ?? candidate.properties.title ?? candidate.id,
          ),
          kind: "hotel",
          priceWon: candPrice,
          priceLabelKo:
            candPrice != null
              ? `${candPrice.toLocaleString("ko-KR")}원`
              : String(candidate.properties.priceLabelKo ?? "") || null,
          rating: candRating,
          travelMinutes: candTravel ?? 0,
          lat: numProp(candidate.properties, "lat"),
          lng: numProp(candidate.properties, "lng"),
        }),
      });
    }
  }
  if (alternativesKo.length === 0 && input.plan.intent.action === "replace") {
    alternativesKo.push("비슷한 후보를 Workspace에서 다시 모읍니다");
  }

  const isFatigue =
    input.plan.intent.action === "optimize_context" &&
    input.plan.intent.parameters.problem === "day1_fatigue";

  if (isFatigue) {
    alternativesKo.push("Day1 맛집 제거", "관광 Day2 이동");
    simulation = simulateHotelChange({
      workspaceId: input.workspaceId,
      persist: true,
      current: buildRealityStateSlice({
        objectId: "day1_schedule",
        title: "Day1 · 공항→호텔→맛집→관광",
        kind: "schedule",
        priceWon: null,
        travelMinutes: 180,
        attrs: {
          fatigueScore: 85,
          foodAccessMinutes: 40,
          usjMinutes: 90,
          airportMinutes: 50,
        },
      }),
      candidate: buildRealityStateSlice({
        objectId: "day1_schedule_soft",
        title: "Day1 · 공항→호텔 · 관광은 Day2",
        kind: "schedule",
        priceWon: null,
        travelMinutes: 90,
        attrs: {
          fatigueScore: 45,
          foodAccessMinutes: 20,
          usjMinutes: 90,
          airportMinutes: 50,
        },
      }),
    });
  }

  const enrichedProposal: WorkspaceActionProposal = {
    ...proposal,
    draft: {
      ...proposal.draft,
      afterState: {
        ...proposal.draft.afterState,
        proposalKind: isFatigue
          ? "schedule_soften"
          : input.plan.intent.action === "replace"
            ? "hotel_change"
            : "context",
        alternativesKo,
        currentHotel: hotel?.title ?? null,
        simulationId: simulation?.simulationId ?? null,
        simulationStatus: simulation?.status ?? null,
        simulationImpact: simulation?.impact ?? null,
        ...(isFatigue
          ? {
              observe: ["airport", "hotel", "eatery", "sightseeing"],
              problem: "피로도 높음",
              plan: ["맛집 제거", "Day2 이동"],
            }
          : {}),
      },
      beforeState: {
        ...proposal.draft.beforeState,
        currentHotel: hotel?.title ?? null,
        priceLabelKo: hotel?.priceLabelKo ?? null,
        ...(isFatigue
          ? { day1: ["공항", "호텔", "맛집", "관광"], fatigueScore: 85 }
          : {}),
      },
    },
    previewKo: isFatigue
      ? `Schedule Soften · Day1 피로도 ↓ · ${proposal.previewKo}`
      : input.plan.intent.action === "replace"
        ? `Hotel Change Proposal · ${hotel?.title ?? "현재 호텔"} → 대체안 · ${proposal.previewKo}`
        : proposal.previewKo,
  };
  saveDraftMutation(enrichedProposal.draft);

  const proposalKind =
    input.plan.intent.action === "replace"
      ? "hotel_change"
      : input.plan.intent.action === "modify_context" ||
          input.plan.intent.action === "filter"
        ? "context_modify"
        : "generic";

  return {
    proposal: enrichedProposal,
    alternativesKo,
    proposalKind,
    simulation,
  };
}
