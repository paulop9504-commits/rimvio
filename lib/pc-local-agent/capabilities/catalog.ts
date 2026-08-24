import type { CapabilityDefinition } from "./types";
import {
  BUILTIN_CAPABILITY_IDS,
  DEMO_CAPABILITY_ID,
  PDF_CAPABILITY_ID,
} from "./types";

export const CAPABILITY_CATALOG: CapabilityDefinition[] = [
  {
    id: "browser.basic",
    name: "Browser Basic",
    description: "기본 브라우저 열기 및 URL 이동",
    version: "1.0.0",
    tier: "builtin",
    provides: [
      "browser.launch",
      "browser.navigate",
      "browser.open",
      "browser.click",
      "browser.type",
      "browser.read",
      "browser.screenshot",
      "browser.wait",
      "browser.back",
    ],
    requires: [],
    installKind: "bundled",
    permissions: [],
  },
  {
    id: DEMO_CAPABILITY_ID,
    name: "Demo Module",
    description: "데모용 Agent 모듈 — Capability 설치·승인·재개 흐름 검증",
    version: "1.0.0",
    tier: "installable",
    provides: ["demo.execute"],
    requires: ["browser.basic"],
    installKind: "bundled",
    permissions: ["agent.local_module"],
  },
  {
    id: "browser.connector",
    name: "Rimvio Browser Connector",
    description: "현재 브라우저 탭 연동 (확장 프로그램 — 최후 수단)",
    version: "1.0.0",
    tier: "sensitive",
    provides: ["browser.active_tab", "browser.dom_read"],
    requires: ["browser.basic"],
    installKind: "browser_extension",
    permissions: ["browser.current_tab", "browser.selected_files"],
  },
  {
    id: PDF_CAPABILITY_ID,
    name: "PDF Reader",
    description: "로컬 PDF 파일 읽기 및 텍스트 추출",
    version: "1.1.0",
    tier: "installable",
    provides: ["file.pdf.read", "file.pdf.extract_text"],
    requires: [],
    installKind: "npm_module",
    permissions: ["file.user_selected"],
    npmPackage: "pdf-parse",
  },
];

const catalogById = new Map(CAPABILITY_CATALOG.map((c) => [c.id, c]));

export function getCapabilityDefinition(id: string): CapabilityDefinition | undefined {
  return catalogById.get(id);
}

export function getCapabilityDefinitions(ids: string[]): CapabilityDefinition[] {
  return ids
    .map((id) => catalogById.get(id))
    .filter((c): c is CapabilityDefinition => Boolean(c));
}

export function listCatalogCapabilities(): CapabilityDefinition[] {
  return [...CAPABILITY_CATALOG];
}

export function compareCapabilityVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number(n) || 0);
  const pb = b.split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

export function isUpdateAvailable(
  installedVersion: string,
  catalogVersion: string,
): boolean {
  return compareCapabilityVersions(installedVersion, catalogVersion) < 0;
}

export function defaultRequiredForTaskType(
  taskType: string,
  payload?: { requiredCapabilities?: string[] },
): string[] {
  if (payload?.requiredCapabilities?.length) {
    return payload.requiredCapabilities;
  }
  if (taskType === "OPEN_URL") {
    return [...BUILTIN_CAPABILITY_IDS];
  }
  return [...BUILTIN_CAPABILITY_IDS];
}

export function expandCapabilityDependencies(ids: string[]): string[] {
  const resolved = new Set<string>();
  const queue = [...ids];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (resolved.has(id)) {
      continue;
    }
    resolved.add(id);
    const def = catalogById.get(id);
    if (def) {
      for (const req of def.requires) {
        if (!resolved.has(req)) {
          queue.push(req);
        }
      }
    }
  }

  return [...resolved];
}
