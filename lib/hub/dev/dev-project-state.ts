/**
 * Dev project state — Files · Issues · Changes · Activity derived from Platform draft.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  resolveCapabilityExposurePolicy,
} from "@/lib/platform-sdk/capability-exposure-policy";
import type { AnalyzedPlatformBlueprint } from "@/lib/hub/dev/platform-analyzer";

export type DevChangeReviewState = "pending" | "accepted" | "rejected";

export type DevProjectFile = {
  readonly id: string;
  readonly name: string;
  readonly kind: "api" | "schema" | "config" | "docs" | "asset" | "source";
  readonly path: string;
};

export type DevProjectIssue = {
  readonly id: string;
  readonly severity: "error" | "warning";
  readonly title: string;
  readonly detail: string;
  readonly capabilityId?: string;
  readonly fixPrompt: string;
};

export type DevProjectChangeKind = "add" | "modify";

export type DevProjectChange = {
  readonly id: string;
  readonly path: string;
  readonly kind: DevProjectChangeKind;
  readonly additions: number;
  readonly deletions: number;
  readonly summary: string;
};

export type DevProjectSource = {
  readonly id: string;
  readonly label: string;
  readonly kind: "github" | "openapi" | "api" | "upload" | "describe";
  readonly detail?: string;
};

export type DevPlatformStatus = {
  readonly agentReady: boolean;
  readonly rimvioCertified: boolean;
  readonly published: boolean;
  readonly certifiedVersion: string | null;
  readonly publishedAgoKo: string | null;
  readonly summaryKo: string;
};

export type DevAgentActivity = {
  readonly id: string;
  readonly label: string;
  readonly status: "done" | "running" | "warning" | "pending";
};

export type DevProjectSnapshot = {
  readonly sources: readonly DevProjectSource[];
  readonly files: readonly DevProjectFile[];
  readonly issues: readonly DevProjectIssue[];
  readonly changes: readonly DevProjectChange[];
  readonly activities: readonly DevAgentActivity[];
  readonly status: DevPlatformStatus;
  readonly capabilityCount: number;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly changesCount: number;
  readonly issuesCount: number;
};

const DEFAULT_FILES: DevProjectFile[] = [
  { id: "f-openapi", name: "openapi.yaml", kind: "api", path: "openapi.yaml" },
  { id: "f-env", name: ".env.example", kind: "config", path: ".env.example" },
  { id: "f-readme", name: "README.md", kind: "docs", path: "README.md" },
  { id: "f-cap", name: "capabilities.ts", kind: "source", path: "src/capabilities/index.ts" },
  { id: "f-schema", name: "schemas/", kind: "schema", path: "src/schemas/" },
  { id: "f-adapter", name: "adapter/", kind: "source", path: "src/adapter/" },
];

export function classifyUploadedFile(name: string): DevProjectFile["kind"] {
  const lower = name.toLowerCase();
  if (lower.includes("openapi") || lower.endsWith(".yaml") || lower.endsWith(".yml")) return "api";
  if (lower.endsWith(".sql")) return "schema";
  if (lower.includes(".env")) return "config";
  if (lower.endsWith(".md")) return "docs";
  if (/\.(svg|png|jpg|webp)$/.test(lower)) return "asset";
  return "source";
}

export function filesFromUploads(names: readonly string[]): DevProjectFile[] {
  return names.map((name, i) => ({
    id: `upload-${i}-${name}`,
    name,
    kind: classifyUploadedFile(name),
    path: name,
  }));
}

export function deriveProjectIssues(draft: PlatformDraft): DevProjectIssue[] {
  const issues: DevProjectIssue[] = [];

  for (const action of draft.actions) {
    const policy = resolveCapabilityExposurePolicy(action.name, {
      approvalRequired: action.approvalRequired,
    });
    if (action.approvalRequired && !action.outputSchema.includes(".v")) {
      issues.push({
        id: `issue-schema-${action.id}`,
        severity: "error",
        title: action.name,
        detail: "response schema 없음",
        capabilityId: action.name,
        fixPrompt: `${action.name}의 output schema를 API response에서 생성하고 adapter를 수정해줘.`,
      });
    }
    if (policy.risk === "critical" && !action.approvalRequired) {
      issues.push({
        id: `issue-approval-${action.id}`,
        severity: "warning",
        title: action.name,
        detail: "approvalRequired 권장",
        capabilityId: action.name,
        fixPrompt: `${action.name}에 approvalRequired를 켜줘.`,
      });
    }
    if (action.name.includes("payment")) {
      issues.push({
        id: `issue-auth-${action.id}`,
        severity: "warning",
        title: "Authentication",
        detail: "API key 확인 필요",
        capabilityId: action.name,
        fixPrompt: "Payment API authentication을 설정하고 .env.example을 업데이트해줘.",
      });
    }
  }

  if (!draft.manifestJson || draft.manifestJson.length < 32) {
    issues.push({
      id: "issue-manifest",
      severity: "warning",
      title: "Manifest",
      detail: "manifest sync 필요",
      fixPrompt: "Platform manifest를 생성하고 sync해줘.",
    });
  }

  return issues;
}

export function deriveProjectChanges(draft: PlatformDraft): DevProjectChange[] {
  if (draft.actions.length === 0) return [];
  const changes: DevProjectChange[] = [
    {
      id: "ch-manifest",
      path: "rimvio.platform.manifest.json",
      kind: "add",
      additions: 48,
      deletions: 0,
      summary: "Platform manifest",
    },
  ];
  for (const action of draft.actions.slice(0, 5)) {
    const slug = action.name.replace(/\./g, "/");
    changes.push({
      id: `ch-${action.id}`,
      path: `src/capabilities/${slug}.ts`,
      kind: "add",
      additions: 12 + action.name.length,
      deletions: 0,
      summary: action.name,
    });
    changes.push({
      id: `ch-schema-${action.id}`,
      path: `src/schemas/${action.name.replace(/\./g, "_")}.schema.ts`,
      kind: "add",
      additions: 24,
      deletions: 0,
      summary: `${action.name} schema`,
    });
  }
  if (draft.actions.some((a) => a.name.includes("payment"))) {
    changes.push({
      id: "ch-adapter-payment",
      path: "src/adapter/payment.ts",
      kind: "modify",
      additions: 12,
      deletions: 3,
      summary: "payment adapter",
    });
  }
  return changes;
}

export function activitiesFromAnalyze(blueprint: AnalyzedPlatformBlueprint): DevAgentActivity[] {
  const cert = blueprint.certification;
  return [
    { id: "a1", label: "Repository connected", status: "done" },
    { id: "a2", label: `${blueprint.capabilities.length} capabilities found`, status: "done" },
    {
      id: "a3",
      label: "Schema generated",
      status: cert.find((c) => c.id === "schema")?.passed ? "done" : "warning",
    },
    {
      id: "a4",
      label: "Permissions applied",
      status: cert.find((c) => c.id === "permission")?.passed ? "done" : "warning",
    },
    {
      id: "a5",
      label: "Testing capabilities",
      status: cert.find((c) => c.id === "agent")?.passed ? "done" : "running",
    },
  ];
}

export function buildProjectSnapshot(input: {
  readonly draft: PlatformDraft;
  readonly uploadedFiles?: readonly string[];
  readonly connectedSource?: DevProjectSource | null;
  readonly testsPassed?: boolean;
  readonly publishStatus?: string;
  readonly publishedAtMs?: number;
  readonly extraActivities?: readonly DevAgentActivity[];
}): DevProjectSnapshot {
  const sources: DevProjectSource[] = [];
  if (input.connectedSource) sources.push(input.connectedSource);
  for (const name of input.uploadedFiles ?? []) {
    sources.push({
      id: `src-upload-${name}`,
      label: name,
      kind: "upload",
    });
  }

  const files =
    input.uploadedFiles?.length && input.uploadedFiles.length > 0
      ? filesFromUploads(input.uploadedFiles)
      : input.draft.actions.length > 0
        ? DEFAULT_FILES
        : [];

  const issues = deriveProjectIssues(input.draft);
  const changes = deriveProjectChanges(input.draft);
  const capTotal = input.draft.actions.length;
  const testsPassed = input.testsPassed
    ? capTotal
    : Math.max(0, capTotal - issues.filter((i) => i.severity === "error").length);

  const agentReady =
    capTotal > 0 && issues.filter((i) => i.severity === "error").length === 0;
  const published = input.publishStatus === "published";

  const status: DevPlatformStatus = {
    agentReady,
    rimvioCertified: agentReady && capTotal >= 3,
    published,
    certifiedVersion: agentReady && capTotal >= 3 ? input.draft.version || "v1.0.0" : null,
    publishedAgoKo: published
      ? input.publishedAtMs
        ? formatAgoKo(Date.now() - input.publishedAtMs)
        : "방금"
      : null,
    summaryKo: published
      ? "Published · Capability Index에 등록됨"
      : agentReady
        ? "Agent Ready · Publish 가능"
        : capTotal > 0
          ? "Review issues · Agent 준비 중"
          : "Connect a source to begin",
  };

  const activities: DevAgentActivity[] = input.extraActivities?.length
    ? [...input.extraActivities]
    : capTotal > 0
      ? [
          { id: "ready", label: `${capTotal} capabilities found`, status: "done" },
          { id: "schema", label: `${capTotal} schemas generated`, status: "done" },
          { id: "runtime", label: "Runtime connected", status: "done" },
          {
            id: "issues",
            label: issues.length ? `${issues.length} issues` : "No issues",
            status: issues.length ? "warning" : "done",
          },
        ]
      : [{ id: "idle", label: "Awaiting source", status: "pending" }];

  return {
    sources,
    files,
    issues,
    changes,
    activities,
    status,
    capabilityCount: capTotal,
    testsPassed,
    testsTotal: capTotal,
    changesCount: changes.length,
    issuesCount: issues.length,
  };
}

function formatAgoKo(deltaMs: number): string {
  if (deltaMs < 60_000) return "방금";
  if (deltaMs < 3_600_000) return `${Math.floor(deltaMs / 60_000)}m ago`;
  return `${Math.floor(deltaMs / 3_600_000)}h ago`;
}
