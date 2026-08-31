export type HubDevNavId =
  | "overview"
  | "ai-build"
  | "capabilities"
  | "data"
  | "workflows"
  | "runtime"
  | "permissions"
  | "integrations"
  | "commerce"
  | "logs"
  | "tests"
  | "deployments"
  | "versions"
  | "hub-discover"
  | "hub-published"
  | "compatibility"
  | "configuration"
  | "admin"
  | "operations"
  | "analytics";

export type HubDevNavItem = {
  readonly id: HubDevNavId;
  readonly label: string;
  readonly icon: string;
  readonly badge?: string;
  readonly section?: "build" | "ship" | "operate" | "connect" | "observe" | "hub";
};

/** Build → Preview → Deploy → Admin → Operations → Analytics (ADR-060) */
export const HUB_DEV_BUILD_NAV: readonly HubDevNavItem[] = [
  { id: "overview", label: "Overview", icon: "⌂", section: "build" },
  { id: "ai-build", label: "AI Build", icon: "✦", section: "build" },
  { id: "capabilities", label: "Capabilities", icon: "◇", section: "build" },
  { id: "data", label: "Data", icon: "▣", section: "build" },
  { id: "workflows", label: "Workflows", icon: "↗", section: "build" },
  { id: "configuration", label: "Configuration", icon: "⚙", section: "build" },
];

export const HUB_DEV_SHIP_NAV: readonly HubDevNavItem[] = [
  { id: "tests", label: "Tests", icon: "🧪", section: "ship" },
  { id: "deployments", label: "Deployments", icon: "🚀", section: "ship" },
  { id: "runtime", label: "Runtime", icon: "⚡", section: "ship" },
  { id: "versions", label: "Versions", icon: "v", section: "ship" },
];

/** Creator-operated business — NOT Rimvio Hub */
export const HUB_DEV_OPERATE_NAV: readonly HubDevNavItem[] = [
  { id: "admin", label: "Admin Console", icon: "▤", section: "operate" },
  { id: "operations", label: "Operations", icon: "☰", section: "operate" },
  { id: "analytics", label: "Analytics", icon: "↗", section: "operate" },
];

export const HUB_DEV_CONNECT_NAV: readonly HubDevNavItem[] = [
  { id: "integrations", label: "Integrations", icon: "🔌", section: "connect" },
  { id: "commerce", label: "Commerce", icon: "💳", section: "connect" },
  { id: "permissions", label: "Permissions", icon: "🔐", section: "connect" },
];

export const HUB_DEV_OBSERVE_NAV: readonly HubDevNavItem[] = [
  { id: "logs", label: "Logs", icon: "◉", section: "observe" },
];

/** @deprecated use section arrays — kept for imports */
export const HUB_DEV_PLATFORM_NAV: readonly HubDevNavItem[] = [
  ...HUB_DEV_BUILD_NAV,
  ...HUB_DEV_SHIP_NAV,
  ...HUB_DEV_OPERATE_NAV,
  ...HUB_DEV_CONNECT_NAV,
  ...HUB_DEV_OBSERVE_NAV,
];

export const HUB_DEV_HUB_NAV: readonly HubDevNavItem[] = [
  { id: "hub-discover", label: "Discover", icon: "◎", section: "hub" },
  { id: "compatibility", label: "Compatibility", icon: "⬡", section: "hub" },
  { id: "hub-published", label: "Published", icon: "✓", section: "hub" },
];

export type PlatformBlueprintView = {
  readonly name: string;
  readonly tagline: string;
  readonly capabilities: readonly string[];
  readonly dataModels: readonly string[];
  readonly workflows: readonly string[];
  readonly permissions: readonly string[];
  readonly contextFields: readonly string[];
  readonly runtime: string;
  readonly commerce: string;
};

export const AI_BUILD_EXAMPLE_PROMPTS = [
  "호텔 예약 플랫폼을 만들어줘. 난바역 주변 호텔 검색·예약·결제까지.",
  "동네 중고거래 플랫폼을 만들어줘.",
  "음식 배달 플랫폼을 만들어줘.",
  "사용자가 상품을 검색하고 구매할 수 있는 쇼핑몰을 만들어줘.",
] as const;
