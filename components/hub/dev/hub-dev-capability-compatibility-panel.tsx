"use client";

import { HubDevCompatibilityGraphPanel } from "@/components/hub/dev/hub-dev-compatibility-graph-panel";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";

type HubDevCapabilityCompatibilityPanelProps = {
  draft: PlatformDraft;
  action: CapabilityAction;
  onTest?: () => void;
};

/** Capability detail embed — compact Compatibility Graph (ADR-064). */
export function HubDevCapabilityCompatibilityPanel({
  draft,
  action,
  onTest,
}: HubDevCapabilityCompatibilityPanelProps) {
  return (
    <HubDevCompatibilityGraphPanel
      draft={draft}
      actions={[action]}
      initialCapabilityId={action.id}
      variant="compact"
      onTest={onTest}
    />
  );
}
