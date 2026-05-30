import {
  isGlangoAvatarVariant,
  type GlangoAvatarVariantId,
} from "@/lib/brand/glango-avatar-colors";

export function isE2eMode() {
  return process.env.NEXT_PUBLIC_E2E === "1";
}

/** Deterministic draw color — dev server or explicit E2E builds only. */
export function resolveE2eAvatarVariant(
  param: string | null
): GlangoAvatarVariantId | null {
  if (!param || !isGlangoAvatarVariant(param)) {
    return null;
  }

  if (process.env.NODE_ENV === "development" || isE2eMode()) {
    return param;
  }

  return null;
}
