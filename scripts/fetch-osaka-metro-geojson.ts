/**
 * Dev helper — probe Overpass for Osaka subway relations (OSM ODbL).
 * Does NOT overwrite public/geo/osaka_metro.geojson (checked-in SSOT).
 *
 * Usage: npx tsx scripts/fetch-osaka-metro-geojson.ts
 */

import type { OsakaMetroLineId } from "@/lib/geo/osaka-metro/line-catalog";

const OSM_NAME_TO_LINE: ReadonlyArray<{
  readonly match: RegExp;
  readonly lineId: OsakaMetroLineId;
}> = [
  { match: /御堂筋|Midosuji|Midōsuji/i, lineId: "midosuji" },
  { match: /谷町|Tanimachi/i, lineId: "tanimachi" },
  { match: /四つ橋|Yotsubashi/i, lineId: "yotsubashi" },
  { match: /中央|Chuo|Chūō/i, lineId: "chuo" },
  { match: /千日前|Sennichimae/i, lineId: "sennichimae" },
  { match: /堺筋|Sakaisuji/i, lineId: "sakaisuji" },
  { match: /長堀|Nagahori|Tsurumi/i, lineId: "nagahori" },
  { match: /今里|Imazato/i, lineId: "imazatosuji" },
  { match: /南港|Nanko|Port Town|New Tram/i, lineId: "nanko" },
];

const QUERY = `
[out:json][timeout:90];
area["name"="大阪市"]->.a;
(
  relation["route"="subway"](area.a);
  relation["route"="light_rail"]["name"~"ニュートラム|南港"](area.a);
);
out tags;
`.trim();

async function main(): Promise<void> {
  console.log("Fetching Overpass (Osaka subway tags)…");
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!res.ok) {
    throw new Error(`Overpass HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    elements?: Array<{
      type: string;
      id: number;
      tags?: Record<string, string>;
    }>;
  };

  let matched = 0;
  for (const el of json.elements ?? []) {
    if (el.type !== "relation") continue;
    const name = el.tags?.name ?? el.tags?.["name:en"] ?? "";
    const hit = OSM_NAME_TO_LINE.find((m) => m.match.test(name));
    if (!hit) continue;
    matched += 1;
    console.log(`  ${hit.lineId} ← ${name} (relation ${el.id})`);
  }
  console.log(`matched ${matched} relations`);
  console.log(
    "Workspace runtime SSOT: public/geo/osaka_metro.geojson (manual refresh)",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
