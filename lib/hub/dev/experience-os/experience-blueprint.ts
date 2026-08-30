/**
 * Idea → Experience Blueprint. Templates refine; NL mutates the same model.
 */

export type ExperienceTemplateId =
  | "booking"
  | "commerce"
  | "marketplace"
  | "saas"
  | "community"
  | "travel"
  | "dashboard";

export type ExperienceBlueprintNode = {
  readonly id: string;
  readonly label: string;
  readonly kind: "experience" | "page" | "data" | "capability" | "infra";
  readonly dependsOn: readonly string[];
  readonly status: "planned" | "ready";
};

export type ExperienceBlueprint = {
  readonly templateId: ExperienceTemplateId;
  readonly title: string;
  readonly titleKo: string;
  readonly pages: readonly string[];
  readonly data: readonly string[];
  readonly capabilities: readonly string[];
  readonly nodes: readonly ExperienceBlueprintNode[];
};

const TEMPLATES: Record<ExperienceTemplateId, Omit<ExperienceBlueprint, "nodes">> = {
  booking: {
    templateId: "booking",
    title: "Booking",
    titleKo: "예약 플랫폼",
    pages: ["Home", "Search", "Detail", "Checkout", "Orders", "Account"],
    data: ["users", "listings", "bookings", "payments"],
    capabilities: ["auth.signup", "listing.search", "booking.prepare", "booking.confirm", "payment.prepare", "payment.commit"],
  },
  commerce: {
    templateId: "commerce",
    title: "Commerce",
    titleKo: "쇼핑몰",
    pages: ["Home", "Products", "Product Detail", "Cart", "Checkout", "Orders", "Account"],
    data: ["users", "products", "categories", "orders", "reviews"],
    capabilities: ["auth.signup", "product.search", "cart.update", "payment.prepare", "payment.commit", "order.list"],
  },
  marketplace: {
    templateId: "marketplace",
    title: "Marketplace",
    titleKo: "거래 마켓",
    pages: ["Home", "Listings", "Listing Detail", "Sell", "Chat", "Orders", "Account"],
    data: ["users", "listings", "offers", "orders", "messages"],
    capabilities: ["auth.signup", "listing.create", "listing.search", "offer.create", "payment.commit"],
  },
  saas: {
    templateId: "saas",
    title: "SaaS",
    titleKo: "팀 SaaS",
    pages: ["Home", "Signup", "Projects", "Project", "Settings", "Billing"],
    data: ["users", "teams", "projects", "memberships"],
    capabilities: ["auth.signup", "team.create", "project.create", "billing.prepare"],
  },
  community: {
    templateId: "community",
    title: "Community",
    titleKo: "커뮤니티",
    pages: ["Home", "Feed", "Post", "Comments", "Profile"],
    data: ["users", "posts", "comments"],
    capabilities: ["auth.signup", "post.create", "comment.create", "feed.read"],
  },
  travel: {
    templateId: "travel",
    title: "Travel",
    titleKo: "여행 예약",
    pages: ["Home", "Search", "Stay", "Itinerary", "Checkout", "Account"],
    data: ["users", "hotels", "rooms", "bookings", "payments"],
    capabilities: ["hotel.search", "hotel.detail", "booking.prepare", "booking.confirm", "payment.commit"],
  },
  dashboard: {
    templateId: "dashboard",
    title: "Dashboard",
    titleKo: "운영 대시보드",
    pages: ["Overview", "Metrics", "Users", "Settings"],
    data: ["users", "events", "metrics"],
    capabilities: ["auth.signup", "metrics.read", "user.list"],
  },
};

function toNodes(base: Omit<ExperienceBlueprint, "nodes">): ExperienceBlueprintNode[] {
  const nodes: ExperienceBlueprintNode[] = [
    { id: "root", label: base.title, kind: "experience", dependsOn: [], status: "planned" },
  ];
  for (const page of base.pages) {
    nodes.push({
      id: `page:${page}`,
      label: page,
      kind: "page",
      dependsOn: ["root"],
      status: "planned",
    });
  }
  for (const table of base.data) {
    nodes.push({
      id: `data:${table}`,
      label: table,
      kind: "data",
      dependsOn: ["root"],
      status: "planned",
    });
  }
  for (const cap of base.capabilities) {
    const dataDep = base.data[0] ? `data:${base.data[0]}` : "root";
    nodes.push({
      id: `cap:${cap}`,
      label: cap,
      kind: "capability",
      dependsOn: [dataDep],
      status: "planned",
    });
  }
  return nodes;
}

export function listExperienceTemplates(): readonly ExperienceTemplateId[] {
  return Object.keys(TEMPLATES) as ExperienceTemplateId[];
}

export function experienceBlueprintFromTemplate(id: ExperienceTemplateId): ExperienceBlueprint {
  const base = TEMPLATES[id];
  return { ...base, nodes: toNodes(base) };
}

export function experienceTemplateFromUtterance(utterance: string): ExperienceTemplateId {
  const t = utterance.toLowerCase();
  if (/호텔|hotel|여행|travel|예약|booking/.test(t)) return /쇼핑|shop/.test(t) ? "commerce" : /여행|travel/.test(t) ? "travel" : "booking";
  if (/중고|마켓|marketplace|거래/.test(t)) return "marketplace";
  if (/쇼핑|shop|commerce|mall|상품/.test(t)) return "commerce";
  if (/saas|팀|프로젝트 관리/.test(t)) return "saas";
  if (/커뮤니티|community|게시/.test(t)) return "community";
  if (/대시보드|dashboard|운영/.test(t)) return "dashboard";
  return "booking";
}

export function experienceBlueprintFromUtterance(utterance: string): ExperienceBlueprint {
  return experienceBlueprintFromTemplate(experienceTemplateFromUtterance(utterance));
}

export function refineExperienceBlueprint(
  current: ExperienceBlueprint,
  utterance: string,
): ExperienceBlueprint {
  const next = experienceBlueprintFromUtterance(utterance);
  if (next.templateId === current.templateId && !/바꿔|대신|말고/.test(utterance)) {
    return current;
  }
  return next;
}
