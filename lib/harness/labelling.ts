/**
 * Hub Sandbox labelling — Web vs Local runtime + sequential steps.
 * Writes real Harness / Action shapes (no fake execution).
 */

import type {
  Harness,
  HarnessAction,
  HarnessActionType,
  HarnessNode,
  HarnessRuntimeType,
} from "@/lib/rimvio-protocol/harness/schema";
import { createEmptyHarnessDraft } from "@/lib/harness/service";
import { validateHarness, type HarnessValidationIssue } from "@/lib/harness/validate";

export type HarnessSandboxSurface = "web" | "local";

export const HARNESS_LABELLING_STEPS = [
  {
    id: 1,
    key: "overview",
    title: "작업 개요",
    description: "목적 · 대상 · 입출력을 정합니다",
  },
  {
    id: 2,
    key: "actions",
    title: "액션 라벨링",
    description: "순서로 GET · CLICK · TYPE · WAIT 등을 정의합니다",
  },
  {
    id: 3,
    key: "extract",
    title: "데이터 추출",
    description: "EXTRACT 필드와 셀렉터를 정의합니다",
  },
  {
    id: 4,
    key: "verification",
    title: "검증 규칙",
    description: "성공 조건을 붙입니다",
  },
  {
    id: 5,
    key: "exceptions",
    title: "예외 처리",
    description: "실패 시 전략을 정합니다",
  },
  {
    id: 6,
    key: "review",
    title: "요약 · 제출",
    description: "스키마 검증 후 draft로 확정합니다",
  },
] as const;

export type HarnessLabellingStepId = (typeof HARNESS_LABELLING_STEPS)[number]["id"];

export const RESEARCH_NODE_ID = "n_research";
export const EXTRACT_NODE_ID = "n_extract";
export const VERIFY_NODE_ID = "n_verify";
export const TRIGGER_NODE_ID = "n_trigger";

export function surfaceToRuntimeType(surface: HarnessSandboxSurface): HarnessRuntimeType {
  return surface === "web" ? "BROWSER" : "DESKTOP";
}

export function runtimeTypeToSurface(type: HarnessRuntimeType): HarnessSandboxSurface {
  return type === "DESKTOP" || type === "PHYSICAL_DEVICE" ? "local" : "web";
}

export function createSandboxLabellingDraft(input: {
  id?: string;
  name: string;
  surface: HarnessSandboxSurface;
  now?: string;
}): Harness {
  const now = input.now ?? new Date().toISOString();
  const id =
    input.id ??
    `harness.${input.surface}.${input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.|\.$/g, "")
      .slice(0, 40) || "draft"}`;

  const base = createEmptyHarnessDraft({ id, name: input.name.trim() || "Untitled Harness", now });
  return {
    ...base,
    runtime: {
      type: surfaceToRuntimeType(input.surface),
      environment: "sandbox",
      browser:
        input.surface === "web"
          ? { headless: true, locale: "ko-KR", viewport: { width: 1280, height: 800 } }
          : undefined,
      permissions:
        input.surface === "web"
          ? ["browser.read", "browser.write"]
          : ["desktop.observe", "desktop.input"],
    },
    metadata: {
      ...(base.metadata ?? {}),
      tags: [input.surface, "sandbox", "labelling"],
      complexity: "medium",
    },
  };
}

