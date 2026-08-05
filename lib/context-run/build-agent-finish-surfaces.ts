/**
 * Finish surfaces for AgentChatCard — Collapse Header ≠ messageKo.
 * Cursor-density result from Workspace SSOT + activity transcript.
 */

import type { AgentActivityTranscript } from "@/lib/context-run/agent-activity-transcript";
import { formatAgentActivityElapsed } from "@/lib/context-run/agent-activity-transcript";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { domainLabelKo } from "@/lib/context-workspace/types";

export type AgentFinishObjectChip = {
  readonly id: string;
  readonly title: string;
  readonly subtitleKo?: string | null;
};

function thoughtDurationSuffix(
  activity: AgentActivityTranscript | null,
): string {
  if (!activity) return "";
  const end = activity.endedAtMs ?? Date.now();
  const sec = Math.max(0.1, (end - activity.startedAtMs) / 1000);
  return `(Thought for ${sec.toFixed(1)}s)`;
}

function shortenGoalKo(utterance: string, max = 22): string {
  const t = utterance
    .replace(/찾아\s*줘|찾아줘|보여\s*줘|검색해|해\s*줘/giu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "요청";
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * One-line collapse strip — execution meta only (not the main answer).
 */
export function getCollapseHeaderLabel(
  activity: AgentActivityTranscript | null,
  objects?: readonly AgentFinishObjectChip[] | null,
): string {
  const duration = thoughtDurationSuffix(activity);
  const n = objects?.length ?? 0;
  const goal = activity?.utterance
    ? shortenGoalKo(activity.utterance)
    : null;

  if (n > 0 && goal) {
    return `✓ ${goal} · ${n}곳 ${duration}`.trim();
  }
  if (n > 0) {
    return `✓ ${n}곳 준비 ${duration}`.trim();
  }

  const last = activity?.events[activity.events.length - 1]?.labelKo?.trim();
  if (last) {
    const cleaned = last.replace(/…$/u, "").trim();
    return `✓ ${cleaned} ${duration}`.trim();
  }

  const elapsed = formatAgentActivityElapsed(activity);
  return `✓ 완료${elapsed ? ` · ${elapsed}` : ""} ${duration}`.trim();
}

/**
 * Cursor-density finish body — what / why / next from Workspace facts.
 */
export function buildAgentFinishMessageKo(input: {
  readonly state: ContextWorkspaceState;
  readonly utterance?: string | null;
  readonly replyHintKo?: string | null;
}): string {
  const visible = input.state.nodes.filter((n) => n.visible);
  const lodging = visible.filter((n) => n.kind === "lodging");
  const poi = visible.filter((n) => n.kind === "poi");
  const eatery = visible.filter((n) => n.kind === "eatery");
  const focus =
    lodging.length > 0 ? lodging : poi.length > 0 ? poi : eatery;
  const domain =
    lodging.length > 0
      ? "lodging"
      : poi.length > 0
        ? "poi"
        : eatery.length > 0
          ? "eatery"
          : input.state.domain;
  const label = domainLabelKo(domain);
  const utterance = input.utterance?.trim() || input.state.query || "";
  const top = focus.slice(0, 3);

  const whatBits: string[] = [];
  if (/usj|유니버설|유니버셜|universal/iu.test(utterance)) {
    whatBits.push("USJ 앵커 기준");
  } else if (input.state.summaryKo?.trim()) {
    whatBits.push(input.state.summaryKo.replace(/\s*여행.*$/u, "").trim() || "현재 Context");
  } else {
    whatBits.push("현재 Workspace");
  }
  whatBits.push(`${label} ${focus.length}곳 Patch`);
  if (/가성비|싼|저렴|가격/iu.test(utterance)) {
    whatBits.push("가격·거리 정렬");
  } else if (/근처|주변|near/iu.test(utterance)) {
    whatBits.push("거리 우선 정렬");
  }

  const whyLines = top.map((n, i) => {
    const bits: string[] = [];
    if (n.amountLabel) bits.push(n.amountLabel);
    else if (n.priceBand != null) bits.push(`가격대 ${n.priceBand}`);
    if (n.rating != null) bits.push(`평점 ${n.rating}`);
    const reason =
      n.summaryKo?.trim() && n.summaryKo.length < 40
        ? n.summaryKo.trim()
        : bits.length > 0
          ? bits.join(" · ")
          : "후보";
    return `${i + 1}. ${n.title} — ${reason}`;
  });

  const nextHints: string[] = [];
  if (lodging.length > 0) {
    nextHints.push("비교", "예약 준비", "조건 더 좁히기");
  } else if (poi.length > 0) {
    nextHints.push("근처 숙소", "동선", "일정에 넣기");
  } else {
    nextHints.push("비교", "다시 찾기");
  }

  const lead = whatBits.join(" · ");
  const whyBlock =
    whyLines.length > 0 ? ([`· 왜 이 후보인가:`, ...whyLines] as const) : [];
  const nextLine = `· 다음에: ${nextHints.join(" · ")}`;

  const hint =
    input.replyHintKo?.trim() &&
    !input.replyHintKo.includes("작업장에서 확인") &&
    input.replyHintKo.length < 80
      ? input.replyHintKo.trim()
      : null;

  // Punchy lead = what; why/next stay as compact sections (no essay dump).
  return [hint ?? lead, `· 무엇을 했는가: ${lead}`, ...whyBlock, nextLine].join(
    "\n",
  );
}
