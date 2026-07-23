#!/usr/bin/env npx tsx
/**
 * Guest-first auth — no start wall; Commit/payment APIs keep login_required.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isAuthRequired } from "../lib/auth/policy";

delete process.env.NEXT_PUBLIC_AUTH_REQUIRED;
delete process.env.AUTH_REQUIRED;
assert.equal(isAuthRequired(), false);

const authGate = readFileSync(
  join(process.cwd(), "components/auth-gate.tsx"),
  "utf8",
);
assert.ok(!authGate.includes("LoginScreen"), "AuthGate must not full-screen LoginScreen");
assert.ok(authGate.includes("Guest-first"), "AuthGate documents guest-first");

const prebook = readFileSync(
  join(process.cwd(), "app/api/hub/checkout/liteapi/prebook/route.ts"),
  "utf8",
);
assert.ok(prebook.includes("login_required"));

const book = readFileSync(
  join(process.cwd(), "app/api/hub/checkout/liteapi/book/route.ts"),
  "utf8",
);
assert.ok(book.includes("login_required"));

const enforce = readFileSync(
  join(process.cwd(), "lib/auth/middleware-enforce.ts"),
  "utf8",
);
assert.ok(enforce.includes("never blanket"));
assert.ok(!/authRequiredJson\(401/.test(enforce));

console.log("test-guest-first-auth: ok");
