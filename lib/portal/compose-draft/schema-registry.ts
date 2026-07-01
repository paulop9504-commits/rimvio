import { detectPortalIntentFromText } from "@/lib/portal/detect-portal-intent-from-text";
import type {
  ComposeDraftFieldDef,
  ComposeSchemaId,
} from "@/lib/portal/compose-draft/types";

export type ComposeSchemaDef = {
  id: ComposeSchemaId;
  labelKo: string;
  fields: readonly ComposeDraftFieldDef[];
};

const SELL_ITEM_FIELDS: readonly ComposeDraftFieldDef[] = [
  { id: "productName", labelKo: "물건", required: true, inputType: "text" },
  { id: "priceKrw", labelKo: "가격", required: true, inputType: "number" },
  { id: "condition", labelKo: "상태", required: false, inputType: "text" },
  { id: "placeLabel", labelKo: "거래 장소", required: false, inputType: "text" },
  { id: "note", labelKo: "메모", required: false, inputType: "textarea" },
] as const;

const COMPOSE_SCHEMAS: Record<ComposeSchemaId, ComposeSchemaDef> = {
  sell_item: {
    id: "sell_item",
    labelKo: "중고거래",
    fields: SELL_ITEM_FIELDS,
  },
  rent_property: {
    id: "rent_property",
    labelKo: "부동산",
    fields: [
      { id: "productName", labelKo: "매물", required: true, inputType: "text" },
      { id: "priceKrw", labelKo: "가격", required: true, inputType: "number" },
      { id: "placeLabel", labelKo: "위치", required: false, inputType: "text" },
      { id: "note", labelKo: "메모", required: false, inputType: "textarea" },
    ],
  },
  hire_job: {
    id: "hire_job",
    labelKo: "구인·구직",
    fields: [
      { id: "productName", labelKo: "제목", required: true, inputType: "text" },
      { id: "note", labelKo: "내용", required: false, inputType: "textarea" },
      { id: "placeLabel", labelKo: "근무지", required: false, inputType: "text" },
    ],
  },
  social_post: {
    id: "social_post",
    labelKo: "함께하기",
    fields: [
      { id: "productName", labelKo: "주제", required: true, inputType: "text" },
      { id: "placeLabel", labelKo: "장소", required: false, inputType: "text" },
      { id: "note", labelKo: "메모", required: false, inputType: "textarea" },
    ],
  },
};

export function getComposeSchema(id: ComposeSchemaId): ComposeSchemaDef {
  return COMPOSE_SCHEMAS[id];
}

const RENT_SIGNAL =
  /(?:부동산|월세|전세|반전세|원룸|투룸|오피스텔|아파트|빌라|방.{0,8}(?:놓|내놓|구|얻)|집.{0,8}(?:놓|내놓|구|얻)|임대|매매)/iu;
const HIRE_SIGNAL =
  /(?:구인|구직|채용|알바|인턴|사람\s*구|직원\s*구|구해요\s*직원)/iu;

/** First-message schema pick — registry-driven, not hardcoded if/else chains. */
export function detectComposeSchemaFromText(text: string): ComposeSchemaId | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (RENT_SIGNAL.test(trimmed)) {
    return "rent_property";
  }
  if (HIRE_SIGNAL.test(trimmed)) {
    return "hire_job";
  }

  const portal = detectPortalIntentFromText(trimmed);
  if (!portal) {
    return null;
  }
  if (portal.intentId === "together" || portal.intentId === "join") {
    return "social_post";
  }
  if (portal.categoryId === "used_goods") {
    return "sell_item";
  }
  return "sell_item";
}
