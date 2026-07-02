import assert from "node:assert/strict";
import {
  buildHandshakeMeetTimePatchFromProposal,
  buildProposalMeetTimeSeed,
  parseProposalMeetTimeKo,
} from "@/lib/globe/market/parse-proposal-meet-time-ko";
import { toMarketTradeDateKey } from "@/lib/globe/market/market-trade-schedule";

const now = new Date("2026-07-03T10:00:00+09:00");

const saturday = parseProposalMeetTimeKo("토요일 오후 3시", now);
assert.ok(saturday);
assert.equal(saturday!.highConfidenceTime, true);
assert.equal(saturday!.timeHm, "15:00");

const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowKey = toMarketTradeDateKey(tomorrow);

const tomorrowParsed = parseProposalMeetTimeKo("내일 오후 3:30", now);
assert.ok(tomorrowParsed);
assert.equal(tomorrowParsed!.dateKey, tomorrowKey);
assert.equal(tomorrowParsed!.highConfidenceTime, true);

const bareHour = parseProposalMeetTimeKo("토요일 3시", now);
assert.ok(bareHour);
assert.equal(bareHour!.highConfidenceTime, false);

const seed = buildProposalMeetTimeSeed({
  meetTimeKo: "토요일 오후 3시",
  scheduleCandidates: [],
  now,
});
assert.ok(seed);
assert.ok(seed!.preferredMeetAtIso);
assert.match(seed!.preferredMeetAtIso!, /T06:00:00/u);

const patch = buildHandshakeMeetTimePatchFromProposal({
  handshake: {
    preferredMeetDateKey: null,
    preferredMeetAtIso: null,
    scheduleCandidates: [],
  },
  meetTimeKo: "토요일 오후 3시",
  now,
});
assert.equal(patch.preferredMeetDateKey, saturday!.dateKey);
assert.ok(patch.preferredMeetAtIso);

const noOverwrite = buildHandshakeMeetTimePatchFromProposal({
  handshake: {
    preferredMeetDateKey: "2026-07-10",
    preferredMeetAtIso: null,
    scheduleCandidates: [],
  },
  meetTimeKo: "토요일 오후 3시",
  now,
});
assert.deepEqual(noOverwrite, {});

const dateOnly = buildHandshakeMeetTimePatchFromProposal({
  handshake: {
    preferredMeetDateKey: null,
    preferredMeetAtIso: null,
    scheduleCandidates: [],
  },
  meetTimeKo: "토요일 오후",
  now,
});
assert.ok(dateOnly.preferredMeetDateKey);
assert.equal(dateOnly.preferredMeetAtIso, undefined);

console.log("test-agent-coordination-approval-seed: ok");
