/**
 * User-facing infrastructure catalog — SSOT from Experience Resource ops + Hub tools.
 * Agent must not invent capabilities outside this list.
 */

import type { ExperienceResourceOp } from "@/lib/hub/dev/experience-os/types";
import type { HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";

export type InfrastructureCategoryId =
  | "data"
  | "auth"
  | "storage"
  | "backend"
  | "connect"
  | "test"
  | "runtime"
  | "publish";

export type InfrastructureAvailability = "available" | "partial";

export type InfrastructureCategory = {
  readonly id: InfrastructureCategoryId;
  readonly emoji: string;
  readonly labelKo: string;
  readonly purposeKo: string;
  readonly availability: InfrastructureAvailability;
  readonly resourceOps: readonly ExperienceResourceOp[];
  readonly hubTools: readonly (HubWorkspaceToolId | "publish.request")[];
  readonly exampleSeed: string;
};

export const RIMVIO_INFRASTRUCTURE_CATALOG: readonly InfrastructureCategory[] = [
  {
    id: "data",
    emoji: "🗄",
    labelKo: "데이터",
    purposeKo: "사용자, 상품, 주문, 예약 등의 데이터를 저장하고 관리",
    availability: "available",
    resourceOps: ["database.createTable", "database.listTables", "database.updateSchema"],
    hubTools: ["schema.read", "schema.update"],
    exampleSeed: "주문 데이터 테이블 만들어줘",
  },
  {
    id: "auth",
    emoji: "👤",
    labelKo: "회원",
    purposeKo: "회원가입, 로그인, 판매자·구매자 같은 권한 관리",
    availability: "available",
    resourceOps: ["auth.createRole", "auth.listRoles", "auth.listProviders", "auth.updateProvider"],
    hubTools: ["permission.read", "permission.update"],
    exampleSeed: "로그인과 회원 역할 설정해줘",
  },
  {
    id: "storage",
    emoji: "📦",
    labelKo: "파일",
    purposeKo: "상품 이미지, 프로필 사진 등 파일 저장",
    availability: "available",
    resourceOps: ["storage.createBucket", "storage.upload", "storage.listBuckets"],
    hubTools: [],
    exampleSeed: "이미지 업로드 저장소 만들어줘",
  },
  {
    id: "backend",
    emoji: "⚡",
    labelKo: "백엔드",
    purposeKo: "주문 처리, 알림, API처럼 서비스가 실행하는 로직",
    availability: "partial",
    resourceOps: ["function.create", "job.create", "capability.invoke"],
    hubTools: ["capability.create", "capability.update", "workflow.create"],
    exampleSeed: "주문 처리 기능 추가해줘",
  },
  {
    id: "connect",
    emoji: "🔗",
    labelKo: "외부 연결",
    purposeKo: "GitHub, Vercel, Supabase, Stripe 같은 외부 서비스 연동",
    availability: "available",
    resourceOps: [],
    hubTools: ["connection.connect", "connection.list", "connection.verify"],
    exampleSeed: "GitHub 연결해줘",
  },
  {
    id: "test",
    emoji: "🧪",
    labelKo: "테스트",
    purposeKo: "만든 기능이 제대로 작동하는지 검증",
    availability: "available",
    resourceOps: ["verification.run"],
    hubTools: ["test.run", "test.e2e", "lint.run", "typecheck.run"],
    exampleSeed: "테스트 돌려줘",
  },
  {
    id: "runtime",
    emoji: "🚀",
    labelKo: "실행",
    purposeKo: "만든 서비스를 미리보기·실행 환경에서 돌리기",
    availability: "partial",
    resourceOps: ["runtime.start", "runtime.status", "deployment.create"],
    hubTools: ["preview.run", "server.start", "deploy.prepare"],
    exampleSeed: "현재 상태 확인해줘",
  },
  {
    id: "publish",
    emoji: "📣",
    labelKo: "공개",
    purposeKo: "완성된 서비스를 사용자에게 공개 (승인 후 진행)",
    availability: "partial",
    resourceOps: ["deployment.create"],
    hubTools: ["publish.request"],
    exampleSeed: "서비스 공개 준비해줘",
  },
] as const;

export type ConversationalAction = {
  readonly id: string;
  readonly label: string;
  readonly utterance: string;
};

export function infrastructureActionCards(): readonly ConversationalAction[] {
  return RIMVIO_INFRASTRUCTURE_CATALOG.map((cat) => ({
    id: `infra-${cat.id}`,
    label: `${cat.emoji} ${cat.labelKo}`,
    utterance: cat.exampleSeed,
  }));
}

export function findCategoryByTopic(
  utterance: string,
): InfrastructureCategory | null {
  const t = utterance.toLowerCase();
  if (/db|데이터베이스|database|테이블|스키마/.test(t)) return byId("data");
  if (/로그인|회원|auth|권한|역할/.test(t)) return byId("auth");
  if (/파일|storage|저장소|이미지|업로드|버킷/.test(t)) return byId("storage");
  if (/api|백엔드|function|서버\s*로직/.test(t)) return byId("backend");
  if (/github|깃허브|vercel|버셀|supabase|stripe|연결|oauth/.test(t)) return byId("connect");
  if (/테스트|test|검증|verify|e2e|lint/.test(t)) return byId("test");
  if (/실행|runtime|배포|deploy|미리보기|preview|상태/.test(t)) return byId("runtime");
  if (/공개|publish|출시|배포/.test(t)) return byId("publish");
  return null;
}

function byId(id: InfrastructureCategoryId): InfrastructureCategory {
  return RIMVIO_INFRASTRUCTURE_CATALOG.find((c) => c.id === id)!;
}

export function isInfrastructureExploreQuestion(utterance: string): boolean {
  return (
    /어떤\s*인프라|인프라\s*(만들|구성|뭐)|뭐\s*연결|무엇을\s*연결|Rimvio로\s*뭘|림비오.*뭘/.test(
      utterance,
    ) ||
    /무엇을\s*할\s*수|뭐\s*할\s*수|뭘\s*할\s*수|what\s*can\s*you\s*do/i.test(utterance)
  );
}

export function isGlobalRimvioQuestion(utterance: string): boolean {
  return (
    isInfrastructureExploreQuestion(utterance) ||
    /Rimvio|림비오/.test(utterance) ||
    /뭐\s*할\s*수|무엇을\s*할\s*수/.test(utterance)
  );
}

export function describeCategoryAvailability(cat: InfrastructureCategory): string {
  if (cat.availability === "available") {
    return `네, ${cat.labelKo} 환경을 구성할 수 있어요. ${cat.purposeKo}.`;
  }
  return `기본 ${cat.labelKo} 구성은 가능해요. ${cat.purposeKo}. (일부 고급 설정은 아직 준비 중이에요.)`;
}

export function summarizeInfrastructureCatalog(short: boolean): string {
  if (short) {
    return "서비스에 필요한 데이터, 회원, 파일 저장, 백엔드, 외부 서비스 연결, 테스트, 실행 환경 등을 구성할 수 있어요.";
  }
  const lines = RIMVIO_INFRASTRUCTURE_CATALOG.map(
    (c) => `• ${c.emoji} ${c.labelKo} — ${c.purposeKo}`,
  );
  return `Rimvio에서는 서비스에 필요한 기본 인프라를 만들고 연결할 수 있어요.\n\n${lines.join("\n")}\n\n어떤 서비스를 만들고 있는지 알려주시면 필요한 것만 골라서 구성해드릴게요.`;
}

export function inferServiceDomain(utterance: string): string | null {
  if (/중고|used\s*market|마켓플레이스|거래/.test(utterance)) return "중고거래";
  if (/배달|delivery|음식/.test(utterance)) return "배달";
  if (/예약|booking|호텔|여행/.test(utterance)) return "예약·여행";
  if (/쇼핑|commerce|몰/.test(utterance)) return "쇼핑";
  if (/커뮤니티|community/.test(utterance)) return "커뮤니티";
  return null;
}

export function domainInfrastructureHint(domain: string): string {
  const hints: Record<string, string> = {
    중고거래: "회원, 상품, 이미지, 거래·주문 데이터",
    배달: "회원, 음식점, 메뉴, 주문, 배달 상태",
    "예약·여행": "회원, 숙소, 예약, 결제 흐름",
    쇼핑: "회원, 상품, 장바구니, 주문",
    커뮤니티: "회원, 게시글, 알림",
  };
  return hints[domain] ?? "회원, 데이터, 파일 저장";
}
