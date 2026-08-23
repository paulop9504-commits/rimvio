export function log(scope: string, message: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${scope}] ${message}`);
}

export function logError(scope: string, message: string, err?: unknown): void {
  const ts = new Date().toISOString();
  const detail = err instanceof Error ? err.message : err ? String(err) : "";
  console.error(`[${ts}] [${scope}] ${message}${detail ? `: ${detail}` : ""}`);
}
