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
  generateDesktopNonce,
} from "../lib/pc-local-agent/token";
import { parsePcAgentPermissions, permissionsWithAppVersion } from "../lib/pc-local-agent/pc-permissions";
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
  extractPcPurchaseQuery,
  resolvePcPurchaseOpenUrl,
  isPcAgentCheckoutUrl,
} from "../lib/pc-local-agent/purchase-intent";
import {
  isPcAgentDemoAllowlistedUrl,
  isPcAgentNavigableUrl,
} from "../lib/pc-local-agent/url-safety";
import { pickBestValueCandidate } from "../apps/local-agent/src/execution/shop-pick.ts";
import { resolvePcRemoteCommand } from "../lib/pc-local-agent/remote-command";

function selfTest(): void {
  assertTaskTransition("CREATED", "QUEUED");
  assertTaskTransition("QUEUED", "RUNNING");
  assertTaskTransition("RUNNING", "WAITING");
  assertTaskTransition("WAITING", "RUNNING");
  assertTaskTransition("WAITING", "QUEUED");
  assertTaskTransition("RUNNING", "CANCELLED");

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

  const nonce = generateDesktopNonce();
  if (nonce.length < 16) {
    throw new Error("desktop_nonce");
  }

  const perms = parsePcAgentPermissions({ browser: false });
  if (perms.browser !== false || perms.webWork !== true) {
    throw new Error("pc_permissions_default");
  }
  const withVer = permissionsWithAppVersion({ browser: false }, "0.1.6");
  if (withVer.appVersion !== "0.1.6" || withVer.browser !== false) {
    throw new Error("permissions_app_version");
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
  if (extractPcPurchaseQuery("쿠팡에서 생수 사") !== "생수") {
    throw new Error("purchase_query");
  }
  const openUrl = resolvePcPurchaseOpenUrl("쿠팡에서 생수 사");
  if (!openUrl.includes("coupang.com") || !openUrl.includes("%EC%83%9D%EC%88%98")) {
    throw new Error("purchase_open_url");
  }
  if (!isPcPurchaseContinuityUtterance("물티슈 사줘")) {
    throw new Error("generic_buy_should_match");
  }
  if (extractPcPurchaseQuery("물티슈 좀 사줘") !== "물티슈") {
    throw new Error("generic_purchase_query");
  }
  if (extractPcPurchaseQuery("물 좀 사줘") !== "생수") {
    throw new Error("water_purchase_query");
  }
  const cartUrl = "https://www.coupang.com/np/cart";
  if (isPcAgentCheckoutUrl(cartUrl)) {
    throw new Error("cart_should_allow");
  }
  if (!isPcAgentCheckoutUrl("https://www.coupang.com/vp/checkout")) {
    throw new Error("checkout_should_block");
  }
  if (isPcAgentCheckoutUrl(openUrl)) {
    throw new Error("search_should_allow");
  }
  if (!isPcAgentDemoAllowlistedUrl("https://example.com")) {
    throw new Error("example_allowlist");
  }
  if (!isPcAgentNavigableUrl("https://example.com/")) {
    throw new Error("example_navigable");
  }

  const pick = pickBestValueCandidate([
    { href: "/cheap-low", price: 1000, rating: 2.1, reviewCount: 3, rocket: false },
    { href: "/best", price: 3900, rating: 4.7, reviewCount: 220, rocket: true },
    { href: "/mid", price: 2500, rating: 4.1, reviewCount: 40, rocket: false },
  ]);
  if (pick?.href !== "/mid") {
    throw new Error("pick_cheapest_among_quality");
  }

  const yt = resolvePcRemoteCommand("유튜브에서 비 오는 소리 틀어줘");
  if (yt.kind !== "open_url" || !yt.url.includes("youtube.com")) {
    throw new Error("remote_youtube");
  }
  const buy = resolvePcRemoteCommand("쿠팡에서 생수 사");
  if (buy.kind !== "purchase") {
    throw new Error("remote_purchase");
  }
  const link = resolvePcRemoteCommand("https://www.example.com/ok 열어");
  if (link.kind !== "open_url" || !link.url.startsWith("https://www.example.com")) {
    throw new Error("remote_url");
  }
  const search = resolvePcRemoteCommand("서울 날씨");
  if (search.kind !== "open_url" || !search.url.includes("google.com/search")) {
    throw new Error("remote_google");
  }

  console.log("pc-local-agent self-test ok (phase D)");
}

selfTest();