/** Switching surface after actions exist should reset HOW nodes. */
export function applySandboxSurface(
  harness: Harness,
  surface: HarnessSandboxSurface,
  opts?: { resetActions?: boolean },
): Harness {
  const reset = opts?.resetActions ?? hasLabellingActions(harness);
  const nextRuntime = {
    ...harness.runtime,
    type: surfaceToRuntimeType(surface),
    environment: "sandbox" as const,
    browser:
      surface === "web"
        ? harness.runtime.browser ?? {
            headless: true,
            locale: "ko-KR",
            viewport: { width: 1280, height: 800 },
          }
        : undefined,
    permissions:
      surface === "web"
        ? ["browser.read", "browser.write"]
        : ["desktop.observe", "desktop.input"],
  };

  if (!reset) {
    return {
      ...harness,
      runtime: nextRuntime,
      metadata: {
        ...(harness.metadata ?? {}),
        tags: Array.from(
          new Set([...(harness.metadata?.tags ?? []).filter((t) => t !== "web" && t !== "local"), surface, "sandbox"]),
        ),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  const fresh = createSandboxLabellingDraft({
    id: harness.id,
    name: harness.name,
    surface,
    now: harness.createdAt,
  });
  return updateLabellingOverview(
    {
      ...fresh,
      description: harness.description,
      inputSchema: harness.inputSchema,
      outputSchema: { fields: [] },
      createdAt: harness.createdAt,
      updatedAt: new Date().toISOString(),
    },
    {
      name: harness.name,
      description: harness.description,
      targetHost: harness.metadata?.targetHost,
      keywordField: true,
    },
  );
}

export function hasLabellingActions(harness: Harness): boolean {
  return harness.nodes.some((n) => n.actions.length > 0);
}

function ensureLabellingSkeleton(harness: Harness): Harness {
  if (harness.nodes.some((n) => n.id === TRIGGER_NODE_ID)) {
    return harness;
  }
  const trigger: HarnessNode = {
    id: TRIGGER_NODE_ID,
    type: "TRIGGER",
    name: "요청 수신",
    next: [RESEARCH_NODE_ID],
    actions: [],
    permissions: [],
    constraints: [],
    verification: [],
  };
  const research: HarnessNode = {
    id: RESEARCH_NODE_ID,
    type: "RESEARCH",
    name: "행동 시퀀스",
    next: [EXTRACT_NODE_ID],
    actions: [],
    permissions: [],
    constraints: [],
    verification: [],
  };
  const extract: HarnessNode = {
    id: EXTRACT_NODE_ID,
    type: "EXTRACT",
    name: "데이터 추출",
    next: [VERIFY_NODE_ID],
    actions: [],
    permissions: [],
    constraints: [],
    verification: [],
  };
  const verify: HarnessNode = {
    id: VERIFY_NODE_ID,
    type: "VERIFY",
    name: "검증",
    actions: [],
    permissions: [],
    constraints: [],
    verification: [],
  };
  return {
    ...harness,
    nodes: [trigger, research, extract, verify],
    updatedAt: new Date().toISOString(),
  };
}

export function updateLabellingOverview(
  harness: Harness,
  input: {
    name?: string;
    description?: string;
    targetHost?: string;
    keywordField?: boolean;
  },
): Harness {
  let next = ensureLabellingSkeleton(harness);
  next = {
    ...next,
    name: input.name?.trim() || next.name,
    description: input.description ?? next.description,
    metadata: {
      ...(next.metadata ?? {}),
      targetHost: input.targetHost?.trim() || next.metadata?.targetHost,
    },
    inputSchema:
      input.keywordField === false
        ? next.inputSchema
        : {
            fields: [
              {
                name: "keyword",
                type: "string",
                required: true,
                description: "검색/입력 변수",
              },
            ],
          },
    updatedAt: new Date().toISOString(),
  };
  return next;
}

export function appendLabellingAction(
  harness: Harness,
  action: Omit<HarnessAction, "id"> & { id?: string },
): Harness {
  const base = ensureLabellingSkeleton(harness);
  const research = base.nodes.find((n) => n.id === RESEARCH_NODE_ID);
  if (!research) return base;
  const id = action.id ?? `a_${action.type.toLowerCase()}_${research.actions.length + 1}`;
  const nextAction: HarnessAction = { ...action, id };
  return {
    ...base,
    nodes: base.nodes.map((n) =>
      n.id === RESEARCH_NODE_ID ? { ...n, actions: [...n.actions, nextAction] } : n,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function removeLabellingAction(harness: Harness, actionId: string): Harness {
  return {
    ...harness,
    nodes: harness.nodes.map((n) =>
      n.id === RESEARCH_NODE_ID
        ? { ...n, actions: n.actions.filter((a) => a.id !== actionId) }
        : n,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function setExtractFields(
  harness: Harness,
  fields: NonNullable<HarnessAction["fields"]>,
): Harness {
  const base = ensureLabellingSkeleton(harness);
  const extractAction: HarnessAction = {
    id: "a_extract",
    type: "EXTRACT",
    fields,
  };
  return {
    ...base,
    nodes: base.nodes.map((n) => {
      if (n.id !== EXTRACT_NODE_ID) return n;
      const without = n.actions.filter((a) => a.type !== "EXTRACT");
      return { ...n, actions: [...without, extractAction] };
    }),
    outputSchema: {
      fields: fields.map((f) => ({
        name: f.name,
        type: f.type === "number" ? "number" : f.type === "url" || f.type === "image" ? f.type : "string",
        required: true,
      })),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function setLabellingVerifications(
  harness: Harness,
  items: Harness["verification"],
): Harness {
  const base = ensureLabellingSkeleton(harness);
  return {
    ...base,
    nodes: base.nodes.map((n) =>
      n.id === VERIFY_NODE_ID ? { ...n, verification: items } : n,
    ),
    verification: items,
    updatedAt: new Date().toISOString(),
  };
}

export function setLabellingExceptionStrategy(
  harness: Harness,
  strategy: NonNullable<HarnessNode["onError"]>,
): Harness {
  const base = ensureLabellingSkeleton(harness);
  return {
    ...base,
    nodes: base.nodes.map((n) =>
      n.id === RESEARCH_NODE_ID ? { ...n, onError: strategy } : n,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function canAdvanceLabellingStep(
  harness: Harness,
  step: HarnessLabellingStepId,
): { ok: boolean; issues: readonly HarnessValidationIssue[] } {
  const issues: HarnessValidationIssue[] = [];
  if (step >= 1) {
    if (!harness.name.trim()) {
      issues.push({ path: "name", message: "이름이 필요합니다", code: "required" });
    }
  }
  if (step >= 2) {
    const research = harness.nodes.find((n) => n.id === RESEARCH_NODE_ID);
    if (!research || research.actions.length === 0) {
      issues.push({
        path: "nodes.n_research.actions",
        message: "액션을 1개 이상 추가하세요",
        code: "required",
      });
    }
  }
  if (step >= 6) {
    const full = validateHarness(ensureLabellingSkeleton(harness));
    if (!full.ok) return { ok: false, issues: full.issues };
  }
  return { ok: issues.length === 0, issues };
}

export const LABELLING_ACTION_PALETTE: readonly {
  type: HarnessActionType;
  label: string;
  webOnly?: boolean;
}[] = [
  { type: "GET", label: "GET / 열기" },
  { type: "NAVIGATE", label: "NAVIGATE" },
  { type: "CLICK", label: "CLICK" },
  { type: "TYPE", label: "TYPE" },
  { type: "WAIT", label: "WAIT" },
  { type: "OBSERVE", label: "OBSERVE" },
  { type: "EXTRACT", label: "EXTRACT", webOnly: true },
  { type: "EXECUTE", label: "EXECUTE" },
] as const;
