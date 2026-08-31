/**
 * Ambiguity — infer from context when possible; ask only when targets collide.
 */

export type AmbiguityResolution =
  | { readonly kind: "inferred"; readonly entityId: string; readonly reasonKo: string }
  | { readonly kind: "ask"; readonly options: readonly { readonly id: string; readonly labelKo: string }[]; readonly reasonKo: string }
  | { readonly kind: "clear" };

export function resolveAmbiguity(input: {
  readonly utterance: string;
  readonly surface?: string | null;
  readonly focusedEntityIds?: readonly string[];
}): AmbiguityResolution {
  const vague = /이거|그거|접수|처리해/i.test(input.utterance);
  if (!vague) return { kind: "clear" };

  const ids = input.focusedEntityIds ?? [];
  const merchant = /merchant|점주|주문/i.test(input.surface ?? "");

  if (ids.length === 1 && (merchant || vague)) {
    return {
      kind: "inferred",
      entityId: ids[0]!,
      reasonKo: "지금 보고 있는 대상을 이어서 처리합니다.",
    };
  }
  if (ids.length > 1) {
    return {
      kind: "ask",
      options: ids.map((id) => ({ id, labelKo: `주문 ${id}` })),
      reasonKo: "어느 주문을 말씀하시는지 선택해 주세요.",
    };
  }
  if (vague && ids.length === 0) {
    return {
      kind: "ask",
      options: [],
      reasonKo: "어떤 항목을 처리할지 알려 주세요.",
    };
  }
  return { kind: "clear" };
}
