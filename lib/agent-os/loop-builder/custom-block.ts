/**
 * Custom block code — validate + node helpers.
 */

import { createLoopNode } from "@/lib/agent-os/loop-builder/nodes";
import {
  getLoopBlockTemplate,
  type LoopBlockTemplate,
} from "@/lib/agent-os/loop-builder/block-templates";
import type { LoopNode, LoopNodeConfig } from "@/lib/agent-os/loop-builder/types";

export const CUSTOM_BLOCK_CODE_STUB = `// Custom block — Rimvio compiles to Tool Gateway
act("capability.name")
  .input({ key: "{{ variable }}" })
  .output(["result"])
  .onFail("replan")`;

export function createNodeFromTemplate(template: LoopBlockTemplate, id: string): LoopNode {
  return createLoopNode(template.kind, id, template.defaultLabel, {
    ...template.config,
    templateId: template.id,
  });
}

export function applyTemplateToNode(node: LoopNode, templateId: string): LoopNode {
  const template = getLoopBlockTemplate(templateId);
  if (!template) return node;
  return {
    ...node,
    kind: template.kind,
    label: template.defaultLabel,
    config: {
      ...template.config,
      templateId: template.id,
      customCode: template.config.customCode ?? node.config.customCode,
    },
  };
}

export function validateCustomBlockCode(code: string): { ok: boolean; messageKo: string | null } {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, messageKo: "커스텀 블록 코드가 비어 있습니다." };
  }
  if (trimmed.length > 8000) {
    return { ok: false, messageKo: "블록 코드가 너무 깁니다 (8000자 이하)." };
  }
  const forbidden = [/eval\s*\(/i, /Function\s*\(/i, /require\s*\(/i, /import\s+/i, /process\./i];
  for (const pattern of forbidden) {
    if (pattern.test(trimmed)) {
      return { ok: false, messageKo: "허용되지 않는 코드 패턴입니다. Loop DSL만 사용하세요." };
    }
  }
  return { ok: true, messageKo: null };
}

export function nodeHasExecutableCode(node: LoopNode): boolean {
  if (node.kind === "CUSTOM") return Boolean(node.config.customCode?.trim());
  return Boolean(node.config.customCode?.trim() || node.config.capabilityId || node.config.toolId);
}

export function nodeToBlockCode(node: LoopNode): string {
  if (node.config.customCode?.trim()) return node.config.customCode.trim();
  const cap = node.config.capabilityId ?? node.config.toolId ?? node.config.target ?? node.label;
  const kind = node.kind.toLowerCase();
  return `${kind}("${cap}")`;
}

export function parseBlockCodeSnippet(code: string, node: LoopNode): Partial<LoopNodeConfig> {
  const capMatch = code.match(/(?:capability|act|tool|inspect|verify)\(\s*["']([^"']+)["']/i);
  const toolMatch = code.match(/tool\(\s*["']([^"']+)["']/i);
  return {
    customCode: code,
    ...(capMatch?.[1] && (node.kind === "CAPABILITY" || node.kind === "ACT")
      ? { capabilityId: capMatch[1] }
      : {}),
    ...(capMatch?.[1] && node.kind !== "CAPABILITY" && node.kind !== "ACT"
      ? { target: capMatch[1] }
      : {}),
    ...(toolMatch?.[1] ? { toolId: toolMatch[1] } : {}),
  };
}
