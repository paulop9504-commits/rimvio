/**
 * Dual-role Experience App — same Order, permission + projection differ.
 */

import assert from "node:assert/strict";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { invokeExperienceResource } from "@/lib/hub/dev/experience-os";
import { planHubAgentTurnRegex } from "@/lib/hub/dev/hub-agent-planner";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { wantsExperienceOsCreate } from "@/lib/hub/dev/experience-os";
import {
  DEFAULT_ACTORS,
  createExperienceOrder,
  parseExperienceAppUtterance,
  projectOrderHeadline,
  projectOrderSubline,
  resetExperienceOrders,
  wantsExperienceAppUse,
} from "@/lib/experience-app";

async function main() {
  resetExperienceOrders();
  const draft = createDefaultPlatformDraft();
  const consumer = DEFAULT_ACTORS.consumer;
  const merchant = DEFAULT_ACTORS.merchant;

  const mine = createExperienceOrder({
    storeId: "store_42",
    storeName: "BHC 역삼점",
    consumerId: consumer.userId,
    lines: [{ name: "뿌링클", qty: 1, priceKrw: 23000 }],
  });
  const other = createExperienceOrder({
    storeId: "store_42",
    storeName: "BHC 역삼점",
    consumerId: "user_88",
    lines: [{ name: "맛초킹", qty: 1, priceKrw: 22000 }],
  });

  const consumerList = await invokeExperienceResource("order.list", {}, { draft, actor: consumer });
  const consumerOrders = (consumerList.data as { orders: Array<{ id: string }> }).orders;
  assert.ok(consumerOrders.some((o) => o.id === mine.id));
  assert.ok(!consumerOrders.some((o) => o.id === other.id));

  const merchantList = await invokeExperienceResource("order.list", {}, { draft, actor: merchant });
  const merchantOrders = (merchantList.data as { orders: Array<{ id: string }> }).orders;
  assert.ok(merchantOrders.some((o) => o.id === mine.id));
  assert.ok(merchantOrders.some((o) => o.id === other.id));

  const consumerCancelOther = await invokeExperienceResource(
    "order.cancel",
    { id: other.id },
    { draft, actor: consumer },
  );
  assert.equal(consumerCancelOther.ok, false);

  const consumerCancelMine = await invokeExperienceResource(
    "order.cancel",
    { id: mine.id },
    { draft, actor: consumer },
  );
  assert.equal(consumerCancelMine.ok, true);

  const merchantAdvance = await invokeExperienceResource(
    "order.advance",
    { id: other.id },
    { draft, actor: merchant },
  );
  assert.equal(merchantAdvance.ok, true);

  const consumerAdvance = await invokeExperienceResource(
    "order.advance",
    { id: other.id },
    { draft, actor: consumer },
  );
  assert.equal(consumerAdvance.ok, false);

  const stats = await invokeExperienceResource("order.stats", {}, { draft, actor: merchant });
  assert.equal(stats.ok, true);
  const consumerStats = await invokeExperienceResource("order.stats", {}, { draft, actor: consumer });
  assert.equal(consumerStats.ok, false);

  const merchantStatus = await invokeExperienceResource(
    "order.status",
    { id: other.id },
    { draft, actor: merchant },
  );
  assert.equal(merchantStatus.ok, true);
  assert.ok(((merchantStatus.data as { metadata: unknown[] }).metadata ?? []).length > 0);

  const consumerStatusOther = await invokeExperienceResource(
    "order.status",
    { id: other.id },
    { draft, actor: consumer },
  );
  assert.equal(consumerStatusOther.ok, false);

  const consumerStatusMine = await invokeExperienceResource(
    "order.status",
    { id: mine.id },
    { draft, actor: consumer },
  );
  assert.equal(consumerStatusMine.ok, true);
  assert.deepEqual((consumerStatusMine.data as { metadata: unknown[] }).metadata, []);

  assert.equal(projectOrderHeadline("consumer", other), "주문을 받았어요.");
  assert.match(projectOrderHeadline("merchant", other), /주문 #/);
  assert.match(projectOrderSubline("merchant", { ...other, status: "preparing" }), /조리중/);

  assert.equal(parseExperienceAppUtterance("치킨 주문해줘")?.op, "order.searchStores");
  assert.equal(parseExperienceAppUtterance("근처에 치킨집 찾아줘")?.op, "order.searchStores");
  assert.equal(parseExperienceAppUtterance("지금 주문 어디까지 왔어?")?.op, "order.status");
  assert.equal(parseExperienceAppUtterance("오늘 주문 몇 개 들어왔어?")?.roleHint, "merchant");
  assert.equal(parseExperienceAppUtterance("내 주문 취소해줘")?.roleHint, "consumer");
  assert.equal(wantsExperienceAppUse("오사카 호텔 찾아줘"), false);
  assert.equal(wantsExperienceAppUse("치킨 주문해줘"), true);
  assert.equal(wantsExperienceOsCreate("오사카 호텔 찾아줘"), false);
  assert.equal(wantsExperienceOsCreate("배달 플랫폼 만들어줘"), true);

  const snapshot = buildProjectSnapshot({ draft });
  const inspect = {
    platformName: draft.name,
    capabilities: draft.actions.map((a) => a.name),
    files: [] as const,
    issues: snapshot.issues,
    commerce: draft.commerceNotes,
    connections: {},
    sources: snapshot.sources,
    capabilityCount: draft.actions.length,
  };
  const steps = planHubAgentTurnRegex("오늘 주문 몇 개 들어왔어?", inspect as never, false);
  assert.ok(steps.some((s) => s.toolId === "resource.apply"));

  console.log("test-experience-app-roles: ok");
}

void main();
