import assert from "node:assert/strict";

import {
  detectAppLocaleFromBrowser,
  detectLocaleFromLanguageTags,
} from "../lib/i18n/detect-locale";
import { suggestRegionFromAppLocale } from "../lib/i18n/suggest-region-from-locale";

assert.equal(detectLocaleFromLanguageTags("ko-KR"), "ko");
assert.equal(detectLocaleFromLanguageTags("en-US"), "en");
assert.equal(detectLocaleFromLanguageTags("ja-JP"), "ja");

assert.equal(suggestRegionFromAppLocale("ko"), "KR");
assert.equal(suggestRegionFromAppLocale("ja"), "JP");
assert.equal(suggestRegionFromAppLocale("en"), "US");

if (typeof navigator !== "undefined") {
  const detected = detectAppLocaleFromBrowser();
  assert.ok(["ko", "en", "ja", "zh", "th"].includes(detected) || detected.length >= 2);
}

console.log("test-locale-welcome-setup: ok");
