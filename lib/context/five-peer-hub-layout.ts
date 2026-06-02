import type { HubRoomSlot, PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import { purgePendingLabel } from "@/lib/context/pinned-peer-roster";

/** Evenly spaced around center — top slot first (12 o'clock). */
export const FIVE_PEER_HUB_ANGLES_DEG = [270, 342, 54, 126, 198] as const;

export const FIVE_PEER_HUB_LINE_COLORS = [
  "#34D399",
  "#FBBF24",
  "#60A5FA",
  "#A78BFA",
  "#F472B6",
] as const;

export const FIVE_PEER_HUB_RADIUS_PCT = 38;

export type FivePeerHubNode =
  | {
      kind: "vacant";
      slotIndex: PinnedSlotIndex;
      angleDeg: number;
      roomLabel: string;
    }
  | { kind: "connected"; slot: HubRoomSlot; angleDeg: number }
  | {
      kind: "purge_pending";
      slot: HubRoomSlot;
      angleDeg: number;
      purgeLabel: string;
    };

export function hubPolarPercent(angleDeg: number): { leftPct: number; topPct: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const r = FIVE_PEER_HUB_RADIUS_PCT;
  return {
    leftPct: 50 + r * Math.cos(rad),
    topPct: 50 + r * Math.sin(rad),
  };
}

export function buildFivePeerHubNodes(
  slots: readonly HubRoomSlot[]
): FivePeerHubNode[] {
  return FIVE_PEER_HUB_ANGLES_DEG.map((angleDeg, i) => {
    const slotIndex = i as PinnedSlotIndex;
    const slot = slots.find((s) => s.slotIndex === slotIndex);
    if (!slot || slot.connection === "vacant") {
      return {
        kind: "vacant",
        slotIndex,
        angleDeg,
        roomLabel: `ROOM ${slotIndex + 1}`,
      };
    }
    if (slot.connection === "purge_pending") {
      return {
        kind: "purge_pending",
        slot,
        angleDeg,
        purgeLabel: purgePendingLabel(slot) ?? "삭제 예정",
      };
    }
    return { kind: "connected", slot, angleDeg };
  });
}
