/**
 * Intent Convergence Engine — schema.
 *
 * Before searching, the assistant converges an ambiguous request ("놀거리",
 * "카페", "데이트") into a concrete intent by asking the *fewest* questions.
 * This file holds the deterministic substrate:
 *   - which broad intents warrant convergence,
 *   - the ordered convergence axes per intent (priority ≈ information gain),
 *   - deterministic fallback chips (LLM authors nicer wording when available).
 *
 * The LLM never decides *what* to search — it only picks which axis to ask and
 * writes city-tailored choice copy. Resource resolution stays deterministic.
 */

export type ConvergenceIntentType = "activity" | "cafe" | "date" | "outing";

export type ConvergenceChip = {
  readonly id: string;
  readonly labelKo: string;
  /** Appended to the region to form a concrete place query. */
  readonly refinedQueryTail: string;
  readonly blurbKo?: string;
  /**
   * Related nodes this chip activates (trigger → cluster). Retrieval multi-queries
   * these + the region and merges, so "도파민" pulls 유니버설 + 주변 놀거리 as one
   * context instead of a single keyword. LLM may author richer nodes at runtime.
   */
  readonly nodeCluster?: readonly string[];
};

export type ConvergenceAxis = {
  readonly id: string;
  readonly labelKo: string;
  /** Higher = narrows the candidate set more → ask first. */
  readonly priority: number;
  readonly promptKo: string;
  readonly chips: readonly ConvergenceChip[];
};

export type ConvergenceIntentSchema = {
  readonly intent: ConvergenceIntentType;
  readonly axes: readonly ConvergenceAxis[];
};

/** Qualifiers that mean the user already narrowed → skip questions (high conf). */
const QUALIFIER_RE =
  /혼자|친구|연인|여자친구|남자친구|여친|남친|부모님|아이|가족|아기|커플|소개팅|비\s*올?\s*때|비\s*오는|비와도|실내|야외|노트북|작업|공부|스터디|조용한|힐링|감성|사진|인생샷|야경|로맨틱|가성비|저렴|고급|프리미엄|낮|저녁|밤|오전|오후|반나절|당일|하루|줄\s*안|웨이팅\s*없/u;

const ACTIVITY_ROOT =
  /놀거리|놀\s*거리|즐길\s*거리|즐길거리|가\s*볼\s*만한|가볼만한|관광|명소|볼거리|볼\s*거리|액티비티|놀\s*것|구경|나들이|things\s*to\s*do|attraction/iu;
const CAFE_ROOT = /카페|커피|coffee|cafe/iu;
const DATE_ROOT = /데이트|date\b/iu;
const OUTING_ROOT = /갈\s*만한\s*곳|갈만한\s*곳|어디\s*가지|어디\s*갈까|가볼\s*곳/iu;

const ACTIVITY_SCHEMA: ConvergenceIntentSchema = {
  intent: "activity",
  axes: [
    {
      id: "vibe",
      labelKo: "분위기",
      priority: 100,
      promptKo: "어떤 느낌이세요? 하나 골라주세요",
      chips: [
        { id: "thrill", labelKo: "🔥 도파민 터지는 액티비티", refinedQueryTail: "테마파크 놀이공원 액티비티", blurbKo: "신나는 체험·놀이공원", nodeCluster: ["테마파크", "놀이공원", "VR 체험", "방탈출", "포토스팟"] },
        { id: "photo", labelKo: "📷 인생샷", refinedQueryTail: "사진 명소 뷰포인트 전망대", blurbKo: "사진 찍기 좋은 곳", nodeCluster: ["사진 명소", "뷰포인트", "전망대", "랜드마크"] },
        { id: "night", labelKo: "🌃 야경", refinedQueryTail: "야경 명소 전망대 야시장", blurbKo: "밤에 예쁜 곳", nodeCluster: ["야경 명소", "전망대", "야시장", "루프탑 바"] },
        { id: "calm", labelKo: "🌿 조용한 힐링", refinedQueryTail: "공원 산책 힐링 명소", blurbKo: "여유롭게 걷기 좋은 곳", nodeCluster: ["공원", "산책로", "정원", "호수"] },
        { id: "shopping", labelKo: "🛍 쇼핑", refinedQueryTail: "쇼핑 아울렛 백화점", blurbKo: "쇼핑하기 좋은 곳", nodeCluster: ["쇼핑몰", "아울렛", "백화점", "상점가"] },
      ],
    },
    {
      id: "companion",
      labelKo: "동행",
      priority: 80,
      promptKo: "누구와 함께 가세요?",
      chips: [
        { id: "solo", labelKo: "혼자", refinedQueryTail: "혼자 가기 좋은 명소" },
        { id: "couple", labelKo: "연인과", refinedQueryTail: "데이트 명소" },
        { id: "family", labelKo: "가족·아이와", refinedQueryTail: "아이와 가족 나들이" },
        { id: "friends", labelKo: "친구와", refinedQueryTail: "친구와 놀기 좋은 곳" },
      ],
    },
    {
      id: "indoor",
      labelKo: "실내/날씨",
      priority: 60,
      promptKo: "실내가 좋을까요, 상관없을까요?",
      chips: [
        { id: "indoor", labelKo: "☔ 실내 (비 와도)", refinedQueryTail: "실내 관광 박물관 미술관" },
        { id: "any", labelKo: "상관없음", refinedQueryTail: "가볼만한 명소" },
      ],
    },
  ],
};

