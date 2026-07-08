/**
 * Intent Convergence Engine — question builder.
 *
 * Turns an assessment into a `LocalDiscoveryQuestion` rendered through the
 * existing question-chip channel (no new UI). The LLM only authors city-tailored
 * choice copy and picks which candidate axis is most narrowing; the chosen
 * chip's `value` is a concrete place query that flows into the activityFocus slot
 * so resolution stays deterministic.
 */
import type { LocalDiscoveryQuestion } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type {
  ConvergenceAxis,
  ConvergenceIntentType,
} from "@/lib/globe/context-condition-ai/intent-convergence/intent-convergence-schema";
import { extractLandmarkHintsFromText } from "@/lib/globe/discovery-lens/extract-landmark-hints";

type LlmChoice = {
  readonly id: string;
  readonly labelKo: string;
  readonly refinedQuery: string;
  readonly blurbKo?: string;
  readonly nodeCluster?: readonly string[];
};

function sanitizeCluster(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const nodes = value
    .filter((node): node is string => typeof node === "string")
    .map((node) => node.trim())
    .filter((node) => node.length > 0)
    .slice(0, 6);
  return nodes.length > 0 ? nodes : undefined;
}

export type ConvergenceQuestionResult = {
  readonly question: LocalDiscoveryQuestion;
  readonly askedAxisId: string;
};

function regionPrefix(region: string | null | undefined): string {
  return region?.trim() || "";
}

function questionFromAxis(
  axis: ConvergenceAxis,
  region: string | null | undefined,
): LocalDiscoveryQuestion {
  const area = regionPrefix(region);
  return {
    slot: "activityFocus",
    promptKo: axis.promptKo,
    choices: axis.chips.map((chip) => {
      const landmarks = extractLandmarkHintsFromText(
        `${chip.labelKo} ${chip.blurbKo ?? ""}`,
      );
      return {
        id: chip.id,
        label: chip.blurbKo ? `${chip.labelKo} · ${chip.blurbKo}` : chip.labelKo,
        slot: "activityFocus" as const,
        value: `${area} ${chip.refinedQueryTail}`.trim(),
        ...(chip.nodeCluster && chip.nodeCluster.length > 0
          ? { cluster: chip.nodeCluster }
          : {}),
        ...(landmarks.length > 0 ? { landmarks } : {}),
      };
    }),
  };
}

function sanitizeLlmChoices(value: unknown): LlmChoice[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: LlmChoice[] = [];
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const row = raw as Record<string, unknown>;
    const labelKo = typeof row.labelKo === "string" ? row.labelKo.trim() : "";
    const refinedQuery =
      typeof row.refinedQuery === "string" ? row.refinedQuery.trim() : "";
    if (!labelKo || !refinedQuery) {
      continue;
    }
    rows.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `chip-${index}`,
      labelKo,
      refinedQuery,
      blurbKo:
        typeof row.blurbKo === "string" && row.blurbKo.trim()
          ? row.blurbKo.trim()
          : undefined,
      nodeCluster: sanitizeCluster(row.nodeCluster),
    });
    if (rows.length >= 5) {
      break;
    }
  }
  return rows;
}

/**
 * Build a convergence question. Tries the LLM router for city-tailored copy and
 * axis selection; degrades to the deterministic top-axis schema so the assistant
 * never dead-ends.
 */
export async function buildConvergenceQuestion(input: {
  intentType: ConvergenceIntentType;
  topAxis: ConvergenceAxis;
  candidateAxes: readonly ConvergenceAxis[];
  query: string;
  region?: string | null;
}): Promise<ConvergenceQuestionResult> {
  const fallback: ConvergenceQuestionResult = {
    question: questionFromAxis(input.topAxis, input.region),
    askedAxisId: input.topAxis.id,
  };
  try {
    const response = await fetch("/api/globe/intent-converge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input.query,
        intentType: input.intentType,
        region: input.region ?? null,
        candidateAxes: input.candidateAxes.map((axis) => ({
          id: axis.id,
          labelKo: axis.labelKo,
          promptKo: axis.promptKo,
        })),
      }),
    });
    if (!response.ok) {
      return fallback;
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const choices = sanitizeLlmChoices(payload.choices);
    if (choices.length < 2) {
      return fallback;
    }
    const axisId =
      typeof payload.axisId === "string" && payload.axisId.trim()
        ? payload.axisId.trim()
        : input.topAxis.id;
    const promptKo =
      typeof payload.promptKo === "string" && payload.promptKo.trim()
        ? payload.promptKo.trim()
        : input.topAxis.promptKo;
    return {
      question: {
        slot: "activityFocus",
        promptKo,
        choices: choices.map((choice) => {
          const landmarks = extractLandmarkHintsFromText(
            `${choice.labelKo} ${choice.blurbKo ?? ""}`,
          );
          return {
            id: choice.id,
            label: choice.blurbKo
              ? `${choice.labelKo} · ${choice.blurbKo}`
              : choice.labelKo,
            slot: "activityFocus" as const,
            value: choice.refinedQuery,
            ...(choice.nodeCluster && choice.nodeCluster.length > 0
              ? { cluster: choice.nodeCluster }
              : {}),
            ...(landmarks.length > 0 ? { landmarks } : {}),
          };
        }),
      },
      askedAxisId: axisId,
    };
  } catch {
    return fallback;
  }
}
