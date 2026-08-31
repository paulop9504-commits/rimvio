import type { GitHubRepoConnector } from "@/lib/capability-runtime/types";

export type GitHubConnectRequest = {
  readonly installationId: string;
  readonly owner: string;
  readonly repo: string;
};

/** Repo-scoped GitHub App — never account-wide, never given to Main Agent. */
export function connectGitHubRepo(request: GitHubConnectRequest): GitHubRepoConnector {
  if (!request.owner.trim() || !request.repo.trim()) {
    throw new Error("owner and repo are required");
  }
  return {
    kind: "github_app",
    installationId: request.installationId,
    owner: request.owner.trim(),
    repo: request.repo.trim(),
    permissions: ["contents:read"],
    accountWide: false,
  };
}

export function githubConnectorScopeLabel(connector: GitHubRepoConnector): string {
  return `${connector.owner}/${connector.repo} · contents:read`;
}

export function agentMayReceiveGitHubToken(): false {
  return false;
}
