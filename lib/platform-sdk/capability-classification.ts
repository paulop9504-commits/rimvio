/**
 * Capability Classification — Rimvio auto-groups Dev capabilities for policy + exposure.
 */

export type CapabilityClass =
  | "read"
  | "search"
  | "create"
  | "edit"
  | "delete"
  | "transaction"
  | "share"
  | "execute"
  | "export"
  | "analyze"
  | "measure";

const CLASS_PATTERNS: readonly { pattern: RegExp; class: CapabilityClass }[] = [
  { pattern: /\.(delete|remove|destroy)/, class: "delete" },
  { pattern: /\.(share|collaborate|invite)/, class: "share" },
  { pattern: /\.(payment|purchase|commit|pay|order)/, class: "transaction" },
  { pattern: /\.(export|output|download)/, class: "export" },
  { pattern: /\.(render|simulate|run)/, class: "execute" },
  { pattern: /\.(inspect|analyze|analysis|parse)/, class: "analyze" },
  { pattern: /\.(measure|dimension|size)/, class: "measure" },
  { pattern: /\.(create|register|listing|add)/, class: "create" },
  { pattern: /\.(edit|update|modify|change)/, class: "edit" },
  { pattern: /\.(search|find|query|list)/, class: "search" },
  { pattern: /\.(open|detail|get|view|read)/, class: "read" },
];

export function classifyCapability(capabilityId: string): CapabilityClass {
  const id = capabilityId.toLowerCase();
  for (const { pattern, class: capClass } of CLASS_PATTERNS) {
    if (pattern.test(id)) return capClass;
  }
  if (id.includes("search")) return "search";
  if (id.includes("create")) return "create";
  return "read";
}

export function capabilityClassLabelKo(capClass: CapabilityClass): string {
  switch (capClass) {
    case "read":
      return "조회";
    case "search":
      return "검색";
    case "create":
      return "생성";
    case "edit":
      return "수정";
    case "delete":
      return "삭제";
    case "transaction":
      return "거래";
    case "share":
      return "공유";
    case "execute":
      return "실행";
    case "export":
      return "내보내기";
    case "analyze":
      return "분석";
    case "measure":
      return "측정";
    default:
      return capClass;
  }
}

export function inferDomainFromCapabilityId(capabilityId: string): string {
  return capabilityId.split(".")[0] ?? "general";
}
