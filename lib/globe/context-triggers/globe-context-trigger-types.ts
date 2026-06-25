export type GlobeContextTriggerMediaPreview = {
  id: string;
  imageUrl: string | null;
  mediaContextId: string | null;
  allowLocalBlob?: boolean;
  kind: "photo" | "video";
};

export type GlobeContextTriggerKind =
  | "time_recall"
  | "travel_recall"
  | "person_recall"
  | "place_recall"
  | "trade_match"
  | "pulse_place";

export type GlobeContextTrigger = {
  id: string;
  kind: GlobeContextTriggerKind;
  eventId: string | null;
  title: string;
  body: string;
  emoji: string;
  ctaLabel: string;
  focused?: boolean;
  /** For person_recall — collect media across meetings. */
  personKey?: string | null;
  mediaPreviews?: readonly GlobeContextTriggerMediaPreview[];
};
