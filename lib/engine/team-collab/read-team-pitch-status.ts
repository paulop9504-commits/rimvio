/**
 * Phase 4 thin — pitch status for Reality Surface / hub (compositor only).
 * @see docs/RIMVIO_TEAM_COLLABORATION.md
 */

import { readPendingEnginePass } from "@/lib/engine/team-collab/engine-pass-queue";
import { readPendingFieldHandoff } from "@/lib/engine/team-collab/field-handoff-queue";
import { readMultiOperatorApproval } from "@/lib/engine/team-collab/multi-operator-approval";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

export type TeamPitchBallSurface = "globe_engine" | "field_queue" | "human_commit";

export type TeamPitchStatusV1 = {
  readonly ballSurface: TeamPitchBallSurface;
  readonly pendingToEngineId: RimvioEngineId | null;
  readonly fieldTab: "queue" | "trades" | "mine" | null;
  readonly operatorPrepared: boolean;
  readonly labelKo: string;
};

export function readTeamPitchStatus(
  metadata: Record<string, unknown> | null | undefined,
): TeamPitchStatusV1 {
  const field = readPendingFieldHandoff(metadata);
  const pass = readPendingEnginePass(metadata);
  const approval = readMultiOperatorApproval(metadata);
  const operatorPrepared = Boolean(approval.stamps.operator);

  if (field) {
    return {
      ballSurface: "field_queue",
      pendingToEngineId: null,
      fieldTab: field.tab,
      operatorPrepared,
      labelKo: "볼: 맞춤 (확정 대기)",
    };
  }
  if (pass) {
    return {
      ballSurface: "globe_engine",
      pendingToEngineId: pass.toEngineId,
      fieldTab: null,
      operatorPrepared,
      labelKo: `볼: ${pass.toEngineId}`,
    };
  }
  if (operatorPrepared && !approval.stamps.human) {
    return {
      ballSurface: "human_commit",
      pendingToEngineId: null,
      fieldTab: "queue",
      operatorPrepared: true,
      labelKo: "볼: 캡틴 확정",
    };
  }
  return {
    ballSurface: "globe_engine",
    pendingToEngineId: null,
    fieldTab: null,
    operatorPrepared,
    labelKo: "볼: 지구",
  };
}
