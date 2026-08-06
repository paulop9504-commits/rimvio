/**
 * Globe AI Intent → Workspace route.
 * Live kinds open Continuum; catalog kinds return stub route (morphology only).
 * @see docs/adr/033-context-type-workspace-morphology.md
 */

import { classifyWorkspaceKind } from "@/lib/workspace-kind/classify-workspace-kind";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";

/** Catalog routes — skeleton only until recipes ship. */
export const CATALOG_WORKSPACE_ROUTES = [
  "finance",
  "document",
  "coding",
] as const;

export type CatalogWorkspaceRoute = (typeof CATALOG_WORKSPACE_ROUTES)[number];

export type WorkspaceRouteDecision =
  | {
      readonly ship: "live";
      readonly kind: WorkspaceKind;
    }
  | {
      readonly ship: "catalog";
      readonly route: CatalogWorkspaceRoute;
      readonly statusKo: string;
    }
  | {
      readonly ship: "none";
    };

const FINANCE_RE =
  /(?:주식|증권|코인|비트코인|삼성전자|ETF|포트폴리오|재무|자산\s*배분|차트|시세|매수|매도).*(?:분석|추천|사|팔|보여|준비)|(?:분석|추천|시세).*(?:주식|증권|코인|삼성)/iu;

const DOCUMENT_RE =
  /(?:계약서|기획서|제안서|명세서|서류|레쥬메|이력서|문서|NDA|합의서).*(?:만들|작성|써|초안|고쳐)|(?:만들|작성|써|초안).*(?:계약서|기획서|제안서|문서)/iu;

const CODING_RE =
  /(?:React|Next\.?js|TypeScript|TSX?|로그인\s*페이지|컴포넌트|API\s*라우트|코드|버그|리팩터).*(?:만들|짜|구현|고쳐|고쳐줘)|(?:만들|짜|구현|고쳐).*(?:로그인|페이지|컴포넌트|코드|API)/iu;

/**
 * Decide which Workspace Globe AI should open for this utterance.
 * Prefer live Continuum kinds; else catalog stub route.
 */
export function classifyWorkspaceRoute(
  utterance: string,
): WorkspaceRouteDecision {
  const text = utterance.trim();
  if (!text) return { ship: "none" };

  const live = classifyWorkspaceKind(text);
  if (live) {
    return { ship: "live", kind: live };
  }

  if (FINANCE_RE.test(text)) {
    return {
      ship: "catalog",
      route: "finance",
      statusKo: "금융 작업장을 준비하는 중이에요 · 곧 열려요",
    };
  }
  if (DOCUMENT_RE.test(text)) {
    return {
      ship: "catalog",
      route: "document",
      statusKo: "문서 작업장을 준비하는 중이에요 · 곧 열려요",
    };
  }
  if (CODING_RE.test(text)) {
    return {
      ship: "catalog",
      route: "coding",
      statusKo: "코딩 작업장을 준비하는 중이에요 · 곧 열려요",
    };
  }

  return { ship: "none" };
}
