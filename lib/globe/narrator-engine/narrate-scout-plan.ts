import type {
  ScoutNarration,
  ScoutNarrationPlan,
  ScoutNarrationProgressStep,
} from "@/lib/globe/narrator-engine/types";

function domainNounKo(plan: ScoutNarrationPlan): string {
  switch (plan.domain) {
    case "Eatery":
      return "음식";
    case "Lodging":
      return "숙소";
    case "Activity":
      return "놀거리";
    case "Amenity":
      return "편의시설";
    case "Mixed":
      return "주변";
    default:
      return "검색";
  }
}

function entitySearchTail(plan: ScoutNarrationPlan): string {
  const entity = plan.entityLabelKo?.trim();
  if (plan.domain === "Eatery") {
    return entity ? `${entity} 맛집` : "맛집";
  }
  if (plan.domain === "Lodging") {
    return entity ? `${entity} 숙소` : "숙소";
  }
  if (entity) {
    return entity;
  }
  return domainNounKo(plan);
}

function buildUnderstandingKo(plan: ScoutNarrationPlan): string {
  const lines: string[] = ["이해했습니다."];
  const entity = plan.entityLabelKo?.trim();
  const drop = plan.dropLabelsKo[0]?.trim();
  const anchor = plan.anchorLabelKo?.trim();
  const target = entitySearchTail(plan);

  if (plan.mode === "Replace") {
    lines.push(
      `이번 요청은 새로운 ${domainNounKo(plan)} 검색으로 판단했습니다.`,
    );
    if (drop && entity && drop !== entity) {
      lines.push(
        [
          `이전 ${drop} 검색은 검색 조건에서 제외하고,`,
          anchor
            ? `${anchor}를 기준으로 ${target}을 다시 찾겠습니다.`
            : `현재 위치를 기준으로 ${target}을 다시 찾겠습니다.`,
        ].join("\n"),
      );
    } else if (drop) {
      lines.push(
        `이전 ${drop} 검색은 제외하고, ${
          anchor ? `${anchor} 기준` : "현재 위치 기준"
        }으로 다시 탐색합니다.`,
      );
    } else {
      lines.push(
        anchor
          ? `${anchor}를 기준으로 ${target}을 찾겠습니다.`
          : `현재 위치를 기준으로 ${target}을 찾겠습니다.`,
      );
    }
  } else if (plan.intent === "Refine") {
    lines.push("조건을 조금 더 맞춰 같은 검색을 다듬겠습니다.");
    if (entity) {
      lines.push(`${entity} 후보를 기준으로 범위를 조정합니다.`);
    }
  } else {
    lines.push(`이번 요청에 맞춰 ${target} 탐색을 이어가겠습니다.`);
    if (anchor) {
      lines.push(`${anchor} 주변을 기준으로 합니다.`);
    }
  }

  return lines.join("\n");
}

function entityEmoji(plan: ScoutNarrationPlan): string {
  const label = `${plan.entityLabelKo ?? ""} ${plan.domain}`;
  if (/초밥|스시|sushi/iu.test(label)) {
    return "🍣";
  }
  if (/말차|matcha|디저트|아이스크림/iu.test(label)) {
    return "🍵";
  }
  if (/라멘|ramen/iu.test(label)) {
    return "🍜";
  }
  if (plan.domain === "Lodging") {
    return "🏨";
  }
  if (plan.domain === "Activity") {
    return "🎯";
  }
  if (plan.domain === "Eatery") {
    return "🍽️";
  }
  return "🔍";
}

function buildProgressSteps(plan: ScoutNarrationPlan): ScoutNarrationProgressStep[] {
  const steps: ScoutNarrationProgressStep[] = [
    { id: "analyze", textKo: "🧠 이번 요청 분석 중…" },
  ];

  if (plan.mode === "Replace" && plan.dropLabelsKo.length > 0) {
    const drop = plan.dropLabelsKo[0]!;
    steps.push({
      id: "drop_prior",
      textKo: `🔄 이전 검색 포커스 제거… (${drop})`,
    });
  } else if (plan.mode === "Replace") {
    steps.push({
      id: "replace",
      textKo: "🔄 이전 검색은 종료하고 이번 검색으로 전환…",
    });
  }

  const entity = plan.entityLabelKo?.trim();
  if (entity) {
    steps.push({
      id: "switch_entity",
      textKo: `${entityEmoji(plan)} ${entity} 검색으로 전환…`,
    });
  } else {
    steps.push({
      id: "switch_domain",
      textKo: `${entityEmoji(plan)} ${domainNounKo(plan)} 검색으로 전환…`,
    });
  }

  const anchor = plan.anchorLabelKo?.trim();
  steps.push({
    id: "anchor",
    textKo: anchor
      ? `📍 ${anchor} Anchor 기준 검색…`
      : "📍 현재 Anchor 기준 검색…",
  });

  steps.push({
    id: "collect",
    textKo: "🔍 후보를 수집하는 중…",
  });

  if (plan.sortHint === "rating") {
    steps.push({
      id: "sort",
      textKo: "⭐ 평점·동선 기준으로 정렬…",
    });
  } else if (plan.sortHint === "distance") {
    steps.push({
      id: "sort",
      textKo: "🚶 가까운 순으로 정렬…",
    });
  }

  return steps;
}

/** Deterministic Narrator — plan → understanding + gray progress logs. */
export function narrateScoutPlan(plan: ScoutNarrationPlan): ScoutNarration {
  return {
    plan,
    understandingKo: buildUnderstandingKo(plan),
    progressSteps: buildProgressSteps(plan),
  };
}

/** Build plan + narrate in one call. */
export function narrateFromScoutContext(input: {
  plan: ScoutNarrationPlan;
}): ScoutNarration {
  return narrateScoutPlan(input.plan);
}
