/**
 * NL → Harness Agent (Phase 5) — structured generation, not chat essay.
 * Produces a real Harness Action Specification from a natural-language brief.
 */

import type { Harness } from "@/lib/rimvio-protocol/harness/schema";
import {
  appendLabellingAction,
  createSandboxLabellingDraft,
  setExtractFields,
  setLabellingVerifications,
  updateLabellingOverview,
  type HarnessSandboxSurface,
} from "@/lib/harness/labelling";
import { validateHarness } from "@/lib/harness/validate";

export type HarnessNlGenerateInput = {
  readonly utterance: string;
  readonly surface?: HarnessSandboxSurface;
  readonly now?: string;
};

export type HarnessNlGenerateResult = {
  readonly ok: boolean;
  readonly harness: Harness | null;
  readonly objective: string;
  readonly inferredHost: string | null;
  readonly budgetKrw: number | null;
  readonly messages: readonly string[];
  readonly issues: readonly string[];
};

const HOST_ALIASES: Record<string, string> = {
  쿠팡: "www.coupang.com",
  coupang: "www.coupang.com",
  네이버: "shopping.naver.com",
  naver: "shopping.naver.com",
  아마존: "www.amazon.com",
  amazon: "www.amazon.com",
  옥션: "www.auction.co.kr",
  지마켓: "www.gmarket.co.kr",
  gmarket: "www.gmarket.co.kr",
};

function inferHost(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [key, host] of Object.entries(HOST_ALIASES)) {
    if (text.includes(key) || lower.includes(key.toLowerCase())) {
      return host;
    }
  }
  const url = text.match(/https?:\/\/[^\s]+/i);
  if (url) {
    try {
      return new URL(url[0]).host;
    } catch {
      return null;
    }
  }
  return null;
}

function inferBudgetKrw(text: string): number | null {
  const man = text.match(/(\d+)\s*만\s*원?/);
  if (man) return Number(man[1]) * 10_000;
  const won = text.match(/(\d{4,})\s*원/);
  if (won) return Number(won[1]);
  return null;
}

function inferKeyword(text: string, host: string | null): string {
  let t = text;
  for (const key of Object.keys(HOST_ALIASES)) {
    t = t.replace(new RegExp(key, "gi"), " ");
  }
  t = t
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\d+\s*만\s*원?/g, " ")
    .replace(/\d+\s*원/g, " ")
    .replace(
      /검색|비교|추출|수집|찾아|해줘|해서|에서|으로|가격|상품|정보|가성비|이하|이하만|추려|만들어|하니스|harness|web|local|브라우저/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  if (t.length >= 2) return t.slice(0, 80);
  if (host?.includes("coupang")) return "노트북";
  return "product";
}

function inferName(text: string, host: string | null): string {
  const site = host?.replace(/^www\./, "") ?? "web";
  if (/검색/.test(text)) return `${site} 상품 검색`;
  if (/비교/.test(text)) return `${site} 상품 비교`;
  return `${site} Harness`;
}

export function generateHarnessFromUtterance(
  input: HarnessNlGenerateInput,
): HarnessNlGenerateResult {
  const utterance = input.utterance.trim();
  const messages: string[] = [];
  const issues: string[] = [];

  if (utterance.length < 4) {
    return {
      ok: false,
      harness: null,
      objective: "",
      inferredHost: null,
      budgetKrw: null,
      messages: ["요청이 너무 짧습니다."],
      issues: ["utterance_too_short"],
    };
  }

  const surface: HarnessSandboxSurface =
    input.surface ?? (/로컬|local|pc|데스크탑|desktop/i.test(utterance) ? "local" : "web");
  const host = inferHost(utterance) ?? (surface === "web" ? "www.example.com" : "App");
  const budget = inferBudgetKrw(utterance);
  const keyword = inferKeyword(utterance, host);
  const name = inferName(utterance, host);
  const now = input.now ?? new Date().toISOString();

  messages.push(`Surface: ${surface}`);
  messages.push(`Host: ${host}`);
  messages.push(`Keyword: ${keyword}`);
  if (budget != null) messages.push(`Budget: ${budget.toLocaleString("ko-KR")} KRW`);

  let harness = createSandboxLabellingDraft({
    name,
    surface,
    now,
  });
  harness = updateLabellingOverview(harness, {
    name,
    description: utterance,
    targetHost: host,
    keywordField: true,
  });

  const startUrl = host.startsWith("http") ? host : `https://${host}`;
  harness = appendLabellingAction(harness, {
    type: "NAVIGATE",
    target: { url: startUrl },
  });

  if (surface === "web") {
    harness = appendLabellingAction(harness, {
      type: "TYPE",
      target: { selector: "input[type='search'], input[name='q'], #headerSearchKeyword, input[type='text']" },
      input: "{{keyword}}",
      variable: "keyword",
    });
    harness = appendLabellingAction(harness, {
      type: "CLICK",
      target: { selector: "button[type='submit'], .headerSearchBtn, button[aria-label*='search' i]" },
    });
    harness = appendLabellingAction(harness, {
      type: "WAIT",
      waitFor: { type: "TIMEOUT", ms: 1500 },
      timeout: 1500,
    });
    harness = setExtractFields(harness, [
      { name: "name", selector: "a, .name, h1, h2", type: "string" },
      { name: "price", selector: ".price, .price-value, [class*='price']", type: "number" },
    ]);
    harness = setLabellingVerifications(harness, [
      {
        id: "v_page",
        type: "ELEMENT_EXISTS",
        target: { selector: "body" },
        severity: "blocker",
      },
    ]);
  } else {
    harness = appendLabellingAction(harness, {
      type: "OBSERVE",
      target: { description: `Open or focus local target: ${host}` },
    });
    messages.push("Local Harness: PC Agent는 우선 OPEN_URL(시작 URL)로 디스패치합니다.");
  }

  if (budget != null) {
    harness = {
      ...harness,
      constraints: [
        ...harness.constraints.filter((c) => c.field !== "price"),
        { field: "price", operator: "lte", value: budget, action: "block" },
      ],
    };
  }

  if (/결제|구매|checkout|pay/i.test(utterance)) {
    harness = {
      ...harness,
      permissions: [
        ...harness.permissions,
        { type: "FINANCIAL", scope: "checkout", approvalRequired: true },
      ],
    };
    messages.push("FINANCIAL permission added (approval required).");
  }

  const checked = validateHarness(harness);
  if (!checked.ok) {
    return {
      ok: false,
      harness: null,
      objective: utterance,
      inferredHost: host,
      budgetKrw: budget,
      messages,
      issues: checked.issues.map((i) => `${i.path}: ${i.message}`),
    };
  }

  return {
    ok: true,
    harness: checked.harness,
    objective: utterance,
    inferredHost: host,
    budgetKrw: budget,
    messages: [...messages, "Harness graph generated."],
    issues: [],
  };
}
