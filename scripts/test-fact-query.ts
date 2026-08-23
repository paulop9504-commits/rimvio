/**
 * Fact Query — transit · hotspots · weather · distance · GTFS · Seoul.
 * Run: npx tsx scripts/test-fact-query.ts
 */

import assert from "node:assert/strict";
import {
  classifyFactQuery,
  clearFactProjectionForTests,
  publishFactProjection,
  readFactProjection,
  resolveFactQuery,
  runDistanceLookupTool,
  runPoiHotspotsTool,
  runScheduleFeasibilityTool,
  runTransitLastTrainTool,
  runTransitMaxInterchangeTool,
  runTransitRouteLookupTool,
  runMidpointMeetingTool,
  runTransitRealtimeTool,
  runTransitCrowdingTool,
} from "../lib/fact-query";

clearFactProjectionForTests();

{
  assert.equal(
    classifyFactQuery("도쿄 지하철 13개 노선 중 환승 최다 역").kind,
    "transit_max_interchange",
  );
  assert.equal(classifyFactQuery("오사카 지하철 환승 최다 역").kind, "transit_max_interchange");
  assert.equal(classifyFactQuery("서울 지하철 환승 최다 역").kind, "transit_max_interchange");
  assert.equal(classifyFactQuery("도쿄에서 가장 핫한 곳").kind, "poi_hotspots");
  assert.equal(classifyFactQuery("오사카에서 가장 핫한 곳").kind, "poi_hotspots");
  assert.equal(classifyFactQuery("서울에서 가장 핫한 곳").kind, "poi_hotspots");
  assert.equal(classifyFactQuery("도쿄 내일 비 와?").kind, "weather_lookup");
  assert.equal(
    classifyFactQuery("시부야에서 아사쿠사까지 거리").kind,
    "distance_lookup",
  );
  assert.equal(
    classifyFactQuery("난바에서 USJ 18시 출발 가능?").kind,
    "schedule_feasibility",
  );
  assert.equal(
    classifyFactQuery("강남에서 홍대입구까지 지하철로").kind,
    "transit_route_lookup",
  );
  assert.equal(
    classifyFactQuery("서울 2호선 막차 몇 시야?").kind,
    "transit_last_train",
  );
  assert.equal(
    classifyFactQuery("강남과 홍대 중간 만남").kind,
    "midpoint_meeting",
  );
  assert.equal(
    classifyFactQuery("강남역 2호선 실시간 도착").kind,
    "transit_realtime_lookup",
  );
  assert.equal(
    classifyFactQuery("강남역 혼잡도").kind,
    "transit_crowding_lookup",
  );
}

{
  const tokyo = runTransitMaxInterchangeTool({ cityId: "tokyo" });
  assert.ok(tokyo);
  assert.match(tokyo!.headlineKo, /오테마치/);

  const osaka = runTransitMaxInterchangeTool({ cityId: "osaka" });
  assert.ok(osaka);
  assert.match(osaka!.headlineKo, /난바|혼마치|텐노지/);

  const seoul = runTransitMaxInterchangeTool({ cityId: "seoul" });
  assert.ok(seoul);
  assert.match(seoul!.headlineKo, /사당|고속터미널|종로3가|을지로3가/);
}

{
  const tokyoHot = runPoiHotspotsTool({ cityId: "tokyo", limit: 3 });
  assert.ok(tokyoHot);
  assert.match(tokyoHot!.headlineKo, /시부야/);

  const osakaHot = runPoiHotspotsTool({ cityId: "osaka", limit: 3 });
  assert.ok(osakaHot);
  assert.match(osakaHot!.headlineKo, /도톤보리/);

  const seoulHot = runPoiHotspotsTool({ cityId: "seoul", limit: 3 });
  assert.ok(seoulHot);
  assert.match(seoulHot!.headlineKo, /홍대/);
}

{
  const dist = runDistanceLookupTool("시부야에서 아사쿠사까지 거리");
  assert.ok(dist);
  assert.equal(dist!.kind, "distance_lookup");
  assert.equal(dist!.evidence.length, 2);
  assert.ok(dist!.headlineKo.includes("km"));
}

{
  const ok = runScheduleFeasibilityTool("난바에서 USJ 갈 수 있어?");
  assert.ok(ok);
  assert.equal(ok!.kind, "schedule_feasibility");
  assert.equal(ok!.evidence.length, 2);
  assert.match(ok!.headlineKo, /일정/);

  const blocked = runScheduleFeasibilityTool("난바에서 USJ 18시 출발 가능?");
  assert.ok(blocked);
  assert.match(blocked!.headlineKo, /불가|주의/);
}

{
  const route = runTransitRouteLookupTool({
    utterance: "강남에서 홍대입구까지 지하철로",
    cityId: "seoul",
  });
  assert.ok(route);
  assert.equal(route!.kind, "transit_route_lookup");
  assert.match(route!.headlineKo, /18분|18/);
  assert.match(route!.sourceKo, /GTFS feed/);

  const last = runTransitLastTrainTool({
    utterance: "서울 2호선 막차",
    cityId: "seoul",
  });
  assert.ok(last);
  assert.equal(last!.kind, "transit_last_train");
  assert.match(last!.headlineKo, /2호선|00:30|24:30/);
}

{
  const midpoint = runMidpointMeetingTool("강남과 홍대 중간 만남");
  assert.ok(midpoint);
  assert.equal(midpoint!.kind, "midpoint_meeting");
  assert.equal(midpoint!.evidence.length, 3);
}

{
  const rt = runTransitRealtimeTool({
    utterance: "강남역 2호선 실시간 도착",
    cityId: "seoul",
  });
  assert.ok(rt);
  assert.equal(rt!.kind, "transit_realtime_lookup");
  assert.match(rt!.headlineKo, /강남|3분|분 후/);
  assert.match(rt!.sourceKo, /GTFS-RT/);

  const crowd = runTransitCrowdingTool({
    utterance: "강남역 혼잡도",
    cityId: "seoul",
  });
  assert.ok(crowd);
  assert.equal(crowd!.kind, "transit_crowding_lookup");
  assert.match(crowd!.headlineKo, /매우 혼잡|혼잡/);
}

{
  const answer = resolveFactQuery(
    "오사카 지하철 노선중에 가장 노선이 많이 교차하는지점",
  );
  assert.ok(answer);
  assert.equal(answer!.kind, "transit_max_interchange");
  assert.equal(answer!.cityLabelKo, "오사카");
}

{
  publishFactProjection(runPoiHotspotsTool({ cityId: "seoul" })!);
  assert.equal(readFactProjection()?.wire.cityLabelKo, "서울");
}

clearFactProjectionForTests();

console.log("OK — fact-query");
