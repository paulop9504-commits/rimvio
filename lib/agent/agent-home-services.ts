import {
  Laptop,
  Palmtree,
  UtensilsCrossed,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { BedDouble, PenLine, Plane, ShoppingBag } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";

export type AgentHomeServiceCard = {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly seed: string;
  readonly icon: LucideIcon;
  readonly thumbClass: string;
  readonly iconClass: string;
};

export const AGENT_HOME_RECOMMENDED_SERVICES: readonly AgentHomeServiceCard[] = [
  {
    id: "osaka-travel",
    title: copy.globe.agentHomeServiceOsakaTravel,
    category: copy.globe.agentHomeServiceCategoryTravel,
    seed: copy.globe.agentHomeTaskTravelSeed,
    icon: Plane,
    thumbClass: "from-[#c4b5fd] via-[#a78bfa] to-[#818cf8]",
    iconClass: "bg-white/90 text-[#6366f1]",
  },
  {
    id: "namba-hotel",
    title: copy.globe.agentHomeServiceNambaHotel,
    category: copy.globe.agentHomeServiceCategoryLodging,
    seed: "난바역 근처 호텔 예약해줘",
    icon: BedDouble,
    thumbClass: "from-[#fde68a] via-[#fcd34d] to-[#fbbf24]",
    iconClass: "bg-white/90 text-[#d97706]",
  },
  {
    id: "shopping",
    title: copy.globe.agentHomeServiceShopping,
    category: copy.globe.agentHomeServiceCategoryCommerce,
    seed: copy.globe.agentHomeTaskShoppingSeed,
    icon: ShoppingBag,
    thumbClass: "from-[#fbcfe8] via-[#f9a8d4] to-[#f472b6]",
    iconClass: "bg-white/90 text-[#db2777]",
  },
  {
    id: "blog",
    title: copy.globe.agentHomeServiceBlog,
    category: copy.globe.agentHomeServiceCategoryContent,
    seed: "여행 블로그 초안 써줘",
    icon: PenLine,
    thumbClass: "from-[#bfdbfe] via-[#93c5fd] to-[#60a5fa]",
    iconClass: "bg-white/90 text-[#2563eb]",
  },
];

export type AgentHomeActionPill = {
  readonly id: string;
  readonly label: string;
  readonly seed: string;
  readonly icon: LucideIcon;
};

export const AGENT_HOME_ACTION_PILLS: readonly AgentHomeActionPill[] = [
  {
    id: "hungry",
    label: copy.globe.agentHomeExampleHungry,
    seed: copy.globe.agentHomeExampleHungrySeed,
    icon: UtensilsCrossed,
  },
  {
    id: "daejeon",
    label: copy.globe.agentHomeExampleDaejeon,
    seed: copy.globe.agentHomeExampleDaejeonSeed,
    icon: Utensils,
  },
  {
    id: "jeju",
    label: copy.globe.agentHomeExampleJeju,
    seed: copy.globe.agentHomeExampleJejuSeed,
    icon: Palmtree,
  },
  {
    id: "macbook",
    label: copy.globe.agentHomeExampleMacbook,
    seed: copy.globe.agentHomeExampleMacbookSeed,
    icon: Laptop,
  },
];
