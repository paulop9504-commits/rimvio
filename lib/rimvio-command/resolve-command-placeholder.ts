/**
 * Single Command Bar placeholder by surface (ADR-035).
 */

import { copy } from "@/lib/copy/human-ko";
import type { RimvioCommandSurface } from "@/lib/rimvio-command/types";

export function resolveRimvioCommandPlaceholder(
  surface: RimvioCommandSurface,
): string {
  if (surface === "context") {
    return copy.globe.contextConditionPinPlaceholder;
  }
  if (surface === "workspace") {
    return copy.globe.workspacePromptPlaceholder;
  }
  return copy.globe.ingestDefaultPlaceholder;
}
