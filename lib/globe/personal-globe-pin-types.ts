import type { GlobeContextVisibility } from "@/lib/globe/globe-context-visibility";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

/** Owner-local globe pin — experience entry on personal earth (not ROOM shared). */

export type PersonalGlobePinAcl = {
  /** peer-thread ids allowed to see this pin on owner's profile globe. */
  viewerPeerThreadIds: readonly string[];
};

export type PersonalGlobePinMarketRole = "listing" | "seeking";

export type PersonalGlobePinSource =
  | "experience"
  | "accommodation_search"
  | "context_condition_ai";

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
  /** Personal layer default — accommodation search pins stay private. */
  visibility?: GlobeContextVisibility;
  /** Projection origin — accommodation_search = Hub Rail pipeline. */
  source?: PersonalGlobePinSource;
  /** Context Condition AI batch — dismiss removes all pins in batch. */
  contextConditionBatchId?: string | null;
  /** Context Condition AI pin kind for map chrome. */
  contextConditionKind?: "lodging" | "eatery" | "activity" | "amenity" | null;
  /** Activity subtype when this search result is an activity child. */
  contextConditionActivitySubtype?: LocalDiscoveryActivitySubtype | null;
  /** Parent context when this pin is a search result child. */
  parentContextEventId?: string | null;
};

export type PersonalGlobePinViewer = {
  isOwner: boolean;
  viewerPeerThreadId?: string | null;
};
