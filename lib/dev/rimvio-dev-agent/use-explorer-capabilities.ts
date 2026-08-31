"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listPublishedCapabilitySummaries,
  subscribeCapabilityIndex,
  type HubCapabilitySummary,
} from "@/lib/capability-core";
import { DEV_AGENT_CAPABILITIES } from "@/lib/dev/rimvio-dev-agent/fixtures";

const FIXTURE_SUMMARIES: HubCapabilitySummary[] = DEV_AGENT_CAPABILITIES.map((cap) => ({
  capabilityId: cap.id,
  label: cap.label,
  description: cap.description,
  status: "FIXTURE",
  approvalRequired: cap.permission === "approval",
  source: "fixture",
}));

export function useExplorerCapabilities(): HubCapabilitySummary[] {
  const [indexVersion, setIndexVersion] = useState(0);

  useEffect(() => {
    return subscribeCapabilityIndex(() => {
      setIndexVersion((value) => value + 1);
    });
  }, []);

  return useMemo(
    () => listPublishedCapabilitySummaries(FIXTURE_SUMMARIES),
    [indexVersion],
  );
}

export function getExplorerCapabilityMeta(capabilityId: string) {
  return (
    DEV_AGENT_CAPABILITIES.find((cap) => cap.id === capabilityId) ?? {
      id: capabilityId,
      label: capabilityId,
      description: "Published capability",
      permission: "auto" as const,
      inputs: [],
      runtime: "browser",
      usedBy: [],
    }
  );
}
