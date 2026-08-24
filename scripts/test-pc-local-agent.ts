/**
 * PC Local Agent — task state machine, tokens, capability router, versions
 */
import {
  canTransitionTaskStatus,
  assertTaskTransition,
  isTerminalTaskStatus,
} from "../lib/pc-local-agent/task-state-machine";
import {
  hashDeviceToken,
  generateDeviceToken,
  generatePairingCode,
} from "../lib/pc-local-agent/token";
import {
  CapabilityRouter,
  DEMO_CAPABILITY_ID,
  PDF_CAPABILITY_ID,
  resolveCapabilityGap,
  compareCapabilityVersions,
  isUpdateAvailable,
} from "../lib/pc-local-agent/capabilities";
import {
  extractPcPurchaseTitle,
  isPcPurchaseContinuityUtterance,
  resolvePcContinuityTarget,
} from "../lib/pc-local-agent/purchase-intent";

function selfTest(): void {
  assertTaskTransition("CREATED", "QUEUED");
  assertTaskTransition("QUEUED", "RUNNING");
  assertTaskTransition("RUNNING", "WAITING");
  assertTaskTransition("WAITING", "RUNNING");
  assertTaskTransition("RUNNING", "COMPLETED");

  if (canTransitionTaskStatus("COMPLETED", "RUNNING")) {
    throw new Error("terminal_should_not_transition");
  }
  if (!isTerminalTaskStatus("FAILED")) {
    throw new Error("failed_should_be_terminal");
  }

  const token = generateDeviceToken();
  const hash = hashDeviceToken(token);
  if (hash.length !== 64) {
    throw new Error("hash_length");
  }

  const code = generatePairingCode();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("pairing_code_format");
  }

  const gapBuiltin = resolveCapabilityGap([], ["browser.basic"]);
  if (!gapBuiltin.ready) {
    throw new Error("browser_basic_should_be_builtin");
  }

  const gapDemo = resolveCapabilityGap([], [DEMO_CAPABILITY_ID]);
  if (gapDemo.ready || gapDemo.missing.length !== 1) {
    throw new Error("demo_capability_should_be_missing");
  }

  const gapPdf = resolveCapabilityGap([], [PDF_CAPABILITY_ID]);
  if (gapPdf.ready) {
    throw new Error("pdf_capability_should_be_missing");
  }

  const router = new CapabilityRouter([DEMO_CAPABILITY_ID]);
  router.markInstalled(DEMO_CAPABILITY_ID);
  if (!router.check([DEMO_CAPABILITY_ID]).ready) {
    throw new Error("demo_should_be_ready_after_install");
  }

  if (compareCapabilityVersions("1.0.0", "1.1.0") >= 0) {
    throw new Error("version_compare");
  }
  if (!isUpdateAvailable("1.0.0", "1.1.0")) {
    throw new Error("update_available");
  }
  if (isUpdateAvailable("1.1.0", "1.1.0")) {
    throw new Error("same_version_no_update");
  }

  if (!isPcPurchaseContinuityUtterance("쿠팡에서 생수 사")) {
    throw new Error("purchase_should_match");
  }
  if (isPcPurchaseContinuityUtterance("오늘 일정 보여줘")) {
    throw new Error("calendar_should_not_match");
  }
  if (extractPcPurchaseTitle("생수 좀 사줘") !== "생수 구매") {
    throw new Error("purchase_title");
  }
  if (resolvePcContinuityTarget("휴지 주문해") !== "pc") {
    throw new Error("purchase_target_pc");
  }

  console.log("pc-local-agent self-test ok (phase D)");
}

selfTest();
