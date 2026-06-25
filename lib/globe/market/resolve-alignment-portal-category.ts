import type { PortalCategoryId } from "@/lib/portal/portal-types";

/** v1 — market handshake chats map to Portal used_goods; extend when multi-domain ships. */
export function resolveAlignmentPortalCategoryId(): PortalCategoryId {
  return "used_goods";
}
