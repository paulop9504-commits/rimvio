import {
  combineLensDateAndTime,
  parseLensDateFromText,
} from "@/lib/peer-chat/ai-lens/parse-lens-date";
import { parseLensTimeFromText } from "@/lib/peer-chat/ai-lens/parse-lens-time";
import type { MarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import {
  isMeetTimeAllowedForTrade,
  isScheduleDateCandidateAllowed,
  resolveMarketTradeScheduleDateCandidates,
} from "@/lib/globe/market/market-trade-schedule";

const EXPLICIT_PERIOD_RE = /(?:오전|오후|am|pm)/iu;
const COLON_TIME_RE = /\d{1,2}:\d{2}/u;

export type ParsedProposalMeetTimeKo = {
  dateKey: string;
  timeHm: string | null;
  highConfidenceTime: boolean;
};

export type ProposalMeetTimeSeed = {
  preferredMeetDateKey: string;
  preferredMeetAtIso: string | null;
};

function hasHighConfidenceTimePhrase(text: string): boolean {
  return EXPLICIT_PERIOD_RE.test(text) || COLON_TIME_RE.test(text);
}

/** Parse agent proposal meetTimeKo — date required; time only when explicit. */
export function parseProposalMeetTimeKo(
  meetTimeKo: string,
  now = new Date(),
): ParsedProposalMeetTimeKo | null {
  const trimmed = meetTimeKo.trim();
  if (!trimmed) {
    return null;
  }

  const parsedDate = parseLensDateFromText(trimmed, now);
  if (!parsedDate) {
    return null;
  }

  const timeHm = parseLensTimeFromText(trimmed);
  const highConfidenceTime =
    timeHm !== null && hasHighConfidenceTimePhrase(trimmed);

  return {
    dateKey: parsedDate.dateKey,
    timeHm,
    highConfidenceTime,
  };
}

/** High-confidence seed from agreed proposal — skips when date not in schedule SSOT. */
export function buildProposalMeetTimeSeed(input: {
  meetTimeKo: string;
  scheduleCandidates: readonly string[];
  availabilityPreset?: MarketAvailabilityPreset;
  now?: Date;
}): ProposalMeetTimeSeed | null {
  const now = input.now ?? new Date();
  const parsed = parseProposalMeetTimeKo(input.meetTimeKo, now);
  if (!parsed) {
    return null;
  }

  const candidates = resolveMarketTradeScheduleDateCandidates(
    input.scheduleCandidates,
    input.availabilityPreset,
    now,
  );
  if (
    candidates.length > 0 &&
    !isScheduleDateCandidateAllowed(parsed.dateKey, candidates)
  ) {
    return null;
  }

  let preferredMeetAtIso: string | null = null;
  if (parsed.highConfidenceTime && parsed.timeHm) {
    const iso = combineLensDateAndTime(parsed.dateKey, parsed.timeHm, now);
    if (
      isMeetTimeAllowedForTrade({
        meetAtIso: iso,
        dateKey: parsed.dateKey,
        preset: input.availabilityPreset,
        now,
      })
    ) {
      preferredMeetAtIso = iso;
    }
  }

  return {
    preferredMeetDateKey: parsed.dateKey,
    preferredMeetAtIso,
  };
}

/** Patch handshake schedule hints from dual-approved proposal — never overwrites existing. */
export function buildHandshakeMeetTimePatchFromProposal(input: {
  handshake: Pick<
    MarketHandshakeRecord,
    "preferredMeetDateKey" | "preferredMeetAtIso" | "scheduleCandidates"
  >;
  meetTimeKo?: string | null;
  availabilityPreset?: MarketAvailabilityPreset;
  now?: Date;
}): Partial<
  Pick<MarketHandshakeRecord, "preferredMeetDateKey" | "preferredMeetAtIso">
> {
  if (
    input.handshake.preferredMeetDateKey?.trim() ||
    input.handshake.preferredMeetAtIso?.trim()
  ) {
    return {};
  }

  const meetTimeKo = input.meetTimeKo?.trim();
  if (!meetTimeKo) {
    return {};
  }

  const seed = buildProposalMeetTimeSeed({
    meetTimeKo,
    scheduleCandidates: input.handshake.scheduleCandidates,
    availabilityPreset: input.availabilityPreset,
    now: input.now,
  });
  if (!seed) {
    return {};
  }

  const patch: Partial<
    Pick<MarketHandshakeRecord, "preferredMeetDateKey" | "preferredMeetAtIso">
  > = {
    preferredMeetDateKey: seed.preferredMeetDateKey,
  };
  if (seed.preferredMeetAtIso) {
    patch.preferredMeetAtIso = seed.preferredMeetAtIso;
  }
  return patch;
}
