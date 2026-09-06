import type { Harness } from "@/lib/rimvio-protocol/harness/schema";

/** Minimal executable-shaped sample (Coupang search) — Phase 1 fixture only. */
export function buildSampleShoppingSearchHarness(now = "2026-09-06T06:00:00.000Z"): Harness {
  return {
    id: "shopping.search.coupang",
    name: "쇼핑몰 상품 검색",
    description: "키워드로 상품을 검색하고 이름·가격을 추출한다.",
    version: "0.1.0",
    status: "draft",
    type: "web_automation",
    runtime: {
      type: "BROWSER",
      environment: "sandbox",
      browser: { headless: true, locale: "ko-KR" },
      permissions: ["browser.read", "browser.write"],
    },
    inputSchema: {
      fields: [
        { name: "keyword", type: "string", required: true, description: "검색어" },
        { name: "sorting", type: "string", required: false },
      ],
    },
    outputSchema: {
      fields: [
        { name: "products", type: "array", required: true },
      ],
    },
    nodes: [
      {
        id: "n_trigger",
        type: "TRIGGER",
        name: "요청 수신",
        description: "사용자 검색 요청",
        next: ["n_research"],
        actions: [],
        permissions: [],
        constraints: [],
        verification: [],
      },
      {
        id: "n_research",
        type: "RESEARCH",
        name: "검색",
        description: "쿠팡 검색 수행",
        next: ["n_extract"],
        actions: [
          {
            id: "a_get",
            type: "GET",
            target: { url: "https://www.coupang.com" },
          },
          {
            id: "a_click_search",
            type: "CLICK",
            target: { selector: "#headerSearchKeyword" },
          },
          {
            id: "a_type",
            type: "TYPE",
            target: { selector: "#headerSearchKeyword" },
            input: "{{keyword}}",
            variable: "keyword",
          },
          {
            id: "a_submit",
            type: "CLICK",
            target: { selector: ".headerSearchBtn" },
          },
          {
            id: "a_wait",
            type: "WAIT",
            waitFor: { type: "ELEMENT_EXISTS", selector: ".search-product" },
            timeout: 15000,
          },
        ],
        permissions: [
          { type: "READ", scope: "web", resource: "coupang.com", approvalRequired: false },
          { type: "WRITE", scope: "web.form", resource: "coupang.com", approvalRequired: false },
        ],
        constraints: [],
        verification: [
          {
            id: "v_results",
            type: "ELEMENT_EXISTS",
            target: { selector: ".search-product" },
            severity: "blocker",
          },
        ],
      },
      {
        id: "n_extract",
        type: "EXTRACT",
        name: "상품 추출",
        next: ["n_verify"],
        actions: [
          {
            id: "a_extract",
            type: "EXTRACT",
            fields: [
              { name: "name", selector: ".name", type: "string" },
              { name: "price", selector: ".price-value", type: "number" },
              { name: "link", selector: "a", type: "url" },
            ],
          },
        ],
        permissions: [],
        constraints: [
          { field: "price", operator: "lte", value: 1_000_000, action: "block" },
        ],
        verification: [],
      },
      {
        id: "n_verify",
        type: "VERIFY",
        name: "결과 검증",
        actions: [],
        permissions: [],
        constraints: [],
        verification: [
          {
            id: "v_count",
            type: "COUNT",
            condition: "products.length >= 1",
            expected: 1,
            severity: "error",
          },
        ],
      },
    ],
    permissions: [
      { type: "READ", scope: "web", resource: "coupang.com", approvalRequired: false },
      { type: "EXTERNAL_ACTION", scope: "browser", approvalRequired: false },
    ],
    constraints: [],
    verification: [],
    metadata: {
      industry: "e-commerce",
      complexity: "medium",
      estimatedDurationMs: 300_000,
      estimatedCostUsd: 0.12,
      targetHost: "www.coupang.com",
      tags: ["shopping", "search"],
    },
    createdAt: now,
    updatedAt: now,
  };
}