const CAFE_SCHEMA: ConvergenceIntentSchema = {
  intent: "cafe",
  axes: [
    {
      id: "situation",
      labelKo: "상황",
      priority: 100,
      promptKo: "어떤 상황이세요? 하나 골라주세요",
      chips: [
        { id: "work", labelKo: "💻 노트북 작업", refinedQueryTail: "노트북 작업 조용한 카페 콘센트", blurbKo: "콘센트·조용한 곳", nodeCluster: ["노트북 카페", "콘센트 카페", "조용한 카페", "스터디 카페"] },
        { id: "chat", labelKo: "🗣 수다 떨기", refinedQueryTail: "넓은 대화하기 좋은 카페", nodeCluster: ["넓은 카페", "브런치 카페", "디저트 카페"] },
        { id: "date", labelKo: "❤️ 데이트", refinedQueryTail: "감성 데이트 카페", nodeCluster: ["감성 카페", "분위기 좋은 카페", "루프탑 카페"] },
        { id: "parents", labelKo: "👵 부모님과", refinedQueryTail: "편안한 넓은 카페 주차", blurbKo: "편하고 넓은 곳", nodeCluster: ["넓은 카페", "주차 되는 카페", "전통 찻집"] },
        { id: "healing", labelKo: "🌿 혼자 힐링", refinedQueryTail: "조용한 뷰 좋은 카페", nodeCluster: ["조용한 카페", "뷰 좋은 카페", "정원 카페"] },
      ],
    },
    {
      id: "vibe",
      labelKo: "분위기",
      priority: 70,
      promptKo: "분위기는 어느 쪽이 좋으세요?",
      chips: [
        { id: "view", labelKo: "🌅 뷰 맛집", refinedQueryTail: "뷰 좋은 카페" },
        { id: "aesthetic", labelKo: "📸 감성", refinedQueryTail: "감성 인테리어 카페" },
        { id: "dessert", labelKo: "🍰 디저트", refinedQueryTail: "디저트 맛집 카페" },
        { id: "quiet", labelKo: "🔇 조용한", refinedQueryTail: "조용한 카페" },
      ],
    },
  ],
};

