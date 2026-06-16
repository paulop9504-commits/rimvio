import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";

/** Collapsed hub rail — connected actionable service first, then next plug-in candidate. */
export function resolvePrimaryHubServiceRow(
  services: readonly ContextHubServiceRow[],
): ContextHubServiceRow | null {
  const connected = services.filter(
    (row) =>
      row.connected &&
      row.implemented &&
      (Boolean(row.link?.actionUrl) || Boolean(row.handoffHref)),
  );
  if (connected.length > 0) {
    return connected[0] ?? null;
  }

  const offered = services.filter((row) => row.implemented && row.offered);
  return offered[0] ?? null;
}
