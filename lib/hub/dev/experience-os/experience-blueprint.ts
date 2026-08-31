/**
 * Idea → Experience Blueprint. Templates refine; NL mutates the same model.
 */

export type ExperienceTemplateId =
  | "website"
  | "booking"
  | "commerce"
  | "marketplace"
  | "saas"
  | "community"
  | "social"
  | "travel"
  | "restaurant"
  | "education"
  | "dashboard"
  | "portfolio";

export type ExperienceBlueprintNode = {
  readonly id: string;
  readonly label: string;
  readonly kind: "experience" | "page" | "data" | "capability" | "infra";
  readonly dependsOn: readonly string[];
  readonly status: "planned" | "ready";
  readonly description?: string;
};

export type ExperienceBlueprint = {
  readonly templateId: ExperienceTemplateId;
  readonly title: string;
  readonly titleKo: string;
  readonly pages: readonly string[];
  readonly data: readonly string[];
  readonly capabilities: readonly string[];
  readonly nodes: readonly ExperienceBlueprintNode[];
  readonly domainHint?: string;
};

const TEMPLATES: Record<ExperienceTemplateId, Omit<ExperienceBlueprint, "nodes">> = {
  website: {
    templateId: "website",
    title: "Website",
    titleKo: "웹사이트",
    pages: ["Home", "About", "Services", "Contact"],
    data: ["users", "pages", "inquiries"],
    capabilities: ["page.read", "inquiry.create", "auth.signup"],
  },
  booking: {
    templateId: "booking",
    title: "Booking",
    titleKo: "예약 플랫폼",
    pages: ["Home", "Search", "Detail", "Checkout", "Orders", "Account"],
    data: ["users", "listings", "bookings", "payments"],
    capabilities: [
      "auth.signup",
      "listing.search",
      "booking.prepare",
      "booking.confirm",
      "payment.prepare",
      "payment.commit",
    ],
  },
  commerce: {
    templateId: "commerce",
    title: "Commerce",
    titleKo: "쇼핑몰",
    pages: ["Home", "Products", "Product Detail", "Cart", "Checkout", "Orders", "Account"],
    data: ["users", "products", "categories", "orders", "reviews"],
    capabilities: [
      "auth.signup",
      "product.search",
      "cart.update",
      "payment.prepare",
      "payment.commit",
      "order.list",
    ],
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
  social: {
    templateId: "social",
    title: "Social",
    titleKo: "소셜",
    pages: ["Home", "Feed", "Profile", "Messages", "Notifications"],
    data: ["users", "posts", "follows", "messages"],
    capabilities: ["auth.signup", "post.create", "follow.create", "message.send"],
  },
  travel: {
    templateId: "travel",
    title: "Travel",
    titleKo: "여행 예약",
    pages: ["Home", "Search", "Stay", "Itinerary", "Checkout", "Account"],
    data: ["users", "hotels", "rooms", "bookings", "payments"],
    capabilities: ["hotel.search", "hotel.detail", "booking.prepare", "booking.confirm", "payment.commit"],
  },
  restaurant: {
    templateId: "restaurant",
    title: "Restaurant",
    titleKo: "배달 · 식당",
    pages: ["Home", "Menu", "Cart", "Checkout", "Orders", "Kitchen"],
    data: ["users", "restaurants", "menus", "orders", "deliveries"],
    capabilities: [
      "auth.signup",
      "menu.list",
      "menu.create",
      "order.create",
      "payment.commit",
      "delivery.track",
    ],
  },
  education: {
    templateId: "education",
    title: "Education",
    titleKo: "교육",
    pages: ["Home", "Courses", "Lesson", "Assignments", "Account"],
    data: ["users", "courses", "lessons", "enrollments"],
    capabilities: ["auth.signup", "course.list", "lesson.read", "enrollment.create"],
  },
  dashboard: {
    templateId: "dashboard",
    title: "Dashboard",
    titleKo: "운영 대시보드",
    pages: ["Overview", "Metrics", "Users", "Settings"],
    data: ["users", "events", "metrics"],
    capabilities: ["auth.signup", "metrics.read", "user.list"],
  },
  portfolio: {
    templateId: "portfolio",
    title: "Portfolio",
    titleKo: "포트폴리오",
    pages: ["Home", "Work", "About", "Contact"],
    data: ["users", "projects", "inquiries"],
    capabilities: ["page.read", "project.list", "inquiry.create"],
  },
};

function toNodes(base: Omit<ExperienceBlueprint, "nodes">): ExperienceBlueprintNode[] {
  const nodes: ExperienceBlueprintNode[] = [
    {
      id: "root",
      label: base.title,
      kind: "experience",
      dependsOn: [],
      status: "planned",
      description: base.titleKo,
    },
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
  nodes.push({
    id: "infra:runtime",
    label: "Runtime",
    kind: "infra",
    dependsOn: ["root"],
    status: "planned",
  });
  nodes.push({
    id: "infra:storage",
    label: "Storage",
    kind: "infra",
    dependsOn: base.data[0] ? [`data:${base.data[0]}`] : ["root"],
    status: "planned",
  });
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
  if (/포트폴리오|portfolio/.test(t)) return "portfolio";
  if (/교육|강의|코스|lesson|education/.test(t)) return "education";
  if (/배달|음식점|레스토랑|restaurant|메뉴 등록/.test(t)) return "restaurant";
  if (/소셜|sns|팔로우|피드 앱/.test(t) && !/커뮤니티|community/.test(t)) return "social";
  if (/웹사이트|랜딩|homepage|portfolio site/.test(t) && !/플랫폼|platform|쇼핑몰/.test(t)) {
    return "website";
  }
  if (/호텔|hotel|여행|travel|예약|booking/.test(t)) {
    if (/쇼핑|shop/.test(t)) return "commerce";
    if (/여행|travel/.test(t)) return "travel";
    return "booking";
  }
  if (/중고|마켓|marketplace|거래|카메라/.test(t)) return "marketplace";
  if (/쇼핑|shop|commerce|mall|상품|쇼핑몰/.test(t)) return "commerce";
  if (/saas|팀|프로젝트 관리/.test(t)) return "saas";
  if (/커뮤니티|community|게시/.test(t)) return "community";
  if (/대시보드|dashboard|운영/.test(t)) return "dashboard";
  return "booking";
}

function domainHintFromUtterance(utterance: string): string | undefined {
  const camera = utterance.match(/중고\s*카메라|카메라/);
  if (camera) return "used cameras";
  const clothes = utterance.match(/의류|옷|패션/);
  if (clothes) return "apparel";
  const food = utterance.match(/음식|배달|치킨|한식/);
  if (food) return "food delivery";
  return undefined;
}

export function experienceBlueprintFromUtterance(utterance: string): ExperienceBlueprint {
  const base = experienceBlueprintFromTemplate(experienceTemplateFromUtterance(utterance));
  const hint = domainHintFromUtterance(utterance);
  if (!hint) return base;
  return applyDomainHint(base, hint, utterance);
}

function applyDomainHint(
  current: ExperienceBlueprint,
  hint: string,
  utterance: string,
): ExperienceBlueprint {
  if (hint === "used cameras") {
    const data = current.data.map((d) => (d === "products" ? "cameras" : d));
    const pages = current.pages.map((p) => (p === "Products" ? "Cameras" : p));
    const next = {
      ...current,
      titleKo: "중고 카메라 거래",
      title: "Used Camera Market",
      domainHint: hint,
      data,
      pages,
    };
    return { ...next, nodes: toNodes(next) };
  }
  if (hint === "food delivery" && current.templateId !== "restaurant") {
    return experienceBlueprintFromTemplate("restaurant");
  }
  if (/의류 대신|말고/.test(utterance) && /카메라/.test(utterance)) {
    return applyDomainHint({ ...current, templateId: "marketplace" }, "used cameras", utterance);
  }
  return { ...current, domainHint: hint };
}

export function refineExperienceBlueprint(
  current: ExperienceBlueprint,
  utterance: string,
): ExperienceBlueprint {
  const switched = experienceBlueprintFromUtterance(utterance);
  if (/바꿔|대신|말고|바꿔줘/.test(utterance)) {
    return switched.templateId === current.templateId
      ? applyDomainHint(current, domainHintFromUtterance(utterance) ?? current.domainHint ?? "", utterance)
      : switched;
  }
  if (switched.templateId !== current.templateId) {
    return switched;
  }
  const extraCaps: string[] = [];
  if (/결제|payment/.test(utterance) && !current.capabilities.some((c) => c.startsWith("payment"))) {
    extraCaps.push("payment.prepare", "payment.commit");
  }
  if (/검색|search/.test(utterance) && !current.capabilities.some((c) => c.includes("search"))) {
    extraCaps.push(`${current.data[1] ?? "listing"}.search`);
  }
  if (/메뉴/.test(utterance) && !current.capabilities.includes("menu.create")) {
    extraCaps.push("menu.create");
  }
  if (extraCaps.length === 0) return current;
  const capabilities = [...current.capabilities, ...extraCaps];
  const next = { ...current, capabilities };
  return { ...next, nodes: toNodes(next) };
}
