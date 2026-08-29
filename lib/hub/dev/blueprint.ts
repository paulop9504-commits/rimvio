import type { PlatformDraft } from "@/lib/hub/platform/types";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { platformDraftFromUtterance } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { PlatformBlueprintView } from "@/lib/hub/dev/platform-nav";

const OSAKA_STAY_CAPABILITIES = [
  "hotel.search",
  "hotel.detail",
  "room.availability",
  "booking.prepare",
  "booking.confirm",
  "booking.cancel",
  "payment.prepare",
  "payment.commit",
  "payment.refund",
] as const;

const OSAKA_UI_ROUTES = `[
  { "path": "/", "surface": "page", "component": "HotelSearch" },
  { "path": "/hotel/:id", "surface": "page", "component": "HotelDetail" },
  { "path": "/booking", "surface": "page", "component": "BookingCheckout" }
]`;

const OSAKA_DATA_COLLECTIONS = `[
  { "name": "hotels", "schema": "hotel.v1", "pii": false },
  { "name": "rooms", "schema": "room.v1", "pii": false },
  { "name": "bookings", "schema": "booking.v1", "pii": true },
  { "name": "payments", "schema": "payment.v1", "pii": true }
]`;

export function createOsakaStayPlatformDraft(): PlatformDraft {
  const base = createDefaultPlatformDraft();
  return {
    ...base,
    id: "osaka.stay",
    name: "OsakaStay",
    description: "Hotel booking platform — search, book, and pay near Namba Station, Osaka.",
    category: "travel",
    tags: ["hotel", "booking", "osaka", "travel"],
    architectureNotes: "L1 Native · Container + Serverless · tenant_strict",
    runtimeTier: "native",
    dataCollectionsJson: OSAKA_DATA_COLLECTIONS,
    uiRoutesJson: OSAKA_UI_ROUTES,
    workflowDescription:
      "hotel.search → hotel.detail → room.availability → booking.prepare → payment.prepare → USER APPROVAL → payment.commit → booking.confirm → payment.refund (cancel path)",
    commerceNotes: "Stripe Integration · payment.prepare → user approval → payment.commit · payment.refund on cancel",
    actions: OSAKA_STAY_CAPABILITIES.map((name, i) => ({
      id: `a${i + 1}`,
      name,
      description: name.replace(/\./g, " "),
      inputSchema: `${name.replace(/\./g, "_")}.input.v1`,
      outputSchema: `${name.replace(/\./g, "_")}.output.v1`,
      approvalRequired: name.startsWith("payment") || name.startsWith("booking.confirm"),
    })),
    permissions: [
      {
        id: "location.read",
        label: "location.read",
        scope: "Read",
        whyNeeded: "Hotel search near destination",
        risk: "low",
        enabled: true,
      },
      {
        id: "external_network.read",
        label: "external_network.read",
        scope: "Read",
        whyNeeded: "Hotel inventory provider",
        risk: "medium",
        enabled: true,
      },
      {
        id: "booking.write",
        label: "booking.write",
        scope: "Write",
        whyNeeded: "Create reservations",
        risk: "high",
        enabled: true,
      },
      {
        id: "payment.prepare",
        label: "payment.prepare",
        scope: "Prepare",
        whyNeeded: "Prepare checkout — commit requires user approval",
        risk: "critical",
        enabled: true,
      },
    ],
    selectedContext: [
      { id: "c1", label: "destination", type: "string", path: "destination" },
      { id: "c2", label: "checkIn", type: "date", path: "dates.checkIn" },
      { id: "c3", label: "checkOut", type: "date", path: "dates.checkOut" },
      { id: "c4", label: "guests", type: "number", path: "guests" },
    ],
  };
}

export function blueprintFromDraft(draft: PlatformDraft): PlatformBlueprintView {
  let dataModels: string[] = [];
  try {
    const cols = JSON.parse(draft.dataCollectionsJson) as { name: string }[];
    dataModels = cols.map((c) => c.name);
  } catch {
    dataModels = ["Hotel", "Room", "Booking", "Payment"];
  }

  const workflows = draft.workflowDescription.includes("→")
    ? [draft.workflowDescription.split("→")[0]!.trim() + " flow", "Cancellation"]
    : ["Hotel Booking", "Cancellation"];

  return {
    name: draft.name || "Untitled Platform",
    tagline: draft.description || "Platform",
    capabilities: draft.actions.map((a) => a.name),
    dataModels,
    workflows,
    permissions: draft.permissions.filter((p) => p.enabled).map((p) => p.id),
    contextFields: draft.selectedContext.map((c) => c.path),
    runtime: `${draft.runtimeTier} · ${draft.runtime.type}`,
    commerce: draft.commerceNotes || "Not configured",
  };
}

export function resolvePlatformDraftFromBuildPrompt(utterance: string): PlatformDraft | null {
  const text = utterance.trim().toLowerCase();
  if (!text) return null;

  if (/호텔|hotel|예약|booking|난바|osaka|오사카/.test(text)) {
    return createOsakaStayPlatformDraft();
  }

  const fromRir = platformDraftFromUtterance(utterance);
  if (fromRir) return fromRir;

  if (/쇼핑|shop|commerce|구매/.test(text)) {
    return createDefaultPlatformDraft();
  }

  return null;
}
