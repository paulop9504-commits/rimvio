/**
 * Platform Blueprint — ADE dashboard model derived from draft + snapshot.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { buildDevAnalysisResult } from "@/lib/hub/dev/dev-analysis-result";

export type DevBlueprintModel = {
  readonly capabilities: readonly string[];
  readonly dataEntities: readonly string[];
  readonly workflows: readonly string[];
  readonly permissions: readonly string[];
  readonly contextFields: readonly string[];
  readonly runtimes: readonly string[];
  readonly commerceLabel: string;
  readonly healthScore: number;
  readonly healthChecks: readonly { readonly label: string; readonly ok: boolean }[];
  readonly recentActivity: readonly {
    readonly id: string;
    readonly label: string;
    readonly ago: string;
    readonly tone: "ok" | "warn" | "neutral";
  }[];
};

function inferDataEntities(draft: PlatformDraft): string[] {
  const caps = draft.actions.map((a) => a.name);
  if (caps.some((c) => c.startsWith("hotel") || c.includes("booking"))) {
    return ["hotels", "rooms", "bookings", "payments"];
  }
  if (caps.some((c) => c.startsWith("market"))) {
    return ["listings", "offers", "orders", "sellers"];
  }
  if (caps.some((c) => c.startsWith("design"))) {
    return ["models", "parts", "materials", "exports"];
  }
  return ["entities", "schemas", "events", "users"];
}

function inferWorkflows(draft: PlatformDraft): string[] {
  const caps = draft.actions.map((a) => a.name);
  const flows: string[] = [];
  if (caps.some((c) => c.includes("search"))) flows.push("hotel.search flow");
  if (caps.some((c) => c.includes("booking"))) flows.push("booking.flow");
  if (caps.some((c) => c.includes("confirm"))) flows.push("confirmation");
  if (caps.some((c) => c.includes("cancel"))) flows.push("cancellation");
  if (caps.some((c) => c.includes("payment"))) flows.push("payment.flow");
  if (flows.length === 0) flows.push("capability pipeline", "agent invoke");
  return flows.slice(0, 6);
}

export function buildDevBlueprintModel(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly analyzedAtMs?: number | null;
}): DevBlueprintModel {
  const analysis = buildDevAnalysisResult({
    draft: input.draft,
    snapshot: input.snapshot,
    analyzedAtMs: input.analyzedAtMs ?? undefined,
  });

  const capabilities = input.draft.actions.map((a) => a.name);
  const permissions =
    input.draft.permissions.filter((p) => p.enabled).map((p) => p.id).slice(0, 6) ||
    ["location.read", "external_network.read", "booking.write"];
  const contextFields =
    input.draft.selectedContext.length > 0
      ? input.draft.selectedContext.map((c) => c.path)
      : ["destination", "dates.checkIn", "dates.checkOut", "guests"];

  const runtimes =
    input.draft.runtimeTier === "native"
      ? ["native", "cloud-agent"]
      : ["hosted", "cloud-agent"];

  const healthScore = analysis?.confidenceScore ?? 0;
  const testsOk =
    input.snapshot.testsTotal > 0 &&
    input.snapshot.testsPassed === input.snapshot.testsTotal;

  const agoLabel = input.analyzedAtMs
    ? formatAgo(Date.now() - input.analyzedAtMs)
    : "1m ago";

  const recentActivity: DevBlueprintModel["recentActivity"] = [
    { id: "a1", label: "Platform analyzed", ago: agoLabel, tone: "ok" },
    {
      id: "a2",
      label:
        input.snapshot.issuesCount > 0
          ? `${input.snapshot.issuesCount} issues found`
          : "No issues",
      ago: "2m ago",
      tone: input.snapshot.issuesCount > 0 ? "warn" : "ok",
    },
    {
      id: "a3",
      label: `Test ${input.snapshot.testsPassed}/${input.snapshot.testsTotal} passed`,
      ago: "3m ago",
      tone: testsOk ? "ok" : "warn",
    },
    {
      id: "a4",
      label: input.snapshot.status.agentReady ? "Agent Ready" : "Building",
      ago: "5m ago",
      tone: input.snapshot.status.agentReady ? "ok" : "neutral",
    },
  ];

  return {
    capabilities,
    dataEntities: inferDataEntities(input.draft),
    workflows: inferWorkflows(input.draft),
    permissions: permissions.length ? permissions : ["location.read", "booking.write"],
    contextFields,
    runtimes,
    commerceLabel: input.draft.commerceNotes?.trim() || "Stripe Integration",
    healthScore,
    healthChecks: [
      { label: "Capabilities", ok: capabilities.length > 0 },
      { label: "Schemas", ok: capabilities.length > 0 },
      { label: "Permissions", ok: permissions.length > 0 },
      { label: "Runtime", ok: runtimes.length > 0 },
      { label: "Tests", ok: testsOk },
    ],
    recentActivity,
  };
}

function formatAgo(ms: number): string {
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  return "1h+ ago";
}
