/** Parse ISO / date-only action target — shared by feed, calendar, action-chat. */
export function parseActionTargetDatetime(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) {
    return null;
  }

  const parsed = new Date(iso.includes("T") ? iso : `${iso}T09:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
