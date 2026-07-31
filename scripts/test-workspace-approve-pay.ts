/**
 * Workspace Approve · Pay stays in Execution Layer (no Field dashboard jump).
 * Smoke: module exports + copy keys for human Commit → Hub overlay path.
 */
import assert from "node:assert/strict";
import { copy } from "../lib/copy/human-ko";

assert.equal(typeof copy.globe.workspacePrepareOpenFieldCta, "string");
assert.match(copy.globe.workspacePrepareOpenFieldCta, /승인|결제/);
assert.equal(typeof copy.globe.workspacePrepareReadyForPay, "function");
assert.match(copy.globe.workspacePrepareReadyForPay("난바"), /준비|결제/);
assert.equal(typeof copy.globe.workspacePayNeedsPrepare, "string");
assert.equal(typeof copy.globe.workspacePayApproved, "function");
assert.match(copy.globe.workspacePreparePayFlowHint, /Workspace/);

console.log("ok: workspace approve-pay copy + Article 0 path labels");
