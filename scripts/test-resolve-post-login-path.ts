#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolvePostLoginPathAfterAuth } from "../lib/onboarding/resolve-post-login-path";

assert.equal(
  resolvePostLoginPathAfterAuth({
    requestedNext: "/feed",
    needsProfileSetup: false,
  }),
  "/peers",
);

assert.equal(
  resolvePostLoginPathAfterAuth({
    requestedNext: "/feed",
    needsProfileSetup: true,
  }),
  "/onboarding",
);

assert.equal(
  resolvePostLoginPathAfterAuth({
    requestedNext: "/peers/archive",
    needsProfileSetup: false,
  }),
  "/peers/archive",
);

console.log("test-resolve-post-login-path: ok");
