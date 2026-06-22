import type { User } from "@supabase/supabase-js";

/** L1 honorific — 성용님 / 당신 (no bare user id in UI). */
export function formatRimvioHonorific(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === "당신") {
    return "당신";
  }
  return trimmed.endsWith("님") ? trimmed : `${trimmed}님`;
}

export function resolveRimvioHonorific(user: User | null | undefined): string {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.display_name === "string" && meta.display_name) ||
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    null;
  if (fromMeta?.trim()) {
    return formatRimvioHonorific(fromMeta.trim());
  }
  const emailLocal = user?.email?.split("@")[0]?.trim();
  if (emailLocal) {
    return formatRimvioHonorific(emailLocal);
  }
  return "당신";
}
