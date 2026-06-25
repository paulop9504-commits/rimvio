import type { ExternalQueryIntent } from "@/lib/external-context-ask/external-context-opportunity-types";

/** Discovery-scope intent — opportunity framing, not personal recall. */
export function classifyExternalQueryIntent(query: string): ExternalQueryIntent {
  const q = query.trim();
  if (!q) {
    return "general";
  }

  if (
    /팔|사고\s*싶|살래|거래|중고|맞춤|아이폰|갤럭시|맥북|노트북|자전거|카메라|가구/u.test(
      q,
    )
  ) {
    return "trade";
  }
  if (/여행|갈\s*사람|동행|트립|제주|부산|해외/u.test(q)) {
    return "travel";
  }
  if (/스터디|공부|영어|독서|회화/u.test(q)) {
    return "study";
  }
  if (/모임|번개|주말|같이|친구|운동|캠핑|등산|러닝/u.test(q)) {
    return "gathering";
  }
  return "general";
}
