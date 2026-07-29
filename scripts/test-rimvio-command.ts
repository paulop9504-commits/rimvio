#!/usr/bin/env npx tsx
/**
 * RIMVIO Command — Create | Continue | Execute router (ADR-035).
 */

import assert from "node:assert/strict";
import { routeRimvioCommandMode } from "../lib/rimvio-command";
import { resolveRimvioCommandPlaceholder } from "../lib/rimvio-command";

{
  const r = routeRimvioCommandMode({
    utterance: "오사카 여행 가고 싶어",
    activeContextId: null,
  });
  assert.equal(r.mode, "create");
}

{
  const r = routeRimvioCommandMode({
    utterance: "이 맥락 제주도로 옮겨줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "continue");
  assert.equal(r.reason, "context_command");
}

{
  const r = routeRimvioCommandMode({
    utterance: "이어줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "continue");
}

{
  const r = routeRimvioCommandMode({
    utterance: "오사카 여행 짜줘",
    activeContextId: "evt-dunsan",
  });
  assert.equal(r.mode, "create");
}

{
  const r = routeRimvioCommandMode({
    utterance: "이 호텔 예약해줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "execute");
}

{
  const r = routeRimvioCommandMode({
    utterance: "바다 보이는 숙소 찾아줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "continue");
  assert.equal(r.reason, "active_domain_scout");
}

assert.match(resolveRimvioCommandPlaceholder("globe"), /만들/);
assert.match(resolveRimvioCommandPlaceholder("context"), /할까/);
assert.match(resolveRimvioCommandPlaceholder("workspace"), /무엇/);

console.log("ok — rimvio-command");
