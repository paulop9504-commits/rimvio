import type {
  ExecutionInboxCheckV1,
  ExecutionInboxStage,
  ExecutionInboxV1,
  RealityQueueItemV1,
} from "@/lib/reality-queue/types";

function isChecked(item: RealityQueueItemV1 | undefined): boolean {
  if (!item) {
    return false;
  }
  return item.status === "ready" || item.status === "pending";
}

function pickByKind(
  items: readonly RealityQueueItemV1[],
  kind: RealityQueueItemV1["kind"],
): RealityQueueItemV1 | undefined {
  return items.find((item) => item.kind === kind);
}

function pickByLabel(
  items: readonly RealityQueueItemV1[],
  re: RegExp,
): RealityQueueItemV1 | undefined {
  return items.find((item) => re.test(item.labelKo) || re.test(item.preview.titleKo));
}

/**
 * Build Execution Inbox (결재함) checklist from prepared Operations.
 * Maps travel prep pack → CEO Sign gate rows.
 */
export function buildExecutionInbox(input: {
  items: readonly RealityQueueItemV1[];
  projectLabelKo?: string | null;
  canCommit: boolean;
  stage?: ExecutionInboxStage;
}): ExecutionInboxV1 | null {
  const travelish = input.items.filter(
    (item) =>
      item.domain === "travel" ||
      item.domain === "finance" ||
      item.kind === "review" ||
      item.kind === "flight" ||
      item.kind === "lodging" ||
      item.kind === "eatery" ||
      item.kind === "rental" ||
      item.kind === "finance",
  );
  if (travelish.length === 0) {
    return null;
  }

  const flight =
    pickByKind(travelish, "flight") ??
    pickByLabel(travelish, /항공|대한항공|flight/iu);
  const lodging =
    pickByKind(travelish, "lodging") ??
    pickByLabel(travelish, /호텔|숙소|hotel/iu);
  const rental =
    pickByKind(travelish, "rental") ??
    pickByLabel(travelish, /렌터|렌트|rental/iu);
  const eatery =
    pickByKind(travelish, "eatery") ??
    pickByLabel(travelish, /맛집|식당|eatery/iu);
  const finance =
    pickByKind(travelish, "finance") ??
    pickByLabel(travelish, /결제|금액|payment/iu);
  const cancel =
    pickByKind(travelish, "review") &&
    pickByLabel(travelish, /취소/u)
      ? pickByLabel(travelish, /취소/u)
      : pickByLabel(travelish, /취소\s*정책/u);
  const conflict = pickByLabel(travelish, /일정\s*충돌|충돌\s*없/u);
  const aiReview = pickByLabel(travelish, /AI\s*검토|검토\s*완료/u);

  const checks: ExecutionInboxCheckV1[] = [
    {
      id: "flight",
      labelKo: flight?.labelKo ?? "항공권 예약 준비",
      checked: isChecked(flight),
      kind: "flight",
      operationId: flight?.operationId ?? null,
    },
    {
      id: "lodging",
      labelKo: lodging?.labelKo ?? "호텔 예약 준비",
      checked: isChecked(lodging),
      kind: "lodging",
      operationId: lodging?.operationId ?? null,
    },
    {
      id: "rental",
      labelKo: rental?.labelKo ?? "렌터카 예약 준비",
      checked: isChecked(rental),
      kind: "rental",
      operationId: rental?.operationId ?? null,
    },
    {
      id: "eatery",
      labelKo: eatery?.labelKo ?? "맛집 예약 준비",
      checked: isChecked(eatery),
      kind: "eatery",
      operationId: eatery?.operationId ?? null,
    },
    {
      id: "total_payment",
      labelKo: finance
        ? `총 결제금액${finance.amountLabel ? ` · ${finance.amountLabel}` : ""}`
        : "총 결제금액",
      checked: isChecked(finance),
      kind: "finance",
      operationId: finance?.operationId ?? null,
    },
    {
      id: "cancel_policy",
      labelKo: cancel?.labelKo ?? "취소 정책",
      checked: isChecked(cancel) || Boolean(lodging?.preview.cancelPolicyKo),
      kind: "review",
      operationId: cancel?.operationId ?? lodging?.operationId ?? null,
    },
    {
      id: "schedule_ok",
      labelKo: conflict?.labelKo ?? "일정 충돌 없음",
      checked: isChecked(conflict) || (Boolean(flight) && Boolean(lodging)),
      kind: "meta",
      operationId: conflict?.operationId ?? null,
    },
    {
      id: "ai_review",
      labelKo: aiReview?.labelKo ?? "AI 검토 완료",
      checked:
        isChecked(aiReview) ||
        travelish.filter((item) => item.kind !== "review").every((item) => isChecked(item)),
      kind: "review",
      operationId: aiReview?.operationId ?? null,
    },
  ];

  const allChecked = checks.every((row) => row.checked);
  const readyForSign = allChecked && (input.canCommit || travelish.every(isChecked));

  return {
    version: 1,
    eyebrowKo: "Execution Inbox",
    titleKo: "결재함",
    projectLabelKo: input.projectLabelKo?.trim() || travelish[0]?.contextLabelKo || null,
    checks,
    readyForSign,
    stage: input.stage ?? (readyForSign ? "inbox_ready" : "prep_complete"),
  };
}
