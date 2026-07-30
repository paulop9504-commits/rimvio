/**
 * Explicit “open / expand Workspace” — not soft continue, not domain scout.
 */

const OPEN_WORKSPACE_RE =
  /(?:작업장|워크스페이스|workspace)\s*(?:띄워|열어|열기|펼쳐|펼치기|보여)(?:\s*(?:줘|주세요|봐|요))?|^(?:펼치기|작업장\s*열기)$|(?:open|expand)\s*(?:the\s*)?workspace/iu;

export function isOpenWorkspaceUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text || text.length > 64) {
    return false;
  }
  return OPEN_WORKSPACE_RE.test(text);
}
