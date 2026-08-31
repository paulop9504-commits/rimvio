import assert from "node:assert/strict";
import { compilePlatformRirToManifest } from "../lib/platform-builder/compile-rir";
import { planFromUtterance } from "../lib/platform-builder/plan-from-utterance";
import { validateRimvioPlatformManifest } from "../lib/platform-sdk/manifest";
import { isPlatformRir } from "../lib/platform-builder/rir";

const planned = planFromUtterance("동네 중고거래 플랫폼 만들고 싶어");
assert.equal(planned.type, "blueprint");
if (planned.type !== "blueprint") throw new Error("expected blueprint");

const manifest = compilePlatformRirToManifest(planned.rir);
const validation = validateRimvioPlatformManifest(manifest);
assert.equal(validation.valid, true);
assert.equal(manifest.package.id, "platform.used-market");
assert.ok(manifest.capabilities.some((c) => c.id === "market.create_listing"));
assert.ok(manifest.markets.deployments.some((d) => d.country === "KR"));

const patched = planFromUtterance("상품 등록할 때 사진을 최대 10장까지 올릴 수 있게 해줘", {
  existingRir: planned.rir,
});
assert.equal(patched.type, "patch");
if (patched.type === "patch" && isPlatformRir(patched.rir)) {
  assert.ok(patched.rir.objects.some((o) => o.fields.includes("images_max_10")));
}

console.log("platform-builder: ok");
