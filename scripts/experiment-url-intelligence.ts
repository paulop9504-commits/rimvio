#!/usr/bin/env npx tsx
/**
 * Zero-cost URL intelligence checks (no network).
 * Usage: npm run experiment:url
 */

import assert from "node:assert/strict";
import {
  commercePrimaryLabel,
  formatYouTubeTimestamp,
  isCommerceDomain,
  parseMapTitleFromUrl,
  parseTitleFromUrl,
  parseYouTubeStartSeconds,
} from "../lib/enrichers/url-intelligence";
import {
  buildCommerceAppHref,
  detectTransportKind,
  isTransportUrl,
  transportPrimaryLabel,
} from "../lib/resolvers/transport-commerce-deep-links";

const cases = [
  {
    name: "Naver Map search title",
    fn: () =>
      parseMapTitleFromUrl(
        "https://map.naver.com/p/search/%EA%B0%95%EB%A6%89%20%EC%84%B8%EC%9D%B8%ED%8A%B8%EC%A1%B4%EC%A6%88"
      ),
    expect: "강릉 세인트존즈",
  },
  {
    name: "Google Maps place title",
    fn: () =>
      parseMapTitleFromUrl(
        "https://www.google.com/maps/place/Gangnam+Station/@37.497,127.027"
      ),
    expect: "Gangnam Station",
  },
  {
    name: "YouTube t=90s",
    fn: () =>
      parseYouTubeStartSeconds(
        "https://www.youtube.com/watch?v=abc123&t=90s"
      ),
    expect: 90,
  },
  {
    name: "YouTube t=1m30s",
    fn: () =>
      parseYouTubeStartSeconds("https://youtu.be/abc123?t=1m30s"),
    expect: 90,
  },
  {
    name: "format timestamp",
    fn: () => formatYouTubeTimestamp(90),
    expect: "1:30",
  },
  {
    name: "Coupang commerce domain",
    fn: () => isCommerceDomain("www.coupang.com"),
    expect: true,
  },
  {
    name: "Coupang primary label",
    fn: () => commercePrimaryLabel("coupang.com"),
    expect: "🛒 쿠팡에서 보기",
  },
  {
    name: "yo-go primary label",
    fn: () => commercePrimaryLabel("yo-go.co.kr"),
    expect: "🛒 타임딜 열기",
  },
  {
    name: "Generic slug title",
    fn: () =>
      parseTitleFromUrl("https://example.com/blog/my-cool-article-name"),
    expect: "my cool article name",
  },
  {
    name: "Coupang app deep link",
    fn: () =>
      buildCommerceAppHref(
        "https://www.coupang.com/vp/products/123456",
        "coupang.com"
      ),
    expect: "coupang://product?productId=123456",
  },
  {
    name: "Yanolja transport URL",
    fn: () => isTransportUrl("https://www.yanolja.com/global/places/123"),
    expect: true,
  },
  {
    name: "Yanolja transport kind",
    fn: () => detectTransportKind("https://www.yanolja.com/", "yanolja.com"),
    expect: "stay",
  },
  {
    name: "Korail transport kind",
    fn: () =>
      detectTransportKind("https://www.letskorail.com/", "letskorail.com"),
    expect: "train",
  },
  {
    name: "Transport stay label",
    fn: () => transportPrimaryLabel("stay"),
    expect: "🏨 숙소 보기",
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = testCase.fn();
  try {
    assert.equal(result, testCase.expect);
    console.log(`✓ ${testCase.name}`);
    passed += 1;
  } catch {
    console.error(`✗ ${testCase.name}`);
    console.error(`  expected: ${testCase.expect}`);
    console.error(`  got:      ${result}`);
    process.exitCode = 1;
  }
}

console.log(`\n${passed}/${cases.length} passed`);
