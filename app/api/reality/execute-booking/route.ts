import { NextResponse, type NextRequest } from "next/server";
import { executeBookingOperationsServer } from "@/lib/booking-runtime/execute-booking-server";
import type { IdentityVaultBundle } from "@/lib/identity-vault/types";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import {
  queueKindToDomain,
  queueKindToOperationType,
} from "@/lib/reality-queue/operation-taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingOpWire = {
  operationId?: string;
  labelKo?: string;
  kind?: RealityOperationV1["kind"];
  sourceRef?: string | null;
  engineId?: string | null;
  preview?: {
    resourceId?: string | null;
    placeLabelKo?: string | null;
  };
};

function wireToOperation(row: BookingOpWire): RealityOperationV1 | null {
  const operationId = row.operationId?.trim();
  const labelKo = row.labelKo?.trim();
  const kind = row.kind ?? "eatery";
  if (!operationId || !labelKo) {
    return null;
  }
  return {
    operationId,
    type: queueKindToOperationType(kind),
    domain: queueKindToDomain(kind),
    status: "ready",
    contextEventId: null,
    contextLabelKo: null,
    labelKo,
    createdBy: "ai_assistant",
    preview: {
      titleKo: labelKo,
      summaryKo: labelKo,
      placeLabelKo: row.preview?.placeLabelKo ?? labelKo,
      resourceId: row.preview?.resourceId ?? null,
    },
    needApproval: true,
    dependsOnItemIds: [],
    dependencyNoteKo: null,
    undoAllowed: true,
    expiresAtIso: null,
    sourceRef: row.sourceRef ?? null,
    engineId: row.engineId ?? null,
    kind,
  };
}

function isIdentityVaultBundle(value: unknown): value is IdentityVaultBundle {
  return value != null && typeof value === "object";
}

/** Reality Commit booking — Maps Reserve handoff or LiteAPI prebook. */
export async function POST(request: NextRequest) {
  let body: {
    contextEventId?: string;
    approvedByHuman?: boolean;
    operations?: BookingOpWire[];
    identityBundle?: IdentityVaultBundle | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, reasonKo: "잘못된 요청이에요" },
      { status: 400 },
    );
  }

  const contextEventId = body.contextEventId?.trim() ?? "";
  if (!contextEventId || body.approvedByHuman !== true) {
    return NextResponse.json(
      { ok: false, reasonKo: "결재함 승인이 필요해요" },
      { status: 403 },
    );
  }

  const operations = (body.operations ?? [])
    .map(wireToOperation)
    .filter((op): op is RealityOperationV1 => Boolean(op));

  if (operations.length === 0) {
    return NextResponse.json(
      { ok: false, reasonKo: "반영할 예약이 없어요" },
      { status: 400 },
    );
  }

  const identityBundle = isIdentityVaultBundle(body.identityBundle)
    ? body.identityBundle
    : null;

  const result = await executeBookingOperationsServer({
    contextEventId,
    operations,
    approvedByHuman: true,
    identityBundle,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result);
}
