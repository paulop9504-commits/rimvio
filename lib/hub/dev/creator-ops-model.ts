import type { PlatformDraft } from "@/lib/hub/platform/types";

/** Rimvio provides OS infra — never hotel/booking business operations. */
export const RIMVIO_OS_LAYERS = [
  "Platform Development OS",
  "Runtime",
  "Database / Storage options",
  "Authentication",
  "Permission",
  "Deployment",
  "Capability Registry",
  "Hub",
  "Agent Interface",
  "Monitoring",
] as const;

export type CreatorAdminModuleId =
  | "dashboard"
  | "hotels"
  | "rooms"
  | "rates"
  | "inventory"
  | "bookings"
  | "customers"
  | "promotions"
  | "payments"
  | "settlement"
  | "support"
  | "analytics";

export type CreatorAdminModule = {
  readonly id: CreatorAdminModuleId;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  readonly relatedCapabilities: readonly string[];
  readonly dataCollection?: string;
};

export type CreatorOpsMetric = {
  readonly label: string;
  readonly value: string;
  readonly demo: true;
};

export type CreatorSupplierConnection = {
  readonly id: string;
  readonly name: string;
  readonly kind: "direct" | "supplier" | "channel_manager" | "api";
  readonly status: "connected" | "pending" | "not_configured";
  readonly managedBy: "creator";
};

export type CreatorOpsView = {
  readonly platformName: string;
  readonly ownerId: string;
  readonly tagline: string;
  readonly rimvioRole: "os-only";
  readonly adminModules: readonly CreatorAdminModule[];
  readonly dashboardMetrics: readonly CreatorOpsMetric[];
  readonly suppliers: readonly CreatorSupplierConnection[];
  readonly paymentNote: string;
};

const HOTEL_ADMIN_MODULES: readonly CreatorAdminModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "▣",
    description: "Today's bookings, revenue, occupancy",
    relatedCapabilities: [],
  },
  {
    id: "hotels",
    label: "Hotels",
    icon: "⌂",
    description: "Property catalog — Creator-managed inventory",
    relatedCapabilities: ["hotel.search", "hotel.detail"],
    dataCollection: "hotels",
  },
  {
    id: "rooms",
    label: "Rooms",
    icon: "▦",
    description: "Room types and capacity",
    relatedCapabilities: ["room.availability"],
    dataCollection: "rooms",
  },
  {
    id: "rates",
    label: "Rates",
    icon: "₩",
    description: "Pricing rules and weekend surcharges",
    relatedCapabilities: ["hotel.search"],
    dataCollection: "rooms",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "◫",
    description: "Availability and sell-stop",
    relatedCapabilities: ["room.availability"],
    dataCollection: "rooms",
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: "☑",
    description: "Reservations, confirmations, cancellations",
    relatedCapabilities: ["booking.prepare", "booking.confirm", "booking.cancel"],
    dataCollection: "bookings",
  },
  {
    id: "customers",
    label: "Customers",
    icon: "◎",
    description: "Guest profiles and history",
    relatedCapabilities: ["booking.confirm"],
    dataCollection: "bookings",
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: "★",
    description: "Discounts and campaigns",
    relatedCapabilities: ["hotel.search"],
  },
  {
    id: "payments",
    label: "Payments",
    icon: "💳",
    description: "Creator-connected payment provider",
    relatedCapabilities: ["payment.prepare", "payment.commit"],
    dataCollection: "payments",
  },
  {
    id: "settlement",
    label: "Settlement",
    icon: "⇄",
    description: "Payouts and reconciliation",
    relatedCapabilities: ["payment.commit"],
    dataCollection: "payments",
  },
  {
    id: "support",
    label: "Support",
    icon: "✉",
    description: "Customer inquiries and refunds",
    relatedCapabilities: ["booking.cancel"],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "↗",
    description: "Occupancy, revenue, funnel",
    relatedCapabilities: [],
  },
];

function isHotelPlatform(draft: PlatformDraft): boolean {
  const names = draft.actions.map((a) => a.name).join(" ");
  return /hotel|booking|room\.availability/i.test(names) || draft.category === "travel";
}

function readDataCollectionNames(draft: PlatformDraft): string[] {
  try {
    const cols = JSON.parse(draft.dataCollectionsJson) as { name: string }[];
    return cols.map((c) => c.name);
  } catch {
    return [];
  }
}

export function buildCreatorOpsView(draft: PlatformDraft): CreatorOpsView {
  const ownerId = draft.operator?.name ?? draft.name;
  const hotel = isHotelPlatform(draft);
  const collections = readDataCollectionNames(draft);

  const adminModules = hotel
    ? HOTEL_ADMIN_MODULES.filter(
        (m) =>
          m.id === "dashboard" ||
          !m.dataCollection ||
          collections.includes(m.dataCollection) ||
          m.id === "promotions" ||
          m.id === "support" ||
          m.id === "analytics",
      )
    : [
        {
          id: "dashboard" as const,
          label: "Dashboard",
          icon: "▣",
          description: "Platform operations overview",
          relatedCapabilities: draft.actions.slice(0, 3).map((a) => a.name),
        },
      ];

  const dashboardMetrics: CreatorOpsMetric[] = hotel
    ? [
        { label: "Today's Bookings", value: "128", demo: true },
        { label: "Revenue", value: "₩12,430,000", demo: true },
        { label: "Occupancy", value: "82%", demo: true },
      ]
    : [{ label: "Active users", value: "—", demo: true }];

  const suppliers: CreatorSupplierConnection[] = hotel
    ? [
        {
          id: "direct",
          name: "Direct-contract hotels",
          kind: "direct",
          status: "connected",
          managedBy: "creator",
        },
        {
          id: "supplier",
          name: "External hotel supplier API",
          kind: "supplier",
          status: "pending",
          managedBy: "creator",
        },
        {
          id: "channel",
          name: "Channel manager",
          kind: "channel_manager",
          status: "not_configured",
          managedBy: "creator",
        },
      ]
    : [];

  return {
    platformName: draft.name,
    ownerId,
    tagline: draft.description || "Creator-operated platform",
    rimvioRole: "os-only",
    adminModules,
    dashboardMetrics,
    suppliers,
    paymentNote:
      "결제·환불·정산은 Creator가 연결한 Payment Provider를 통해 처리됩니다. Rimvio는 Capability 실행·권한·상태 인프라만 제공합니다.",
  };
}
