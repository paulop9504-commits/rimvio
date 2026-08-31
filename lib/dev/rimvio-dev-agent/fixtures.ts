export type DevAgentPermission = "auto" | "approval";

export type DevAgentCapability = {
  id: string;
  label: string;
  description: string;
  permission: DevAgentPermission;
  inputs: { name: string; type: string }[];
  runtime: string;
  usedBy: string[];
};

export type DevAgentLoopStep = {
  capabilityId: string;
  permission?: DevAgentPermission;
};

export type DevAgentLoop = {
  id: string;
  label: string;
  steps: DevAgentLoopStep[];
};

export type DevAgentHotel = {
  id: string;
  name: string;
  stars: number;
  rating: number;
  reviews: number;
  location: string;
  nightlyKrw: number;
  imageHue: number;
};

export const DEV_AGENT_CAPABILITIES: DevAgentCapability[] = [
  {
    id: "product.search",
    label: "product.search",
    description: "Search products on Rimvio Shop",
    permission: "auto",
    inputs: [
      { name: "query", type: "string" },
      { name: "limit", type: "integer" },
    ],
    runtime: "Cloud Agent",
    usedBy: ["Product Search Demo"],
  },
  {
    id: "hotel.search",
    label: "hotel.search",
    description: "Search hotels",
    permission: "auto",
    inputs: [
      { name: "location", type: "string" },
      { name: "checkIn", type: "date" },
      { name: "checkOut", type: "date" },
      { name: "guests", type: "integer" },
    ],
    runtime: "Cloud Agent",
    usedBy: ["Hotel Search Loop"],
  },
  {
    id: "hotel.detail",
    label: "hotel.detail",
    description: "Get hotel details",
    permission: "auto",
    inputs: [{ name: "hotelId", type: "string" }],
    runtime: "Cloud Agent",
    usedBy: ["Hotel Search Loop", "Booking Loop"],
  },
  {
    id: "room.availability",
    label: "room.availability",
    description: "Check room availability",
    permission: "auto",
    inputs: [{ name: "hotelId", type: "string" }, { name: "dates", type: "range" }],
    runtime: "Cloud Agent",
    usedBy: ["Booking Loop"],
  },
  {
    id: "booking.prepare",
    label: "booking.prepare",
    description: "Prepare booking",
    permission: "auto",
    inputs: [{ name: "roomId", type: "string" }],
    runtime: "Cloud Agent",
    usedBy: ["Booking Loop"],
  },
  {
    id: "booking.confirm",
    label: "booking.confirm",
    description: "Confirm booking",
    permission: "approval",
    inputs: [{ name: "bookingId", type: "string" }],
    runtime: "Cloud Agent",
    usedBy: ["Booking Loop"],
  },
  {
    id: "payment.prepare",
    label: "payment.prepare",
    description: "Prepare payment",
    permission: "auto",
    inputs: [{ name: "amountKrw", type: "integer" }],
    runtime: "Cloud Agent",
    usedBy: ["Payment Loop"],
  },
  {
    id: "payment.commit",
    label: "payment.commit",
    description: "Commit payment",
    permission: "approval",
    inputs: [{ name: "paymentId", type: "string" }],
    runtime: "Cloud Agent",
    usedBy: ["Payment Loop"],
  },
  {
    id: "payment.cancel",
    label: "payment.cancel",
    description: "Cancel payment",
    permission: "auto",
    inputs: [{ name: "paymentId", type: "string" }],
    runtime: "Cloud Agent",
    usedBy: ["Payment Loop"],
  },
];

export const DEV_AGENT_LOOPS: DevAgentLoop[] = [
  {
    id: "hotel-search",
    label: "Hotel Search Loop",
    steps: [
      { capabilityId: "hotel.search" },
      { capabilityId: "hotel.detail" },
    ],
  },
  {
    id: "booking",
    label: "Booking Loop",
    steps: [
      { capabilityId: "room.availability" },
      { capabilityId: "booking.prepare" },
      { capabilityId: "booking.confirm", permission: "approval" },
    ],
  },
  {
    id: "payment",
    label: "Payment Loop",
    steps: [
      { capabilityId: "payment.prepare" },
      { capabilityId: "payment.commit", permission: "approval" },
      { capabilityId: "payment.cancel" },
    ],
  },
];

export const DEV_AGENT_SOURCES = [
  { id: "github", label: "GitHub Repository", ok: true },
  { id: "openapi", label: "OpenAPI (oas.yaml)", ok: true },
  { id: "db", label: "Database (schema.sql)", ok: true },
] as const;

export const OSAKASTAY_HOTELS: DevAgentHotel[] = [
  {
    id: "grand-osaka",
    name: "호텔 그랜드 오사카",
    stars: 5,
    rating: 4.8,
    reviews: 672,
    location: "난바 · 오사카",
    nightlyKrw: 250_000,
    imageHue: 220,
  },
  {
    id: "swiss-nankai",
    name: "스위소텔 난카이 오사카",
    stars: 5,
    rating: 4.7,
    reviews: 891,
    location: "난바역 · 오사카",
    nightlyKrw: 320_000,
    imageHue: 260,
  },
  {
    id: "nikko-osaka",
    name: "호텔 닛코 오사카",
    stars: 4,
    rating: 4.5,
    reviews: 445,
    location: "우메다 · 오사카",
    nightlyKrw: 180_000,
    imageHue: 190,
  },
  {
    id: "cross-osaka",
    name: "크로스 호텔 오사카",
    stars: 4,
    rating: 4.4,
    reviews: 334,
    location: "도톤보리 · 오사카",
    nightlyKrw: 150_000,
    imageHue: 300,
  },
];

export const CHAT_SUGGESTIONS = [
  "오사카 난바에서 2박 호텔 찾아줘",
  "hotel.search 테스트해줘",
  "전체 booking loop 실행해줘",
  "payment.commit은 승인 전에서 멈춰",
] as const;

export const DEMO_HOTEL_SEARCH_CONSOLE = [
  { time: "10:31:02", text: "Agent started · hotel.search", tone: "default" as const },
  { time: "10:31:02", text: "Intent recognized · hotel.search", tone: "default" as const },
  { time: "10:31:03", text: "Opened website · /sandbox/osakastay", tone: "default" as const },
  { time: "10:31:03", text: "Typing · 오사카, 일본", tone: "default" as const },
  { time: "10:31:04", text: "Click · search button", tone: "default" as const },
  { time: "10:31:04", text: "API Call · GET /api/sandbox/osakastay/hotels 200 220ms", tone: "success" as const },
  { time: "10:31:05", text: "Extracted · 8 hotels", tone: "success" as const },
  { time: "10:31:05", text: "Execution completed in 1.23s", tone: "success" as const },
];

export const DEMO_HOTEL_SEARCH_NETWORK = [
  { method: "GET", path: "/sandbox/osakastay", status: 200, ms: 180 },
  { method: "GET", path: "/api/sandbox/osakastay/hotels", status: 200, ms: 220 },
] as const;

export const DEMO_HOTEL_SEARCH_METRICS = {
  responseMs: 1.23,
  apiCalls: 3,
  successRate: 100,
  tokens: 2847,
  actions: 8,
};
