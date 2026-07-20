import type {
  RealityOperationDomain,
  RealityOperationType,
  RealityQueueItemKind,
} from "@/lib/reality-queue/types";

export function engineIdToQueueKind(
  engineId: string | null | undefined,
): RealityQueueItemKind {
  switch (engineId) {
    case "lodging_search":
      return "lodging";
    case "flight_booking":
      return "flight";
    case "eatery_search":
      return "eatery";
    case "transit_navigate":
      return "transit";
    case "finance_prep":
      return "finance";
    case "trip_experience_search":
      return "itinerary";
    case "rental_car":
    case "car_rental":
      return "rental";
    default:
      return "execution_step";
  }
}

export function queueKindToOperationType(
  kind: RealityQueueItemKind,
): RealityOperationType {
  switch (kind) {
    case "lodging":
    case "flight":
    case "rental":
      return "reservation";
    case "eatery":
      return "search_list";
    case "itinerary":
      return "itinerary";
    case "finance":
      return "payment_prep";
    case "trade":
      return "trade";
    case "transit":
      return "booking_prep";
    case "review":
      return "review_gate";
    default:
      return "other";
  }
}

export function queueKindToDomain(kind: RealityQueueItemKind): RealityOperationDomain {
  switch (kind) {
    case "lodging":
    case "flight":
    case "eatery":
    case "rental":
    case "itinerary":
    case "transit":
    case "execution_step":
    case "review":
      return "travel";
    case "finance":
      return "finance";
    case "trade":
      return "shopping";
    case "calendar":
      return "work";
    default:
      return "other";
  }
}

export function domainFolderLabelKo(domain: RealityOperationDomain): string {
  switch (domain) {
    case "travel":
      return "Travel";
    case "shopping":
      return "Shopping";
    case "finance":
      return "Finance";
    case "work":
      return "Work";
    default:
      return "Other";
  }
}

export function kindLabelKo(kind: RealityQueueItemKind): string {
  switch (kind) {
    case "lodging":
      return "숙소";
    case "flight":
      return "항공";
    case "eatery":
      return "맛집";
    case "rental":
      return "렌터카";
    case "itinerary":
      return "일정";
    case "finance":
      return "결제";
    case "transit":
      return "이동";
    case "trade":
      return "거래";
    case "review":
      return "검토";
    default:
      return "준비";
  }
}
