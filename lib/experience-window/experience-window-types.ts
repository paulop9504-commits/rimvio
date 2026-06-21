/** Time × thread anchor — one experience window for Globe · Talk · Bridge. */

export type ExperienceTripTiming = "future" | "present" | "past";

export type ExperiencePhase = "prep" | "live" | "recall" | "outside";

export type ExperienceWindow = {
  eventId: string;
  peerThreadId: string | null;
  windowStartIso: string | null;
  windowEndIso: string | null;
  bridgeCreatedAtIso: string | null;
  /** Trip vs now — not the same as phase (prep/live/recall). */
  tripTiming: ExperienceTripTiming;
};
