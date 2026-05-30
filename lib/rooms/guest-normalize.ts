/** Pure guest normalization — testable without localStorage. */
import {
  getAvatarAccent,
  isGlangoAvatarVariant,
  type GlangoAvatarVariantId,
} from "@/lib/brand/glango-avatar-colors";

export const PENDING_AVATAR_ACCENT = "#A1A1AA";

export type RoomGuestRecord = {
  id: string;
  label: string;
  avatarVariant: GlangoAvatarVariantId | null;
  avatarDrawn: boolean;
  color: string;
};

export type LegacyRoomGuestRecord = {
  id?: string;
  label?: string;
  color?: string;
  emoji?: string;
  avatarVariant?: string | null;
  avatarDrawn?: boolean;
};

export function buildDrawnGuestRecord(input: {
  id: string;
  label: string;
  avatarVariant: GlangoAvatarVariantId;
}): RoomGuestRecord {
  return {
    id: input.id,
    label: input.label,
    avatarVariant: input.avatarVariant,
    avatarDrawn: true,
    color: getAvatarAccent(input.avatarVariant),
  };
}

export function buildPendingGuestRecord(input: {
  id: string;
  label: string;
}): RoomGuestRecord {
  return {
    id: input.id,
    label: input.label,
    avatarVariant: null,
    avatarDrawn: false,
    color: PENDING_AVATAR_ACCENT,
  };
}

export function normalizeGuestRecord(
  raw: LegacyRoomGuestRecord,
  fallback: RoomGuestRecord
): RoomGuestRecord {
  const id = raw.id?.trim() || fallback.id;
  const label = raw.label?.trim() || fallback.label;

  if (raw.avatarDrawn === false) {
    return buildPendingGuestRecord({ id, label });
  }

  if (raw.avatarVariant && isGlangoAvatarVariant(raw.avatarVariant)) {
    return buildDrawnGuestRecord({
      id,
      label,
      avatarVariant: raw.avatarVariant,
    });
  }

  if (raw.id?.trim() && raw.label?.trim()) {
    return buildPendingGuestRecord({ id, label });
  }

  return fallback;
}

export function guestNeedsAvatarDraw(guest: RoomGuestRecord) {
  return !guest.avatarDrawn;
}
