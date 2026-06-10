import assert from "node:assert/strict";
import { parseManualContextPlaceText } from "../lib/globe/parse-manual-context-place-text";
import { resolveManualContextPlaceCandidates } from "../lib/globe/resolve-manual-context-place-candidates";

async function main() {
  const sinlim = parseManualContextPlaceText("약속장소 신림동에서 만나자");
  assert.equal(sinlim.displayLabel, "신림동");
  assert.match(sinlim.searchQuery, /신림동/u);
  assert.match(sinlim.searchQuery, /서울/u);

  const gangnam = parseManualContextPlaceText("강남역 스타벅스에서 만나요");
  assert.match(gangnam.displayLabel, /강남역/u);

  const resolved = await resolveManualContextPlaceCandidates({
    place: "약속장소 신림동에서 만나자",
    title: "민수 약속",
  });

  assert.equal(resolved.parsed.displayLabel, "신림동");
  assert.ok(
    resolved.autoResolved || resolved.suggestions.length > 0,
    "expected auto resolve or geocode candidates",
  );
  if (resolved.autoResolved) {
    assert.ok(resolved.autoResolved.lat > 37 && resolved.autoResolved.lat < 38);
    assert.ok(resolved.autoResolved.lng > 126 && resolved.autoResolved.lng < 127);
  }

  console.log("test-parse-manual-context-place: ok");
}

void main();
