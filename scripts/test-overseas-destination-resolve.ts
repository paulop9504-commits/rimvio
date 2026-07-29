/**
 * Overseas destination recognition — extract + sync resolve + Nominatim failover.
 * Run: npx tsx scripts/test-overseas-destination-resolve.ts
 */

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import {
  resolveTripContextAnchor,
  resolveTripContextAnchorAsync,
} from "@/lib/experience-run/resolve-trip-context-anchor";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { extractPatches } from "@/lib/context-patch/context-patch-engine";
import { parseContextAnchorMoveTarget } from "@/lib/globe-ingress/detect-context-anchor-move";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`❌ FAIL: ${msg}`);
}

async function main() {
  console.log("Overseas destination recognition\n");

  // ── Extract ──
  console.log("═══ 1. Extract labels ═══");
  const cases: Array<[string, string]> = [
    ["프라하로 이동", "프라하"],
    ["리옹으로 옮겨", "리옹"],
    ["바르셀로나 여행", "바르셀로나"],
    ["go to Lisbon", "리스본"],
    ["to Barcelona trip", "바르셀로나"],
    ["브뤼헤로 이동", "브뤼헤"],
    ["오사카로 이동", "오사카"],
  ];
  for (const [utterance, expected] of cases) {
    const got =
      extractTravelDestination(utterance) ??
      extractRunDestination(utterance) ??
      parseContextAnchorMoveTarget(utterance);
    assert(
      !!got && got.toLowerCase().includes(expected.toLowerCase().slice(0, 3)),
      `${utterance} → expected ~${expected}, got ${got}`,
    );
    console.log(`  ✓ ${utterance} → ${got}`);
  }

  // ── Sync registry (known cities) ──
  console.log("\n═══ 2. Sync registry resolve ═══");
  for (const city of ["프라하", "리옹", "바르셀로나", "리스본"]) {
    const a = resolveTripContextAnchor(city);
    assert(!!a, `${city} should resolve sync`);
    assert(Number.isFinite(a!.lat) && Number.isFinite(a!.lng), `${city} coords`);
    console.log(`  ✓ ${city} → ${a!.lat.toFixed(2)}, ${a!.lng.toFixed(2)} (${a!.resolveSource})`);
  }

  // ── Attached Korean (no space) ──
  console.log("\n═══ 3. Attached particle match ═══");
  const pragueStuck = classifyOverseasManualPlace("프라하로이동해줘");
  assert(!!pragueStuck, "프라하로이동해줘 should match registry");
  console.log(`  ✓ 프라하로이동해줘 → ${pragueStuck!.label}`);

  // ── Context patch ──
  console.log("\n═══ 4. Context patch location ═══");
  const patch = extractPatches("리옹으로 이동", { location: "오사카" });
  assert(patch.patches.some((p) => p.key === "location"), "location patch");
  const loc = patch.patches.find((p) => p.key === "location")!;
  assert(String(loc.newValue).includes("리옹"), `got ${loc.newValue}`);
  console.log(`  ✓ location: ${loc.previousValue} → ${loc.newValue}`);

  // ── Open-world Nominatim (unknown secondary city) ──
  console.log("\n═══ 5. Nominatim failover (may need network) ═══");
  const unknown = "브뤼헤";
  assert(resolveTripContextAnchor(unknown) == null, "브뤼헤 not in sync list");
  try {
    const open = await resolveTripContextAnchorAsync(unknown);
    if (open) {
      assert(Number.isFinite(open.lat), "nominatim lat");
      console.log(
        `  ✓ ${unknown} → ${open.placeLabel} ${open.lat.toFixed(2)}, ${open.lng.toFixed(2)} (${open.resolveSource})`,
      );
    } else {
      console.log("  ⚠ Nominatim unavailable offline — skip (extract still works)");
    }
  } catch (e) {
    console.log(`  ⚠ Nominatim error (ok offline): ${e instanceof Error ? e.message : e}`);
  }

  console.log("\n══════════════════════════════════════");
  console.log("✅ Overseas destination tests passed");
  console.log("══════════════════════════════════════");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
