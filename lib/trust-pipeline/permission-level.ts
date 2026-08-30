import type { CapabilityPermissionLevel, CapabilityPermissionSpec } from "@/lib/trust-pipeline/types";

export const CAPABILITY_PERMISSION_SPECS: readonly CapabilityPermissionSpec[] = [
  {
    level: 0,
    id: "pure_compute",
    titleKo: "순수 계산",
    descriptionKo: "외부 I/O 없음. 기본 시작 등급.",
  },
  {
    level: 1,
    id: "read_public",
    titleKo: "공개 데이터 읽기",
    descriptionKo: "공개 카탈로그 · 캐시만 읽기.",
  },
  {
    level: 2,
    id: "read_user",
    titleKo: "사용자 데이터 읽기",
    descriptionKo: "사용자 컨텍스트 읽기. Write 불가.",
  },
  {
    level: 3,
    id: "write_user",
    titleKo: "사용자 데이터 쓰기",
    descriptionKo: "Workspace Patch · 사용자 상태 변경.",
  },
  {
    level: 4,
    id: "external_tx",
    titleKo: "외부 트랜잭션",
    descriptionKo: "외부 API 호출 · 예약 준비. Commit 아님.",
  },
  {
    level: 5,
    id: "financial",
    titleKo: "결제 · 되돌릴 수 없는 행동",
    descriptionKo: "결제 · 환불 · 삭제. 사람 Commit 필수.",
  },
];

/** External producer submissions always start at L0 or L1. */
export const EXTERNAL_PRODUCER_MAX_START_LEVEL: CapabilityPermissionLevel = 1;

export function clampExternalProducerPermission(
  declared?: CapabilityPermissionLevel,
): CapabilityPermissionLevel {
  const level = declared ?? 0;
  return level > EXTERNAL_PRODUCER_MAX_START_LEVEL ? EXTERNAL_PRODUCER_MAX_START_LEVEL : level;
}

export function permissionSpec(
  level: CapabilityPermissionLevel,
): CapabilityPermissionSpec {
  return CAPABILITY_PERMISSION_SPECS[level] ?? CAPABILITY_PERMISSION_SPECS[0]!;
}
