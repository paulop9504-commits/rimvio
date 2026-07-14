import {
  compileIntentBlueprint,
  projectIntentBlueprintToTravel,
  type IntentBlueprint,
} from "@/lib/intent-engine";
import {
  RESOLUTION_PHASE_DONE_KO,
  RESOLUTION_PHASE_PROGRESS_KO,
} from "@/lib/resolution/progress-copy";
import {
  RESOLUTION_PHASES,
  type ResolutionBundle,
  type ResolutionContextReport,
  type ResolutionDecisionReport,
  type ResolutionExecutionGate,
  type ResolutionIntentReport,
  type ResolutionPhase,
  type ResolutionPhaseResult,
  type ResolutionPipelineInput,
  type ResolutionPlanStep,
  type ResolutionResearchItem,
  type ResolutionSemanticReport,
  type ResolutionSimulationStep,
} from "@/lib/resolution/types";

function phaseResult<T>(
  phase: ResolutionPhase,
  data: T,
  status: ResolutionPhaseResult<T>["status"] = "done",
): ResolutionPhaseResult<T> {
  return {
    phase,
    status,
    progressKo:
      status === "done"
        ? RESOLUTION_PHASE_DONE_KO[phase]
        : RESOLUTION_PHASE_PROGRESS_KO[phase],
    data,
  };
}

function resolveIntentPhase(blueprint: IntentBlueprint): ResolutionIntentReport {
  const categories = [...new Set(blueprint.intents.map((i) => i.category))];
  const libraryIds = blueprint.intents.map((i) => i.libraryId);
  const labels = blueprint.intents.map((i) => i.labelKo);
  const goalSummaryKo =
    labels.length > 0
      ? `${labels.join(" · ")}을(를) 원해요`
      : "아직 구체 의가 분명하지 않아요";

  return {
    categories,
    libraryIds,
    goalSummaryKo,
    confidence: blueprint.confidence,
  };
}

function resolveSemanticPhase(blueprint: IntentBlueprint): ResolutionSemanticReport {
  const profile: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(blueprint.mergedProfile)) {
    if (value != null) {
      profile[key] = value;
    }
  }
  const blendNotes: string[] = [];
  if (blueprint.constraints.includes("prefer_indie_romantic_blend")) {
    blendNotes.push("신혼·로맨틱 + 인디 감성을 함께 유지합니다");
  }
  if ((blueprint.mergedProfile.romantic ?? 0) >= 0.85) {
    blendNotes.push("로맨틱·프라이버시 비중이 높습니다");
  }
  if ((blueprint.mergedProfile.local ?? 0) >= 0.8) {
    blendNotes.push("로컬·골목 감성을 우선합니다");
  }

  return {
    moods: blueprint.mood.filter((m) => m !== "UNKNOWN"),
    styles: blueprint.style.filter((s) => s !== "UNKNOWN"),
    profile,
    blendNotes,
  };
}

function resolveContextPhase(
  input: ResolutionPipelineInput,
  blueprint: IntentBlueprint,
): ResolutionContextReport {
  const missing = [...blueprint.missing_information];
  const destinationLabel = input.destinationLabel?.trim() || null;
  if (destinationLabel) {
    const idx = missing.indexOf("destination");
    if (idx >= 0) {
      missing.splice(idx, 1);
    }
  } else if (!missing.includes("destination")) {
    missing.push("destination");
  }

  return {
    contextEventId: input.contextEventId?.trim() || null,
    destinationLabel,
    companionMode: input.companionMode?.trim() || null,
    hasActivePlan: input.hasActivePlan === true,
    missing: [...new Set(missing)],
  };
}

