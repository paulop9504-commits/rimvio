import type { PortalCategoryId } from "@/lib/portal/portal-types";

export type PortalCategorySlotMeta = {
  id: PortalCategoryId;
  emoji: string;
  /** Tailwind gradient stops — soft card background */
  cardClass: string;
  ringClass: string;
};

export const PORTAL_CATEGORY_SLOT_META: Record<PortalCategoryId, PortalCategorySlotMeta> = {
  used_goods: {
    id: "used_goods",
    emoji: "♻️",
    cardClass: "from-[#e8f3ff] via-[#f4f9ff] to-white",
    ringClass: "ring-[#3182f6]/12",
  },
  talent: {
    id: "talent",
    emoji: "✨",
    cardClass: "from-[#f3eeff] via-[#faf7ff] to-white",
    ringClass: "ring-[#8b5cf6]/12",
  },
  job: {
    id: "job",
    emoji: "💼",
    cardClass: "from-[#fff4e6] via-[#fffaf2] to-white",
    ringClass: "ring-[#f59e0b]/12",
  },
  real_estate: {
    id: "real_estate",
    emoji: "🏠",
    cardClass: "from-[#e9f7ef] via-[#f6fcf8] to-white",
    ringClass: "ring-[#22c55e]/12",
  },
  ticket: {
    id: "ticket",
    emoji: "🎫",
    cardClass: "from-[#ffeef3] via-[#fff6f9] to-white",
    ringClass: "ring-[#ec4899]/12",
  },
  service: {
    id: "service",
    emoji: "🛠️",
    cardClass: "from-[#eef6ff] via-[#f7fbff] to-white",
    ringClass: "ring-[#0ea5e9]/12",
  },
  home: {
    id: "home",
    emoji: "🔑",
    cardClass: "from-[#f0fdf4] via-[#f8fef9] to-white",
    ringClass: "ring-[#16a34a]/12",
  },
  info: {
    id: "info",
    emoji: "💡",
    cardClass: "from-[#f5f5f5] via-[#fafafa] to-white",
    ringClass: "ring-black/[0.06]",
  },
  companion: {
    id: "companion",
    emoji: "🧭",
    cardClass: "from-[#e0f7fa] via-[#f0fbfd] to-white",
    ringClass: "ring-[#06b6d4]/12",
  },
  sport: {
    id: "sport",
    emoji: "⚽",
    cardClass: "from-[#fff7ed] via-[#fffcf5] to-white",
    ringClass: "ring-[#fb923c]/12",
  },
  study: {
    id: "study",
    emoji: "📚",
    cardClass: "from-[#ede9fe] via-[#f8f6ff] to-white",
    ringClass: "ring-[#7c3aed]/12",
  },
  project: {
    id: "project",
    emoji: "🚀",
    cardClass: "from-[#e0e7ff] via-[#f3f5ff] to-white",
    ringClass: "ring-[#6366f1]/12",
  },
  meetup: {
    id: "meetup",
    emoji: "🤝",
    cardClass: "from-[#fce7f3] via-[#fef5f9] to-white",
    ringClass: "ring-[#db2777]/12",
  },
  event: {
    id: "event",
    emoji: "🎉",
    cardClass: "from-[#fef3c7] via-[#fffbeb] to-white",
    ringClass: "ring-[#eab308]/12",
  },
};

export function portalCategorySlotMeta(
  categoryId: PortalCategoryId,
): PortalCategorySlotMeta {
  return PORTAL_CATEGORY_SLOT_META[categoryId];
}
