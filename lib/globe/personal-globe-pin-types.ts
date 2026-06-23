/** Owner-local globe pin — experience entry on personal earth (not ROOM shared). */

export type PersonalGlobePinAcl = {
  /** peer-thread ids allowed to see this pin on owner's profile globe. */
  viewerPeerThreadIds: readonly string[];
};

export type PersonalGlobePinMarketRole = "listing" | "seeking";

export type PersonalGlobePin = {
  pinId: string;
  eventId: string;
  lat: number;
  lng: number;
  placeLabel: string;
  experienceTitle: string;
  photoCount: number;
  videoCount: number;
  createdAtIso: string;
  acl: PersonalGlobePinAcl;
  /** @중고 intent — grey market pin (seeking=구매, listing=내놓기). */
  marketRole?: PersonalGlobePinMarketRole | null;
};

export type PersonalGlobePinViewer = {
  isOwner: boolean;
  viewerPeerThreadId?: string | null;
};
