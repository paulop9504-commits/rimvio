/**
 * Client auth circuit — stop 401 storms after session expiry.
 */

import assert from "node:assert/strict";
import {
  clearClientAuthCircuit,
  isClientAuthCircuitOpen,
  noteClientAuthFailure,
  resetClientAuthCircuitForTests,
} from "../lib/http/client-auth-circuit";

resetClientAuthCircuitForTests();
assert.equal(isClientAuthCircuitOpen(), false);

noteClientAuthFailure(60_000);
assert.equal(isClientAuthCircuitOpen(), true);

clearClientAuthCircuit();
assert.equal(isClientAuthCircuitOpen(), false);

noteClientAuthFailure(5_000);
assert.equal(isClientAuthCircuitOpen(Date.now() + 6_000), false);

resetClientAuthCircuitForTests();
console.log("ok — client-auth-circuit");
