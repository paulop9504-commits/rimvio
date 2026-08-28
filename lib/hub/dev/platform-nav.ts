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
  | "configuration";

export type HubDevNavItem = {
  readonly id: HubDevNavId;
  readonly label: string;
  readonly icon: string;
  readonly badge?: string;
  readonly section?: "platform" | "hub";
};

export const HUB_DEV_PLATFORM_NAV: readonly HubDevNavItem[] = [
  { id: "overview", label: "Overview", icon: "⌂", section: "platform" },
  { id: "ai-build", label: "AI Build", icon: "✦", section: "platform" },
  { id: "capabilities", label: "Capabilities", icon: "◇", section: "platform" },
  { id: "data", label: "Data", icon: "▣", section: "platform" },
  { id: "workflows", label: "Workflows", icon: "↗", section: "platform" },
  { id: "runtime", label: "Runtime", icon: "⚡", section: "platform" },
  { id: "permissions", label: "Permissions", icon: "🔐", section: "platform" },
  { id: "integrations", label: "Integrations", icon: "🔌", section: "platform" },
  { id: "commerce", label: "Commerce", icon: "💳", section: "platform" },
  { id: "logs", label: "Logs", icon: "◉", section: "platform" },
  { id: "tests", label: "Tests", icon: "🧪", section: "platform" },
  { id: "deployments", label: "Deployments", icon: "🚀", section: "platform" },
  { id: "versions", label: "Versions", icon: "v", section: "platform" },
];

export const HUB_DEV_HUB_NAV: readonly HubDevNavItem[] = [
  { id: "hub-discover", label: "Discover", icon: "◎", section: "hub" },
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
