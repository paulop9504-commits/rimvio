export const CODING_TOOL_IDS = [
  "code.createFile",
  "code.deleteFile",
  "code.transform",
  "code.findDefinition",
  "code.analyzeImports",
  "code.callGraph",
  "repo.clone",
  "repo.status",
  "test.discover",
  "test.generate",
  "test.e2e",
  "lint.run",
  "typecheck.run",
  "server.start",
  "server.stop",
  "server.status",
] as const;

export type CodingToolId = (typeof CODING_TOOL_IDS)[number];

export function isCodingToolId(id: string): id is CodingToolId {
  return (CODING_TOOL_IDS as readonly string[]).includes(id);
}
