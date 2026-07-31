/**
 * Soft / Draft CREATE pending — human chip → Workspace (Article 0).
 */

import type { IntentPlan } from "@/lib/intent-router/build-intent-plan";
import type { IntentConfidence } from "@/lib/intent-router/types";

export type PendingCreateProject = {
  readonly contextEventId: string;
  readonly originalUtterance: string;
  readonly destinationKo: string | null;
  readonly stayLabelKo: string | null;
  readonly atIso: string;
  /** soft = propose only; draft = Intent Plan prepared behind the scenes. */
  readonly stage: Extract<IntentConfidence, "soft" | "draft">;
  readonly plan: IntentPlan | null;
};

const memory = new Map<string, PendingCreateProject>();

export function writePendingCreateProject(
  pending: PendingCreateProject,
): void {
  const key = pending.contextEventId.trim();
  if (!key) return;
  memory.set(key, pending);
}

export function readPendingCreateProject(
  contextEventId: string,
): PendingCreateProject | null {
  return memory.get(contextEventId.trim()) ?? null;
}

export function clearPendingCreateProject(contextEventId: string): void {
  memory.delete(contextEventId.trim());
}

export function isCreateProjectAffirmUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^(?:나중에|아냐|아니|취소|됐어|no|cancel|later)/iu.test(t)) {
    return false;
  }
  return /만들어|만들자|프로젝트|Workspace|워크스페이스|열어|시작|확인|응|좋아|해줘|yes|ok|create/iu.test(
    t,
  );
}

export function isCreateProjectRejectUtterance(text: string): boolean {
  const t = text.trim();
  return /나중에|아냐|아니|취소|됐어|그냥\s*볼|알아볼|탐색|no|cancel|later|explore/iu.test(
    t,
  );
}
