export type PinOpenInitialPage = "media" | "context";

/** Pin / map — moments (photo·video) first; context is the second tab. */
export function resolvePinOpenInitialPage(_input: {
  eventId: string;
  viewerUserId?: string | null;
  fromMapMediaTap?: boolean;
}): PinOpenInitialPage {
  return "media";
}
