/**
 * Agent Platform Capability Catalog — 100 domain capabilities with runtime routing.
 * Runnable subset wired in runner-registry; others resolve as prepare-only stubs.
 */

import type { AgentPlatformCapabilityDef, CapabilityRuntimeKind } from "./types";

type DomainSeed = {
  readonly domain: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly category: string;
  readonly runtimeKind: CapabilityRuntimeKind;
  readonly caps: readonly {
    readonly id: string;
    readonly label: string;
    readonly tags: readonly string[];
    readonly keywords: readonly string[];
    readonly approvalRequired?: boolean;
    readonly runnable?: boolean;
    readonly routePath?: string;
  }[];
};

const DOMAIN_SEEDS: readonly DomainSeed[] = [
  {
    domain: "lodging",
    platformId: "platform.osakastay",
    platformName: "OsakaStay",
    category: "lodging",
    runtimeKind: "browser",
    caps: [
      { id: "hotel.search", label: "Hotel Search", tags: ["search", "lodging"], keywords: ["호텔", "숙소", "search", "hotel"], runnable: true, routePath: "/sandbox/osakastay" },
      { id: "hotel.detail", label: "Hotel Detail", tags: ["detail", "lodging"], keywords: ["상세", "detail", "room"], runnable: true },
      { id: "hotel.compare", label: "Hotel Compare", tags: ["compare"], keywords: ["비교", "compare"], runnable: true },
      { id: "hotel.filter", label: "Hotel Filter", tags: ["filter"], keywords: ["필터", "filter", "가격"], runnable: true },
      { id: "hotel.rank", label: "Hotel Rank", tags: ["rank"], keywords: ["순위", "rank", "가성비"], runnable: true },
      { id: "hotel.book.prepare", label: "Hotel Prepare", tags: ["booking"], keywords: ["예약", "prepare"], approvalRequired: true },
      { id: "hotel.book.commit", label: "Hotel Commit", tags: ["booking"], keywords: ["결제", "commit"], approvalRequired: true },
      { id: "hotel.availability", label: "Availability Check", tags: ["availability"], keywords: ["빈방", "availability"] },
      { id: "hotel.reviews", label: "Review Summary", tags: ["reviews"], keywords: ["리뷰", "review"] },
      { id: "hotel.nearby", label: "Nearby Hotels", tags: ["nearby"], keywords: ["주변", "nearby"], runnable: true },
    ],
  },
  {
    domain: "commerce",
    platformId: "platform.rimvio-shop",
    platformName: "Rimvio Shop",
    category: "e-commerce",
    runtimeKind: "browser",
    caps: [
      { id: "product.search", label: "Product Search", tags: ["search", "commerce"], keywords: ["상품", "product", "search", "macbook"], runnable: true, routePath: "/sandbox/shop" },
      { id: "product.detail", label: "Product Detail", tags: ["detail"], keywords: ["상세", "detail"] },
      { id: "product.compare", label: "Product Compare", tags: ["compare"], keywords: ["비교", "compare"] },
      { id: "cart.add", label: "Add to Cart", tags: ["cart"], keywords: ["장바구니", "cart"], approvalRequired: true },
      { id: "cart.checkout.prepare", label: "Checkout Prepare", tags: ["checkout"], keywords: ["결제", "checkout"], approvalRequired: true },
      { id: "order.track", label: "Order Track", tags: ["order"], keywords: ["배송", "track"] },
      { id: "inventory.check", label: "Inventory Check", tags: ["inventory"], keywords: ["재고", "inventory"] },
      { id: "price.watch", label: "Price Watch", tags: ["price"], keywords: ["가격", "price", "알림"] },
      { id: "market.search", label: "Market Search", tags: ["marketplace"], keywords: ["중고", "market", "search"] },
      { id: "market.create_listing", label: "Create Listing", tags: ["marketplace"], keywords: ["판매", "listing"], approvalRequired: true },
    ],
  },
  {
    domain: "travel",
    platformId: "platform.rimvio-travel",
    platformName: "Rimvio Travel",
    category: "travel",
    runtimeKind: "composite",
    caps: [
      { id: "trip.plan", label: "Trip Plan", tags: ["planning"], keywords: ["여행", "trip", "plan"], runnable: true },
      { id: "trip.destination.resolve", label: "Resolve Destination", tags: ["destination"], keywords: ["목적지", "destination"], runnable: true },
      { id: "trip.dates.resolve", label: "Resolve Dates", tags: ["dates"], keywords: ["날짜", "dates", "일정"], runnable: true },
      { id: "flight.search", label: "Flight Search", tags: ["flight"], keywords: ["항공", "flight"] },
      { id: "route.plan", label: "Route Plan", tags: ["route"], keywords: ["경로", "route"], runnable: true },
      { id: "transit.absorb", label: "Transit Absorb", tags: ["transit"], keywords: ["교통", "transit", "jr"], runnable: true },
      { id: "poi.discover", label: "POI Discover", tags: ["poi"], keywords: ["명소", "poi"], runnable: true },
      { id: "eatery.search", label: "Eatery Search", tags: ["eatery"], keywords: ["맛집", "eatery", "restaurant"], runnable: true },
      { id: "activity.search", label: "Activity Search", tags: ["activity"], keywords: ["액티비티", "activity"] },
      { id: "weather.forecast", label: "Weather Forecast", tags: ["weather"], keywords: ["날씨", "weather"] },
      { id: "visa.check", label: "Visa Check", tags: ["visa"], keywords: ["비자", "visa"] },
      { id: "budget.estimate", label: "Budget Estimate", tags: ["budget"], keywords: ["예산", "budget"] },
      { id: "itinerary.build", label: "Itinerary Build", tags: ["itinerary"], keywords: ["일정", "itinerary"], runnable: true },
      { id: "lodging.bundle", label: "Lodging Bundle", tags: ["bundle"], keywords: ["숙박", "bundle"] },
      { id: "travel.commit.prepare", label: "Travel Commit Prepare", tags: ["commit"], keywords: ["확정", "commit"], approvalRequired: true },
    ],
  },
  {
    domain: "workspace",
    platformId: "platform.rimvio-workspace",
    platformName: "Rimvio Workspace",
    category: "workspace",
    runtimeKind: "workspace",
    caps: [
      { id: "workspace.patch.apply", label: "Apply Workspace Patch", tags: ["patch"], keywords: ["patch", "workspace", "mutate"], runnable: true },
      { id: "workspace.entity.create", label: "Create Entity", tags: ["entity"], keywords: ["entity", "create"], runnable: true },
      { id: "workspace.entity.update", label: "Update Entity", tags: ["entity"], keywords: ["entity", "update"], runnable: true },
      { id: "workspace.entity.select", label: "Select Entity", tags: ["entity"], keywords: ["select", "choose"], runnable: true },
      { id: "workspace.entity.bookmark", label: "Bookmark Entity", tags: ["entity"], keywords: ["bookmark", "pin"], runnable: true },
      { id: "workspace.node.sort", label: "Sort Nodes", tags: ["sort"], keywords: ["sort", "rank"], runnable: true },
      { id: "workspace.node.filter", label: "Filter Nodes", tags: ["filter"], keywords: ["filter"], runnable: true },
      { id: "workspace.reality.prepare", label: "Reality Prepare", tags: ["reality"], keywords: ["reality", "prepare"], approvalRequired: true, runnable: true },
      { id: "workspace.reality.commit", label: "Reality Commit", tags: ["reality"], keywords: ["commit", "reality"], approvalRequired: true },
      { id: "workspace.snapshot.save", label: "Save Snapshot", tags: ["snapshot"], keywords: ["snapshot", "save"] },
      { id: "workspace.snapshot.restore", label: "Restore Snapshot", tags: ["snapshot"], keywords: ["restore", "resume"] },
      { id: "workspace.constraints.remember", label: "Remember Constraints", tags: ["constraints"], keywords: ["constraint", "preference"], runnable: true },
      { id: "workspace.anchor.set", label: "Set Anchor", tags: ["anchor"], keywords: ["anchor", "place"], runnable: true },
      { id: "workspace.network.absorb", label: "Network Absorb", tags: ["network"], keywords: ["network", "absorb", "jr"], runnable: true },
      { id: "workspace.projection.refresh", label: "Refresh Projection", tags: ["projection"], keywords: ["projection", "refresh"] },
      { id: "workspace.inspect", label: "Inspect Workspace", tags: ["inspect"], keywords: ["inspect", "read"], runnable: true },
      { id: "workspace.diff.preview", label: "Diff Preview", tags: ["diff"], keywords: ["diff", "preview"] },
      { id: "workspace.route.optimize", label: "Optimize Route", tags: ["route"], keywords: ["route", "optimize"] },
      { id: "workspace.focus.set", label: "Set Focus", tags: ["focus"], keywords: ["focus", "step"], runnable: true },
      { id: "workspace.clear.draft", label: "Clear Draft", tags: ["draft"], keywords: ["clear", "draft"], approvalRequired: true },
    ],
  },
  {
    domain: "graph",
    platformId: "platform.rimvio-graph",
    platformName: "Rimvio Graph",
    category: "graph",
    runtimeKind: "graph",
    caps: [
      { id: "graph.connect", label: "Connect Nodes", tags: ["graph"], keywords: ["connect", "edge", "graph"], runnable: true },
      { id: "graph.relation.near", label: "Near Relation", tags: ["near"], keywords: ["near", "주변"], runnable: true },
      { id: "graph.relation.route", label: "Route Relation", tags: ["route"], keywords: ["route", "path"], runnable: true },
      { id: "graph.relation.bookable", label: "Bookable Relation", tags: ["bookable"], keywords: ["bookable", "reserve"] },
      { id: "graph.node.add", label: "Add Node", tags: ["node"], keywords: ["node", "add"], runnable: true },
      { id: "graph.node.remove", label: "Remove Node", tags: ["node"], keywords: ["remove", "delete"], approvalRequired: true },
      { id: "graph.edge.weight", label: "Set Edge Weight", tags: ["edge"], keywords: ["weight", "score"] },
      { id: "graph.cluster.build", label: "Build Cluster", tags: ["cluster"], keywords: ["cluster", "group"] },
      { id: "graph.path.find", label: "Find Path", tags: ["path"], keywords: ["path", "find"] },
      { id: "graph.context.bind", label: "Bind Context", tags: ["context"], keywords: ["context", "bind"], runnable: true },
      { id: "graph.preference.link", label: "Link Preference", tags: ["preference"], keywords: ["preference", "link"] },
      { id: "graph.timeline.append", label: "Append Timeline", tags: ["timeline"], keywords: ["timeline", "event"] },
      { id: "graph.verify", label: "Verify Graph", tags: ["verify"], keywords: ["verify", "graph"] },
      { id: "graph.export", label: "Export Graph", tags: ["export"], keywords: ["export", "graph"] },
      { id: "graph.import", label: "Import Graph", tags: ["import"], keywords: ["import", "graph"], approvalRequired: true },
    ],
  },
  {
    domain: "api",
    platformId: "platform.rimvio-api",
    platformName: "Rimvio API",
    category: "api",
    runtimeKind: "api",
    caps: [
      { id: "api.http.get", label: "HTTP GET", tags: ["http"], keywords: ["get", "fetch", "api"], runnable: true },
      { id: "api.http.post", label: "HTTP POST", tags: ["http"], keywords: ["post", "api"], runnable: true, approvalRequired: true },
      { id: "api.http.put", label: "HTTP PUT", tags: ["http"], keywords: ["put", "api"], approvalRequired: true },
      { id: "api.http.delete", label: "HTTP DELETE", tags: ["http"], keywords: ["delete", "api"], approvalRequired: true },
      { id: "api.supabase.query", label: "Supabase Query", tags: ["supabase"], keywords: ["supabase", "query", "sql"], runnable: true },
      { id: "api.supabase.insert", label: "Supabase Insert", tags: ["supabase"], keywords: ["insert", "supabase"], approvalRequired: true },
      { id: "api.webhook.send", label: "Send Webhook", tags: ["webhook"], keywords: ["webhook", "notify"], approvalRequired: true },
      { id: "api.cache.read", label: "Cache Read", tags: ["cache"], keywords: ["cache", "read"] },
      { id: "api.cache.write", label: "Cache Write", tags: ["cache"], keywords: ["cache", "write"] },
      { id: "api.transform.json", label: "JSON Transform", tags: ["transform"], keywords: ["json", "transform"], runnable: true },
      { id: "api.validate.schema", label: "Validate Schema", tags: ["validate"], keywords: ["validate", "schema"], runnable: true },
      { id: "api.rate.limit", label: "Rate Limit Check", tags: ["rate"], keywords: ["rate", "limit"] },
      { id: "api.auth.token", label: "Auth Token", tags: ["auth"], keywords: ["token", "auth"], approvalRequired: true },
      { id: "api.graphql.query", label: "GraphQL Query", tags: ["graphql"], keywords: ["graphql", "query"] },
      { id: "api.batch.invoke", label: "Batch Invoke", tags: ["batch"], keywords: ["batch", "invoke"] },
    ],
  },
  {
    domain: "system",
    platformId: "platform.rimvio-agent",
    platformName: "Rimvio Agent",
    category: "system",
    runtimeKind: "composite",
    caps: [
      { id: "agent.verify", label: "Verify Output", tags: ["verify"], keywords: ["verify", "check"], runnable: true },
      { id: "agent.repair", label: "Repair Plan", tags: ["repair"], keywords: ["repair", "fix"], runnable: true },
      { id: "agent.plan", label: "Plan Turn", tags: ["plan"], keywords: ["plan", "operator"], runnable: true },
      { id: "agent.judge", label: "Judge Complexity", tags: ["judge"], keywords: ["judge", "complexity"] },
      { id: "capability.publish", label: "Publish Capability", tags: ["publish"], keywords: ["publish", "registry"], runnable: true, approvalRequired: true },
      { id: "capability.discover", label: "Discover Capabilities", tags: ["discover"], keywords: ["discover", "search"], runnable: true },
      { id: "capability.invoke", label: "Invoke Capability", tags: ["invoke"], keywords: ["invoke", "run"], runnable: true },
      { id: "execution.stop", label: "Stop Execution", tags: ["execution"], keywords: ["stop", "cancel"], runnable: true },
      { id: "execution.retry", label: "Retry Execution", tags: ["execution"], keywords: ["retry"], runnable: true },
      { id: "execution.resume", label: "Resume Execution", tags: ["execution"], keywords: ["resume", "계속"], runnable: true },
      { id: "goal.state.read", label: "Read Goal State", tags: ["goal"], keywords: ["goal", "state"], runnable: true },
      { id: "goal.state.sync", label: "Sync Goal State", tags: ["goal"], keywords: ["sync", "goal"], runnable: true },
      { id: "ledger.record", label: "Record Ledger", tags: ["ledger"], keywords: ["ledger", "record"] },
      { id: "sandbox.session.create", label: "Create Sandbox Session", tags: ["sandbox"], keywords: ["sandbox", "session"], runnable: true },
      { id: "payment.commit", label: "Payment Commit", tags: ["payment"], keywords: ["payment", "commit"], approvalRequired: true },
      { id: "approval.request", label: "Request Approval", tags: ["approval"], keywords: ["approval", "approve"], approvalRequired: true },
    ],
  },
];

