/**
 * Platform Operator brief — structured Agent panel (not generic chatbot).
 */

import type {
  DevProjectIssue,
  DevProjectSnapshot,
} from "@/lib/hub/dev/dev-project-state";

export type PlatformOperatorPhase =
  | "awaiting_source"
  | "analyzed"
  | "fixing"
  | "agent_ready"
  | "published";

export type PlatformOperatorBrief = {
  readonly phase: PlatformOperatorPhase;
  readonly headline: string;
  readonly bullets: readonly string[];
  readonly issues: readonly DevProjectIssue[];
  readonly primaryAction: "connect" | "fix_all" | "publish" | "none";
  readonly primaryLabel: string;
};

export function buildPlatformOperatorBrief(
  snapshot: DevProjectSnapshot,
  opts?: { readonly fixing?: boolean },
): PlatformOperatorBrief {
  if (snapshot.capabilityCount === 0) {
    return {
      phase: "awaiting_source",
      headline: "Platform Builder",
      bullets: ["URL · GitHub · OpenAPI · 파일을 ADE에 연결하세요."],
      issues: [],
      primaryAction: "connect",
      primaryLabel: "Connect source",
    };
  }

  if (opts?.fixing) {
    return {
      phase: "fixing",
      headline: "Fixing…",
      bullets: [
        "API response 분석",
        "schema 생성",
        "adapter 수정",
        "test 실행",
      ],
      issues: snapshot.issues,
      primaryAction: "none",
      primaryLabel: "Working",
    };
  }

  if (snapshot.status.published) {
    return {
      phase: "published",
      headline: "Published",
      bullets: [
        `${snapshot.capabilityCount} capabilities · Index 등록됨`,
        "Rimvio Agent가 사용자에게 노출 가능",
      ],
      issues: [],
      primaryAction: "none",
      primaryLabel: "Live",
    };
  }

  if (snapshot.status.agentReady && snapshot.issuesCount === 0) {
    return {
      phase: "agent_ready",
      headline: "Platform is Agent Ready",
      bullets: [
        `✓ ${snapshot.capabilityCount} capabilities found`,
        `✓ ${snapshot.capabilityCount} schemas generated`,
        "✓ Runtime connected",
      ],
      issues: [],
      primaryAction: "publish",
      primaryLabel: "Publish",
    };
  }

  return {
    phase: "analyzed",
    headline: "Analyzed your platform",
    bullets: [
      `✓ ${snapshot.capabilityCount} capabilities found`,
      `✓ ${snapshot.capabilityCount} schemas generated`,
      "✓ Runtime connected",
      snapshot.issuesCount ? `⚠ ${snapshot.issuesCount} issues` : "✓ No issues",
    ],
    issues: snapshot.issues.slice(0, 4),
    primaryAction: snapshot.issuesCount ? "fix_all" : "publish",
    primaryLabel: snapshot.issuesCount ? "Fix all" : "Publish",
  };
}
