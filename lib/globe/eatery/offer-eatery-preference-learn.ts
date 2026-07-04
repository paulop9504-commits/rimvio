import { offerPersonaPendingLearn } from "@/lib/persona/persona-pending-learn-store";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";

function inferAxis(row: ContextEateryInventoryRow) {
  const blob = [
    row.specialReasonKo,
    row.categoryLabel,
    row.cuisineHint,
    row.providerLabel,
  ]
    .filter(Boolean)
    .join(" ");
  return /로컬|현지|숨겨|골목/u.test(blob)
    ? ("travel.local_vs_landmark" as const)
    : ("generic.preference" as const);
}

/** After a user opens directions, ask whether this kind of eatery fits them. */
export function offerEateryPreferenceLearn(input: {
  eventId: string;
  row: ContextEateryInventoryRow;
}): void {
  const axisId = inferAxis(input.row);
  const learnId = `eatery-pref:${input.eventId}:${input.row.placeId}`;
  const titleKo =
    axisId === "travel.local_vs_landmark"
      ? `${input.row.name} 같은 로컬한 곳, 다음에도 더 찾아볼까요?`
      : `${input.row.name} 같은 느낌, 다음에도 반영할까요?`;

  offerPersonaPendingLearn({
    id: learnId,
    axisId,
    titleKo,
    kind: "learn",
    eventId: input.eventId,
    autoExpand: true,
    choices:
      axisId === "travel.local_vs_landmark"
        ? [
            { id: "local", labelKo: "로컬한 곳 더", value: "local" },
            { id: "landmark", labelKo: "검증된 인기", value: "landmark" },
            { id: "balanced", labelKo: "둘 다 괜찮아", value: "balanced" },
          ]
        : [
            { id: "again", labelKo: "이런 느낌 좋아", value: "again" },
            { id: "less", labelKo: "조금 덜 비슷하게", value: "less" },
          ],
  });
}
