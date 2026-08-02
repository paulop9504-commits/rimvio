/**
 * Reality Prepare Layer
 *
 * Discovered → Candidate → Compared → Prepared → (Commit elsewhere)
 *
 * AI fills Prepare Object to ready_for_commit — never pays / books / purchases.
 */

import {
  buildFlightPreparePayload,
  buildPurchaseCandidatePayload,
  buildReservationPreparePayload,
  buildSchedulePreparePayload,
  resolvePrepareAction,
  summarizePreparePayload,
} from "@/lib/prepare-layer/draft-actions";
import {
  assertPrepareDoesNotExecute,
  looksLikeForbiddenPrepareUtterance,
  validatePrepareDraft,
} from "@/lib/prepare-layer/prepare-validator";
import type {
  PrepareAction,
  PrepareLifecycleStage,
  PrepareObject,
  PrepareResult,
} from "@/lib/prepare-layer/types";
import {
  PREPARE_LIFECYCLE_STAGES,
  PREPARE_OBJECT_STATUS,
} from "@/lib/prepare-layer/types";
import {
  getRealityEntity,
  updateRealityEntityState,
} from "@/lib/reality-graph";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";

const byId = new Map<string, PrepareObject>();
const byWorkspace = new Map<string, string[]>();
const byEntity = new Map<string, string[]>();

export const PREPARE_UPDATED = "rimvio:reality-prepare-updated";

function emit(workspaceId: string | null): void {
  if (typeof window === "undefined" || !workspaceId) return;
  window.dispatchEvent(
    new CustomEvent(PREPARE_UPDATED, {
      detail: { workspaceId, status: PREPARE_OBJECT_STATUS },
    }),
  );
}

function newPrepareId(entityId: string): string {
  return `prep_${Date.now().toString(36)}_${entityId.slice(0, 12)}`;
}

export function savePrepareObject(prepare: PrepareObject): PrepareObject {
  assertPrepareDoesNotExecute("save_prepare");
  if (prepare.status !== PREPARE_OBJECT_STATUS) {
    throw new Error("PrepareObject.status must be ready_for_commit");
  }
  byId.set(prepare.prepareId, prepare);
  const ws = prepare.workspaceId?.trim();
  if (ws) {
    const list = byWorkspace.get(ws) ?? [];
    if (!list.includes(prepare.prepareId)) {
      byWorkspace.set(ws, [...list, prepare.prepareId]);
    }
    emit(ws);
  }
  const ent = prepare.entityId.trim();
  if (ent) {
    const list = byEntity.get(ent) ?? [];
    if (!list.includes(prepare.prepareId)) {
      byEntity.set(ent, [...list, prepare.prepareId]);
    }
  }
  return prepare;
}

export function readPrepareObject(prepareId: string): PrepareObject | null {
  return byId.get(prepareId.trim()) ?? null;
}

export function listPrepares(workspaceId: string): readonly PrepareObject[] {
  const ids = byWorkspace.get(workspaceId.trim()) ?? [];
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is PrepareObject => Boolean(p));
}

export function readLatestPrepare(
  workspaceId: string,
): PrepareObject | null {
  const list = listPrepares(workspaceId);
  return list.length > 0 ? list[list.length - 1]! : null;
}

export function clearPreparesForTests(workspaceId?: string): void {
  if (!workspaceId) {
    byId.clear();
    byWorkspace.clear();
    byEntity.clear();
    return;
  }
  const key = workspaceId.trim();
  const ids = byWorkspace.get(key) ?? [];
  for (const id of ids) {
    const p = byId.get(id);
    byId.delete(id);
    if (p) {
      const el = byEntity.get(p.entityId) ?? [];
      byEntity.set(
        p.entityId,
        el.filter((x) => x !== id),
      );
    }
  }
  byWorkspace.delete(key);
}

/**
 * Lifecycle order helper — Commit is last and never performed here.
 */
export function nextPrepareLifecycle(
  current: PrepareLifecycleStage,
): PrepareLifecycleStage | null {
  const i = PREPARE_LIFECYCLE_STAGES.indexOf(current);
  if (i < 0 || i >= PREPARE_LIFECYCLE_STAGES.length - 1) return null;
  const next = PREPARE_LIFECYCLE_STAGES[i + 1]!;
  // Prepare Layer may advance up to "prepared" only
  if (next === "committed") return null;
  return next;
}

