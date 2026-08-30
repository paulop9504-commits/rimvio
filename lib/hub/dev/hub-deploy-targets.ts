/**
 * Hub deploy targets — personal preview vs Rimvio main.
 */

export const HUB_DEPLOY_TARGETS = ["personal", "main"] as const;

export type HubDeployTarget = (typeof HUB_DEPLOY_TARGETS)[number];

export type HubDeployTargetSpec = {
  readonly id: HubDeployTarget;
  readonly labelKo: string;
  readonly hintKo: string;
};

export const HUB_DEPLOY_TARGET_SPECS: readonly HubDeployTargetSpec[] = [
  {
    id: "personal",
    labelKo: "본인",
    hintKo: "내 Preview · private 등록",
  },
  {
    id: "main",
    labelKo: "Main",
    hintKo: "우리쪽 Hub 공개 배포",
  },
];

export function isHubDeployTarget(value: string): value is HubDeployTarget {
  return (HUB_DEPLOY_TARGETS as readonly string[]).includes(value);
}

export function parseDeployTargetsFromUtterance(utterance: string): readonly HubDeployTarget[] {
  const text = utterance.trim().toLowerCase();
  const both = /전부|둘\s*다|둘다|all\b|both/.test(text);
  if (both) return ["personal", "main"];

  const selected: HubDeployTarget[] = [];
  if (/본인|personal|preview|내꺼|내\s*쪽/.test(text)) selected.push("personal");
  if (/main|메인|우리쪽|우리\s*쪽|production|프로덕션|공개/.test(text)) selected.push("main");
  return selected;
}

export function wantsDeployUtterance(utterance: string): boolean {
  return /deploy|배포|publish|출시/.test(utterance);
}

export function formatDeployUtterance(targets: readonly HubDeployTarget[]): string {
  const unique = HUB_DEPLOY_TARGETS.filter((t) => targets.includes(t));
  if (unique.length === 2) return "전부 배포";
  if (unique[0] === "main") return "배포해 main";
  return "배포해 personal";
}

export function deployTargetLabels(targets: readonly HubDeployTarget[]): string {
  return targets
    .map((id) => HUB_DEPLOY_TARGET_SPECS.find((s) => s.id === id)?.labelKo ?? id)
    .join(" · ");
}
