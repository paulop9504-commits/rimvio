import type { ExperienceBridgeParticipant } from "@/lib/experience-bridge/experience-bridge-types";

export function isActiveBridgeParticipant(
  row: ExperienceBridgeParticipant,
): boolean {
  return row.status === "accepted" || row.role === "host";
}

export function canReadBridgeExperience(input: {
  viewerUserId: string;
  participants: readonly ExperienceBridgeParticipant[];
  /** Bridge row host — covers missing participant rows after bootstrap. */
  hostUserId?: string | null;
}): boolean {
  const viewer = input.viewerUserId.trim();
  if (!viewer) {
    return false;
  }
  if (input.hostUserId?.trim() === viewer) {
    return true;
  }
  const row = input.participants.find((participant) => participant.userId === viewer);
  if (!row) {
    return false;
  }
  return row.role === "host" || row.status === "accepted";
}

export function canEditBridgeMedia(input: {
  viewerUserId: string;
  ownerUserId: string;
}): boolean {
  return input.viewerUserId.trim() === input.ownerUserId.trim();
}

export function canExportBridgeMedia(input: {
  viewerUserId: string;
  ownerUserId: string;
}): boolean {
  return canEditBridgeMedia(input);
}

export function countActiveBridgeParticipants(
  participants: readonly ExperienceBridgeParticipant[],
): number {
  return participants.filter(isActiveBridgeParticipant).length;
}