function resolveResearchPhase(
  blueprint: IntentBlueprint,
  semantic: ResolutionSemanticReport,
): ResolutionResearchItem[] {
  const ids = new Set(blueprint.intents.map((i) => i.libraryId));
  const items: ResolutionResearchItem[] = [];

  const wantsTravel =
    ids.has("travel.honeymoon") ||
    ids.has("travel.couple") ||
    ids.has("travel.family") ||
    ids.has("travel.family_parents") ||
    ids.has("travel.friends") ||
    ids.has("travel.solo") ||
    ids.has("travel.business") ||
    blueprint.intents.some((i) => i.category === "Travel");

  if (wantsTravel || (semantic.profile.romantic as number) >= 0.7) {
    items.push({
      id: "research.lodging",
      labelKo: "숙소 후보",
      engineId: "lodging_search",
      reasonKo: "여행 의도라 숙소 조사가 필요합니다",
    });
    items.push({
      id: "research.eatery",
      labelKo: "식사·카페 후보",
      engineId: "eatery_search",
      reasonKo: "동선·취향에 맞는 먹거리를 조사합니다",
    });
  }

  if (ids.has("mood.indie") || (semantic.profile.cafe as number) >= 0.8) {
    items.push({
      id: "research.local_places",
      labelKo: "골목·카페·편집숍",
      engineId: "activity_search",
      reasonKo: "인디·로컬 감성 장소를 조사합니다",
    });
  }

  if (ids.has("travel.business")) {
    items.push({
      id: "research.transit",
      labelKo: "역·이동 동선",
      engineId: "transit_navigate",
      reasonKo: "출장은 이동 효율이 핵심입니다",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "research.clarify",
      labelKo: "의도 확인",
      engineId: null,
      reasonKo: "조사 전에 한 가지를 더 물어볼 수 있습니다",
    });
  }

  return items;
}

function resolveSimulationPhase(
  research: ResolutionResearchItem[],
  context: ResolutionContextReport,
): ResolutionSimulationStep[] {
  const steps: ResolutionSimulationStep[] = [
    {
      id: "sim.load_context",
      labelKo: "활성 맥락 로드",
      outcome: context.contextEventId ? "would_prepare" : "would_ask",
    },
  ];

  if (context.missing.includes("destination")) {
    steps.push({
      id: "sim.ask_destination",
      labelKo: "도시 Confirm 게이트",
      outcome: "would_ask",
    });
  }

  for (const item of research) {
    if (!item.engineId) {
      continue;
    }
    steps.push({
      id: `sim.${item.id}`,
      labelKo: `${item.labelKo} 스카우트(가상)`,
      outcome: context.missing.includes("destination") ? "would_block" : "would_prepare",
    });
  }

  steps.push({
    id: "sim.build_diff",
    labelKo: "Reality Diff 초안",
    outcome: "would_prepare",
  });

  return steps;
}

function resolveDecisionPhase(
  blueprint: IntentBlueprint,
  research: ResolutionResearchItem[],
): ResolutionDecisionReport {
  const travel = projectIntentBlueprintToTravel(blueprint);
  const primary =
    research.find((r) => r.engineId === "lodging_search")?.id ??
    research[0]?.id ??
    "research.clarify";

  const parts: string[] = [];
  if (travel.companionMode) {
    parts.push(`동행 ${travel.companionMode.value}`);
  }
  if (travel.lodgingPriority) {
    parts.push(`숙소 ${travel.lodgingPriority.value}`);
  }
  if (travel.foodBias) {
    parts.push(`먹거리 ${travel.foodBias.value}`);
  }

  return {
    primaryPath: primary,
    lodgingPriority: travel.lodgingPriority?.value ?? null,
    foodBias: travel.foodBias?.value ?? null,
    tripStyle: travel.tripStyle?.value ?? null,
    rationaleKo:
      parts.length > 0
        ? `${parts.join(" · ")} 기준으로 진행합니다`
        : "추가 신호가 없어서 기본 경로로 둡니다",
  };
}

function resolveRealityPlannerPhase(
  context: ResolutionContextReport,
  decision: ResolutionDecisionReport,
  research: ResolutionResearchItem[],
): ResolutionPlanStep[] {
  const steps: ResolutionPlanStep[] = [];

  if (context.missing.includes("destination") || !context.destinationLabel) {
    steps.push({
      id: "plan.confirm_destination",
      labelKo: "여행 도시 Confirm",
      requiresHuman: true,
    });
  }

  steps.push({
    id: "plan.commit_path",
    labelKo: `경로 확정 · ${decision.primaryPath}`,
    requiresHuman: true,
  });

  for (const item of research.filter((r) => r.engineId)) {
    steps.push({
      id: `plan.run_${item.id}`,
      labelKo: `${item.labelKo} 실행 준비`,
      requiresHuman: false,
    });
  }

  steps.push({
    id: "plan.reality_diff",
    labelKo: "Reality Diff 검토",
    requiresHuman: true,
  });

  return steps;
}

