import assert from "node:assert/strict";
import { resolveHubPgMode } from "../lib/globe/hub-checkout/pg/resolve-hub-pg-mode";

const originalStripe = process.env.STRIPE_SECRET_KEY;
const originalStripePub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const originalToss = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

delete process.env.STRIPE_SECRET_KEY;
delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

assert.equal(resolveHubPgMode("in_app_card"), "mock");
assert.equal(resolveHubPgMode("tosspay"), "mock");
assert.equal(resolveHubPgMode("kakaopay"), "mock");

process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
assert.equal(resolveHubPgMode("in_app_card"), "stripe_payment_intent");

process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = "test_ck";
assert.equal(resolveHubPgMode("tosspay"), "toss_widget");

if (originalStripe) {
  process.env.STRIPE_SECRET_KEY = originalStripe;
} else {
  delete process.env.STRIPE_SECRET_KEY;
}
if (originalStripePub) {
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalStripePub;
} else {
  delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
if (originalToss) {
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = originalToss;
} else {
  delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
}

console.log("test-hub-pg-mode: ok");
