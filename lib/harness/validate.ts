import {
  harnessSchema,
  type Harness,
  type HarnessAction,
  type HarnessNode,
} from "@/lib/rimvio-protocol/harness/schema";

export type HarnessValidationIssue = {
  readonly path: string;
  readonly message: string;
  readonly code: string;
};

export type HarnessValidationResult =
  | { readonly ok: true; readonly harness: Harness }
  | { readonly ok: false; readonly issues: readonly HarnessValidationIssue[] };

export function parseHarness(input: unknown): HarnessValidationResult {
  const parsed = harnessSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, harness: parsed.data };
  }
  const issues: HarnessValidationIssue[] = parsed.error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
    code: issue.code,
  }));
  return { ok: false, issues };
}

export function assertHarness(input: unknown): Harness {
  const result = parseHarness(input);
  if (!result.ok) {
    const detail = result.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error(`invalid_harness: ${detail}`);
  }
  return result.harness;
}

/** Structural checks beyond Zod (graph integrity). */
export function validateHarnessGraph(harness: Harness): HarnessValidationIssue[] {
  const issues: HarnessValidationIssue[] = [];
  const ids = new Set(harness.nodes.map((n) => n.id));
  if (ids.size !== harness.nodes.length) {
    issues.push({
      path: "nodes",
      message: "duplicate node id",
      code: "duplicate_node_id",
    });
  }
  for (const node of harness.nodes) {
    for (const nextId of node.next ?? []) {
      if (!ids.has(nextId)) {
        issues.push({
          path: `nodes.${node.id}.next`,
          message: `unknown next node id: ${nextId}`,
          code: "dangling_edge",
        });
      }
    }
    const actionIds = new Set(node.actions.map((a) => a.id));
    if (actionIds.size !== node.actions.length) {
      issues.push({
        path: `nodes.${node.id}.actions`,
        message: "duplicate action id",
        code: "duplicate_action_id",
      });
    }
  }
  const hasTrigger = harness.nodes.some((n) => n.type === "TRIGGER");
  if (harness.nodes.length > 0 && !hasTrigger) {
    issues.push({
      path: "nodes",
      message: "harness with nodes should include a TRIGGER node",
      code: "missing_trigger",
    });
  }
  return issues;
}

export function validateHarness(input: unknown): HarnessValidationResult {
  const parsed = parseHarness(input);
  if (!parsed.ok) return parsed;
  const graphIssues = validateHarnessGraph(parsed.harness);
  if (graphIssues.length > 0) {
    return { ok: false, issues: graphIssues };
  }
  return parsed;
}

export function serializeHarness(harness: Harness): string {
  const checked = validateHarness(harness);
  if (!checked.ok) {
    const detail = checked.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error(`cannot_serialize_harness: ${detail}`);
  }
  return JSON.stringify(checked.harness, null, 2);
}

export function deserializeHarness(json: string): Harness {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    throw new Error("cannot_deserialize_harness: invalid_json");
  }
  return assertHarness(raw);
}

export function findNode(harness: Harness, nodeId: string): HarnessNode | undefined {
  return harness.nodes.find((n) => n.id === nodeId);
}

export function findAction(
  harness: Harness,
  actionId: string,
): { node: HarnessNode; action: HarnessAction } | undefined {
  for (const node of harness.nodes) {
    const action = node.actions.find((a) => a.id === actionId);
    if (action) return { node, action };
  }
  return undefined;
}

export function requiresApproval(harness: Harness): boolean {
  const fromRoot = harness.permissions.some((p) => p.approvalRequired);
  const fromNodes = harness.nodes.some((n) => n.permissions.some((p) => p.approvalRequired));
  const financial = [...harness.permissions, ...harness.nodes.flatMap((n) => n.permissions)].some(
    (p) => p.type === "FINANCIAL" || p.type === "DELETE" || p.type === "ADMIN",
  );
  return fromRoot || fromNodes || financial;
}