function buildCatalog(): AgentPlatformCapabilityDef[] {
  const out: AgentPlatformCapabilityDef[] = [];
  for (const seed of DOMAIN_SEEDS) {
    for (const cap of seed.caps) {
      out.push({
        capabilityId: cap.id,
        label: cap.label,
        domain: seed.domain,
        runtimeKind: seed.runtimeKind,
        inputSchema: `${cap.id}.v1`,
        outputSchema: `${cap.id}_result.v1`,
        approvalRequired: cap.approvalRequired ?? false,
        category: seed.category,
        tags: cap.tags,
        keywords: cap.keywords,
        platformId: seed.platformId,
        platformName: seed.platformName,
        routePath: cap.routePath ?? "/",
        runnable: cap.runnable ?? false,
      });
    }
  }
  return out;
}

export const AGENT_PLATFORM_CATALOG: readonly AgentPlatformCapabilityDef[] = buildCatalog();

export function getCatalogCapability(capabilityId: string): AgentPlatformCapabilityDef | null {
  return AGENT_PLATFORM_CATALOG.find((c) => c.capabilityId === capabilityId) ?? null;
}

export function listCatalogByDomain(domain: string): readonly AgentPlatformCapabilityDef[] {
  return AGENT_PLATFORM_CATALOG.filter((c) => c.domain === domain);
}

export function listRunnableCapabilities(): readonly AgentPlatformCapabilityDef[] {
  return AGENT_PLATFORM_CATALOG.filter((c) => c.runnable);
}

export function resolveRuntimeKind(capabilityId: string): CapabilityRuntimeKind {
  const browserIds = new Set(["hotel.search", "hotel.detail", "product.search"]);
  if (browserIds.has(capabilityId)) return "browser";
  const def = getCatalogCapability(capabilityId);
  return def?.runtimeKind ?? "prepare-only";
}

export function catalogSize(): number {
  return AGENT_PLATFORM_CATALOG.length;
}
