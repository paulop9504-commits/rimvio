/** Default PC connect grants — sensitive work always needs a human confirm. */

export type PcAgentPermissions = {
  browser: boolean;
  webWork: boolean;
  allowedApps: boolean;
  taskStatus: boolean;
  screen: boolean;
};

export const DEFAULT_PC_AGENT_PERMISSIONS: PcAgentPermissions = {
  browser: true,
  webWork: true,
  allowedApps: true,
  taskStatus: true,
  screen: true,
};

export function parsePcAgentPermissions(raw: unknown): PcAgentPermissions {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    browser: row.browser !== false,
    webWork: row.webWork !== false,
    allowedApps: row.allowedApps !== false,
    taskStatus: row.taskStatus !== false,
    screen: row.screen !== false,
  };
}