const DATE_SCHEMA: ConvergenceIntentSchema = {
  intent: "date",
  axes: [
    {
      id: "mood",
      labelKo: "데이트 분위기",
      priority: 100,
      promptKo: "데이트 분위기는 어떤 쪽이세요?",
      chips: [
        { id: "romantic", labelKo: "❤️ 로맨틱", refinedQueryTail: "로맨틱 데이트 명소", nodeCluster: ["로맨틱 레스토랑", "야경 명소", "루프탑 바"] },
        { id: "fun", labelKo: "😂 재밌는", refinedQueryTail: "재밌는 액티비티 데이트", nodeCluster: ["액티비티", "방탈출", "오락실", "테마파크"] },
        { id: "photo", labelKo: "📸 사진 많이", refinedQueryTail: "사진 명소 데이트 코스", nodeCluster: ["사진 명소", "포토스팟", "전망대"] },
        { id: "food", labelKo: "🍣 맛집 중심", refinedQueryTail: "데이트 맛집", nodeCluster: ["데이트 맛집", "분위기 좋은 레스토랑"] },
        { id: "shopping", labelKo: "🛍 쇼핑", refinedQueryTail: "쇼핑 데이트 코스", nodeCluster: ["쇼핑몰", "편집샵", "상점가"] },
      ],
    },
    {
      id: "budget",
      labelKo: "예산",
      priority: 65,
      promptKo: "예산은 어느 정도 생각하세요?",
      chips: [
        { id: "value", labelKo: "가성비", refinedQueryTail: "가성비 데이트 코스" },
        { id: "normal", labelKo: "보통", refinedQueryTail: "데이트 코스" },
        { id: "special", labelKo: "특별한 날", refinedQueryTail: "특별한 날 데이트 명소" },
      ],
    },
  ],
};

const OUTING_SCHEMA: ConvergenceIntentSchema = {
  intent: "outing",
  axes: [
    {
      id: "purpose",
      labelKo: "목적",
      priority: 100,
      promptKo: "무엇을 하고 싶으세요?",
      chips: [
        { id: "play", labelKo: "🔥 놀거리", refinedQueryTail: "가볼만한 명소 액티비티", nodeCluster: ["테마파크", "액티비티", "가볼만한 명소"] },
        { id: "food", labelKo: "🍜 먹거리", refinedQueryTail: "맛집", nodeCluster: ["맛집", "현지 맛집"] },
        { id: "cafe", labelKo: "☕ 카페", refinedQueryTail: "분위기 좋은 카페", nodeCluster: ["분위기 좋은 카페", "디저트 카페"] },
        { id: "healing", labelKo: "🌿 힐링", refinedQueryTail: "공원 산책 힐링 명소", nodeCluster: ["공원", "산책로", "힐링 명소"] },
        { id: "shopping", labelKo: "🛍 쇼핑", refinedQueryTail: "쇼핑 명소", nodeCluster: ["쇼핑몰", "상점가"] },
      ],
    },
    {
      id: "companion",
      labelKo: "동행",
      priority: 70,
      promptKo: "누구와 함께 가세요?",
      chips: [
        { id: "solo", labelKo: "혼자", refinedQueryTail: "혼자 가기 좋은 곳" },
        { id: "couple", labelKo: "연인과", refinedQueryTail: "데이트 명소" },
        { id: "family", labelKo: "가족과", refinedQueryTail: "가족 나들이" },
        { id: "friends", labelKo: "친구와", refinedQueryTail: "친구와 가기 좋은 곳" },
      ],
    },
  ],
};

const SCHEMA_BY_INTENT: Record<ConvergenceIntentType, ConvergenceIntentSchema> = {
  activity: ACTIVITY_SCHEMA,
  cafe: CAFE_SCHEMA,
  date: DATE_SCHEMA,
  outing: OUTING_SCHEMA,
};

export function convergenceSchemaFor(
  intent: ConvergenceIntentType,
): ConvergenceIntentSchema {
  return SCHEMA_BY_INTENT[intent];
}

/** True when the query already carries a narrowing qualifier (skip questions). */
export function hasConvergenceQualifier(text: string): boolean {
  return QUALIFIER_RE.test(text.trim());
}

/**
 * Which broad intent does a *bare* query target? Returns null when the query is
 * already specific (qualifier present) or not a convergence category — those go
 * straight to search.
 */
export function detectConvergenceIntent(
  text: string,
): ConvergenceIntentType | null {
  const trimmed = text.trim();
  if (!trimmed || hasConvergenceQualifier(trimmed)) {
    return null;
  }
  if (DATE_ROOT.test(trimmed)) {
    return "date";
  }
  if (CAFE_ROOT.test(trimmed)) {
    return "cafe";
  }
  if (ACTIVITY_ROOT.test(trimmed)) {
    return "activity";
  }
  if (OUTING_ROOT.test(trimmed)) {
    return "outing";
  }
  return null;
}