function resolveExecutionGate(
  plan: ResolutionPlanStep[],
  context: ResolutionContextReport,
): ResolutionExecutionGate {
  const humanLeft = plan.some((s) => s.requiresHuman);
  if (context.missing.includes("destination")) {
    return {
      status: "blocked",
      nextActionKo: "도시 Confirm이 필요합니다",
      canAutoRun: false,
    };
  }
  if (humanLeft) {
    return {
      status: "waiting_approval",
      nextActionKo: "승인한 뒤 Reality에 반영합니다",
      canAutoRun: false,
    };
  }
  return {
    status: "ready",
    nextActionKo: "게이트 밖에서 Auto 실행할 수 있습니다",
    canAutoRun: true,
  };
}

/**
 * Pure Resolution Pipeline — builds a full bundle without mutating Reality.
 */
export function runResolutionPipeline(input: ResolutionPipelineInput): ResolutionBundle {
  const sourceText = input.text.trim();
  const blueprint =
    input.blueprint ?? compileIntentBlueprint({ text: sourceText });

  const intent = resolveIntentPhase(blueprint);
  const semantic = resolveSemanticPhase(blueprint);
  const context = resolveContextPhase(input, blueprint);
  const research = resolveResearchPhase(blueprint, semantic);
  const simulation = resolveSimulationPhase(research, context);
  const decision = resolveDecisionPhase(blueprint, research);
  const realityPlan = resolveRealityPlannerPhase(context, decision, research);
  const execution = resolveExecutionGate(realityPlan, context);

  const waitingApproval =
    execution.status === "waiting_approval" || execution.status === "blocked";

  return {
    version: 1,
    sourceText,
    currentPhase: "execution",
    phases: {
      intent: phaseResult("intent", intent),
      semantic: phaseResult("semantic", semantic),
      context: phaseResult("context", context),
      research: phaseResult("research", research),
      simulation: phaseResult("simulation", simulation),
      decision: phaseResult("decision", decision),
      reality_planner: phaseResult("reality_planner", realityPlan),
      execution: phaseResult(
        "execution",
        execution,
        waitingApproval ? "waiting" : "done",
      ),
    },
    confidence: blueprint.confidence || intent.confidence,
    waitingApproval,
  };
}

/** Snapshot as if pipeline paused at a given phase (for timeline UI). */
export function projectResolutionBundleAtPhase(
  bundle: ResolutionBundle,
  phase: ResolutionPhase,
): ResolutionBundle {
  const idx = RESOLUTION_PHASES.indexOf(phase);
  const nextPhases = { ...bundle.phases };
  const write = nextPhases as Record<
    ResolutionPhase,
    ResolutionBundle["phases"][ResolutionPhase]
  >;

  for (let i = 0; i < RESOLUTION_PHASES.length; i++) {
    const id = RESOLUTION_PHASES[i]!;
    const row = write[id];
    if (i < idx) {
      write[id] = {
        ...row,
        status: "done",
        progressKo: RESOLUTION_PHASE_DONE_KO[id],
      };
    } else if (i === idx) {
      const waiting = id === "execution" && bundle.waitingApproval;
      write[id] = {
        ...row,
        status: waiting ? "waiting" : "in_progress",
        progressKo: waiting
          ? RESOLUTION_PHASE_PROGRESS_KO.execution.replace(
              "마치는 중",
              "승인 대기 중",
            )
          : RESOLUTION_PHASE_PROGRESS_KO[id],
      };
    } else {
      write[id] = {
        ...row,
        status: "pending",
        progressKo: "대기 중",
      };
    }
  }

  return {
    ...bundle,
    currentPhase: phase,
    phases: nextPhases,
  };
}
