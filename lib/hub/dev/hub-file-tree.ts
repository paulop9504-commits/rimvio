/**
 * Hub virtual file tree — Platform-derived paths for Agent execution visibility.
 * File tree is secondary to Platform tree; reflects Agent read/patch/create in real time.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";

export type HubFileTreeNodeKind = "folder" | "file";

export type HubFileTouchState = "idle" | "reading" | "modified" | "created" | "running";

export type HubFileTreeNode = {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly kind: HubFileTreeNodeKind;
  readonly touch: HubFileTouchState;
  readonly children?: readonly HubFileTreeNode[];
};

function capPath(name: string): string {
  return `src/capabilities/${name.replace(/\./g, "/")}.ts`;
}

function schemaPath(name: string): string {
  return `src/schemas/${name.replace(/\./g, "_")}.schema.ts`;
}

export function buildHubFileTree(input: {
  readonly draft: PlatformDraft;
  readonly touchedPaths?: Readonly<Record<string, HubFileTouchState>>;
}): HubFileTreeNode[] {
  const touch = input.touchedPaths ?? {};
  const t = (path: string): HubFileTouchState => touch[path] ?? "idle";

  const capabilityNodes: HubFileTreeNode[] = input.draft.actions.map((a) => ({
    id: `cap-${a.id}`,
    name: `${a.name.split(".").pop() ?? a.name}.ts`,
    path: capPath(a.name),
    kind: "file" as const,
    touch: t(capPath(a.name)),
  }));

  const schemaNodes: HubFileTreeNode[] = input.draft.actions.map((a) => ({
    id: `schema-${a.id}`,
    name: `${a.name.replace(/\./g, "_")}.schema.ts`,
    path: schemaPath(a.name),
    kind: "file" as const,
    touch: t(schemaPath(a.name)),
  }));

  const domainFolders = new Map<string, HubFileTreeNode[]>();
  for (const node of capabilityNodes) {
    const parts = node.path.split("/");
    const domain = parts[2] ?? "misc";
    const list = domainFolders.get(domain) ?? [];
    list.push(node);
    domainFolders.set(domain, list);
  }

  const capTree: HubFileTreeNode[] = [...domainFolders.entries()].map(([domain, files]) => ({
    id: `folder-cap-${domain}`,
    name: domain,
    path: `src/capabilities/${domain}`,
    kind: "folder" as const,
    touch: "idle" as const,
    children: files,
  }));

  return [
    {
      id: "root-src",
      name: "src",
      path: "src",
      kind: "folder",
      touch: "idle",
      children: [
        {
          id: "folder-capabilities",
          name: "capabilities",
          path: "src/capabilities",
          kind: "folder",
          touch: "idle",
          children: capTree.length ? capTree : capabilityNodes,
        },
        {
          id: "folder-schemas",
          name: "schemas",
          path: "src/schemas",
          kind: "folder",
          touch: "idle",
          children: schemaNodes,
        },
        {
          id: "folder-tests",
          name: "tests",
          path: "src/tests",
          kind: "folder",
          touch: t("src/tests/sandbox.test.ts"),
          children: [
            {
              id: "file-sandbox-test",
              name: "sandbox.test.ts",
              path: "src/tests/sandbox.test.ts",
              kind: "file",
              touch: t("src/tests/sandbox.test.ts"),
            },
          ],
        },
        ...(input.draft.actions.some((a) => a.name.includes("payment"))
          ? [
              {
                id: "file-payment-adapter",
                name: "payment.ts",
                path: "src/adapter/payment.ts",
                kind: "file" as const,
                touch: t("src/adapter/payment.ts"),
              },
            ]
          : []),
      ],
    },
    {
      id: "file-manifest",
      name: "rimvio.platform.manifest.json",
      path: "rimvio.platform.manifest.json",
      kind: "file",
      touch: t("rimvio.platform.manifest.json"),
    },
    {
      id: "file-package",
      name: "package.json",
      path: "package.json",
      kind: "file",
      touch: t("package.json"),
    },
  ];
}

/** Map tool invocation to affected file paths for tree highlighting. */
export function pathsForHubTool(
  toolId: string,
  args: Record<string, unknown>,
  draft: PlatformDraft,
): string[] {
  switch (toolId) {
    case "file.read":
    case "file.write":
    case "file.patch":
      if (typeof args.path === "string") return [args.path];
      if (args.payment === true || args.fixPaymentCommit === true || args.journey) {
        return [
          "src/capabilities/payment/prepare.ts",
          "src/capabilities/payment/commit.ts",
          "src/adapter/payment.ts",
          "rimvio.platform.manifest.json",
        ];
      }
      return ["src/capabilities/index.ts"];
    case "schema.update": {
      const cap = String(args.capability ?? "");
      return cap ? [schemaPath(cap), capPath(cap)] : [];
    }
    case "capability.create":
    case "capability.update":
    case "capability.delete": {
      const cap = String(args.capability ?? "");
      return cap ? [capPath(cap), schemaPath(cap)] : draft.actions.flatMap((a) => [capPath(a.name), schemaPath(a.name)]);
    }
    case "test.run":
      return draft.actions.flatMap((a) => [capPath(a.name), "src/tests/sandbox.test.ts"]);
    case "workflow.create":
    case "workflow.update":
      return ["rimvio.platform.manifest.json"];
    default:
      return [];
  }
}

export function mergeFileTouches(
  prev: Readonly<Record<string, HubFileTouchState>>,
  paths: readonly string[],
  touch: HubFileTouchState,
): Record<string, HubFileTouchState> {
  const next = { ...prev };
  for (const p of paths) {
    if (p) next[p] = touch;
  }
  return next;
}
