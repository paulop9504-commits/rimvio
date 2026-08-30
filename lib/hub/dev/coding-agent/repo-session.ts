/**
 * In-process repo session — platformId → cloned workspace root.
 * Memory-only so the Hub Agent client bundle never imports Node fs.
 */

export type RepoSession = {
  readonly platformId: string;
  readonly root: string;
  readonly remoteUrl: string | null;
  readonly clonedAt: string;
};

const SESSIONS = new Map<string, RepoSession>();

export function getRepoSession(platformId: string): RepoSession | null {
  return SESSIONS.get(platformId) ?? null;
}

export function setRepoSession(session: RepoSession): RepoSession {
  SESSIONS.set(session.platformId, session);
  return session;
}

export function clearRepoSession(platformId: string): void {
  SESSIONS.delete(platformId);
}

export function clearAllRepoSessionsForTests(): void {
  SESSIONS.clear();
}
