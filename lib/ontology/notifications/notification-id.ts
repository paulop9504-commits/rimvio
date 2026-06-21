export function bridgeInviteNotificationId(eventId: string): string {
  return `bridge_invite:${eventId.trim()}`;
}

export function locationConfirmNotificationId(eventId: string): string {
  return `location:${eventId.trim()}`;
}

export function parseLocationEventIdFromNotificationId(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed.startsWith("location:")) {
    return null;
  }
  const eventId = trimmed.slice("location:".length).trim();
  return eventId || null;
}
