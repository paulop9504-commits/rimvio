import { generateChainContext } from "@/lib/containers/context-generator";
import { buildContainerUnsupportedSummary } from "@/lib/containers/container-system-prompt";
import type { ContainerAllowedAction } from "@/lib/containers/container-types";
import { normalizeActiveChains } from "@/lib/containers/container-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

function detectRequestedActions(message: string): ContainerAllowedAction[] {
  const lower = message.toLowerCase();
  const requested = new Set<ContainerAllowedAction>();

  if (/매수|사야|사\s|buy|long/i.test(message)) {
    requested.add("BUY");
  }
  if (/매도|팔|sell|short/i.test(message)) {
    requested.add("SELL");
  }
  if (/시세|가격|price|얼마|호가|check_price/i.test(lower)) {
    requested.add("CHECK_PRICE");
  }
  if (/알람|알림|alarm|리마인드/i.test(message)) {
    requested.add("SET_ALARM");
  }
  if (/뉴스|헤드라인|headline|브리핑|기사/i.test(message)) {
    requested.add("FETCH_NEWS");
  }
  if (/요약|summarize|정리/i.test(message)) {
    requested.add("SUMMARIZE");
  }
  if (/일정|약속|미팅|회의|캘린더|schedule/i.test(message)) {
    requested.add("ADD_SCHEDULE");
  }
  if (/일정\s*확인|스케줄\s*봐|schedule/i.test(message)) {
    requested.add("CHECK_SCHEDULE");
  }
  if (/버스|지하철|교통|막히|출발|transit|실시간/i.test(message)) {
    requested.add("CHECK_TRANSIT");
  }
  if (/길\s*찾|네비|가\s*줘|navigate|route/i.test(message)) {
    requested.add("NAVIGATE");
  }
  if (/전화|연락|call|tel/i.test(message)) {
    requested.add("CALL");
  }
  if (/링크|열어|open|http/i.test(lower)) {
    requested.add("OPEN_LINK");
  }

  if (requested.size === 0) {
    requested.add("ACTION");
  }

  return [...requested];
}

function isAllowed(
  requested: ContainerAllowedAction[],
  union: ContainerAllowedAction[]
) {
  if (union.length === 0) {
    return true;
  }

  if (union.includes("ACTION")) {
    return true;
  }

  return requested.every(
    (action) => action === "ACTION" || union.includes(action)
  );
}

export function tryContainerActionGate(input: {
  message: string;
  activeChains?: string[] | null;
  legacyChainIds?: string[] | null;
}): OrchestratorResult | null {
  const keys = normalizeActiveChains([
    ...(input.activeChains ?? []),
    ...(input.legacyChainIds ?? []),
  ]);

  if (keys.length === 0) {
    return null;
  }

  const context = generateChainContext(keys);
  if (!context) {
    return null;
  }

  const requested = detectRequestedActions(input.message);
  if (isAllowed(requested, context.capabilityList)) {
    return null;
  }

  return {
    summary: buildContainerUnsupportedSummary(),
    actions: [],
    source: "conversation",
    confidence: 1,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
  };
}