function buildPayloadForAction(input: {
  readonly action: PrepareAction;
  readonly entityId: string;
  readonly workspaceId: string | null;
  readonly titleHint: string | null;
  readonly priceLabelKo: string | null;
  readonly guests?: number | null;
  readonly options?: Readonly<Record<string, unknown>>;
}): Readonly<Record<string, unknown>> {
  const entity = getRealityEntity(input.entityId);
  const title =
    input.titleHint ??
    String(entity?.properties.name ?? entity?.properties.title ?? "대상");
  const priceLabelKo =
    input.priceLabelKo ??
    (entity?.properties.priceLabelKo != null
      ? String(entity.properties.priceLabelKo)
      : null);
  const priceWon =
    typeof entity?.properties.priceWon === "number"
      ? entity.properties.priceWon
      : parseWonAmount(priceLabelKo);

  const ctx = input.workspaceId
    ? readContextWorkspace(input.workspaceId)
    : null;
  const stayLabelKo = ctx?.realityDraft?.stayLabelKo ?? null;

  switch (input.action) {
    case "reservation_prepare":
      return buildReservationPreparePayload({
        hotelTitle: title,
        dateLabelKo: stayLabelKo,
        guests: input.guests,
        priceWon,
        priceLabelKo,
        checkInIso:
          typeof input.options?.checkInIso === "string"
            ? input.options.checkInIso
            : null,
        checkOutIso:
          typeof input.options?.checkOutIso === "string"
            ? input.options.checkOutIso
            : null,
        options: input.options,
      });
    case "flight_prepare":
      return buildFlightPreparePayload({
        routeLabelKo: title,
        passengers: input.guests ?? 1,
        priceLabelKo,
        options: input.options,
      });
    case "purchase_candidate":
      return buildPurchaseCandidatePayload({
        itemTitle: title,
        priceLabelKo,
        options: input.options,
      });
    case "schedule_prepare":
      return buildSchedulePreparePayload({
        titleKo: title,
        options: input.options,
      });
  }
}

/**
 * Run Prepare: create Prepare Object (ready_for_commit). Does not Commit.
 */
export function runRealityPrepare(input: {
  readonly entityId: string;
  readonly utterance: string;
  readonly workspaceId?: string | null;
  readonly action?: PrepareAction | null;
  readonly titleHint?: string | null;
  readonly priceLabelKo?: string | null;
  readonly guests?: number | null;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly persist?: boolean;
  /** Sync entity lifecycle → prepared (never committed) */
  readonly syncEntityLifecycle?: boolean;
}): PrepareResult {
  assertPrepareDoesNotExecute("prepare");

  if (looksLikeForbiddenPrepareUtterance(input.utterance)) {
    return {
      ok: false,
      reasonKo:
        "결제 · 예약 확정 · 구매 실행은 Prepare Layer 밖이에요 · Field에서 Commit하세요",
      forbidden: true,
      executed: false,
    };
  }

  const action =
    input.action ?? resolvePrepareAction(input.utterance);
  if (!action) {
    return {
      ok: false,
      reasonKo: "Prepare로 다룰 행동을 못 찾았어요",
      forbidden: false,
      executed: false,
    };
  }

  const payload = buildPayloadForAction({
    action,
    entityId: input.entityId,
    workspaceId: input.workspaceId ?? null,
    titleHint: input.titleHint ?? null,
    priceLabelKo: input.priceLabelKo ?? null,
    guests: input.guests,
    options: input.options,
  });

  const validated = validatePrepareDraft({
    action,
    entityId: input.entityId,
    payload,
    utterance: input.utterance,
  });
  if (!validated.ok) {
    return {
      ok: false,
      reasonKo: validated.reasonKo,
      forbidden: validated.forbidden,
      executed: false,
    };
  }

  const now = new Date().toISOString();
  const summaryKo = summarizePreparePayload(action, payload);
  const titleKo =
    action === "reservation_prepare"
      ? "Reservation Prepare"
      : action === "flight_prepare"
        ? "Flight Prepare"
        : action === "purchase_candidate"
          ? "Purchase Candidate"
          : "Schedule Prepare";

  const prepare: PrepareObject = {
    prepareId: newPrepareId(input.entityId),
    entityId: input.entityId.trim(),
    action,
    payload,
    status: PREPARE_OBJECT_STATUS,
    lifecycle: "prepared",
    workspaceId: input.workspaceId?.trim() || null,
    titleKo,
    summaryKo,
    createdAtIso: now,
    updatedAtIso: now,
  };

  if (input.persist !== false) {
    savePrepareObject(prepare);
  }

  if (input.syncEntityLifecycle !== false) {
    const entity = getRealityEntity(prepare.entityId);
    if (entity) {
      updateRealityEntityState(prepare.entityId, {
        ...entity.state,
        lifecycle: "prepared",
        prepareId: prepare.prepareId,
        readyForCommit: true,
      });
    }
  }

  return {
    ok: true,
    prepare,
    summaryKo: [
      summaryKo,
      "예약 준비 완료",
      "status · ready_for_commit",
      "실행 없음 · Commit 전 대기",
      "[예약 검토]",
    ].join("\n"),
    executed: false,
    awaitingCommit: true,
  };
}

/**
 * Convenience: "이 호텔 예약 준비해" → Reservation Prepare.
 */
export function prepareHotelReservation(input: {
  readonly entityId: string;
  readonly hotelTitle: string;
  readonly utterance?: string;
  readonly workspaceId?: string | null;
  readonly priceLabelKo?: string | null;
  readonly guests?: number | null;
  readonly checkInIso?: string | null;
  readonly checkOutIso?: string | null;
  readonly options?: Readonly<Record<string, unknown>>;
}): PrepareResult {
  return runRealityPrepare({
    entityId: input.entityId,
    utterance: input.utterance ?? "이 호텔 예약 준비해",
    workspaceId: input.workspaceId,
    action: "reservation_prepare",
    titleHint: input.hotelTitle,
    priceLabelKo: input.priceLabelKo,
    guests: input.guests,
    options: {
      ...(input.options ?? {}),
      ...(input.checkInIso ? { checkInIso: input.checkInIso } : {}),
      ...(input.checkOutIso ? { checkOutIso: input.checkOutIso } : {}),
    },
  });
}
