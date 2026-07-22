/**
 * Shared tool invoke budget — timeout + one soft retry on empty/throw.
 */

export const RIMVIO_TOOL_BUDGET_MS = 12_000;

export type ToolBudgetResult<T> = {
  readonly value: T | null;
  readonly timedOut: boolean;
  readonly retried: boolean;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type RaceOk<T> = { readonly kind: "ok"; readonly value: T };
type RaceTimeout = { readonly kind: "timeout" };

/**
 * Race a promise against timeoutMs. On failure/empty, optional one soft retry.
 */
export async function withToolBudget<T>(input: {
  readonly run: () => Promise<T>;
  readonly timeoutMs?: number;
  readonly softRetry?: boolean;
  readonly isEmpty?: (value: T) => boolean;
}): Promise<ToolBudgetResult<T>> {
  const timeoutMs = input.timeoutMs ?? RIMVIO_TOOL_BUDGET_MS;
  const softRetry = input.softRetry !== false;
  const isEmpty = input.isEmpty ?? (() => false);

  const runOnce = async (): Promise<{
    value: T | null;
    timedOut: boolean;
  }> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const raced = await Promise.race([
        input.run().then(
          (value): RaceOk<T> => ({ kind: "ok", value }),
        ),
        new Promise<RaceTimeout>((resolve) => {
          timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
        }),
      ]);
      if (raced.kind === "timeout") {
        return { value: null, timedOut: true };
      }
      return { value: raced.value, timedOut: false };
    } catch {
      return { value: null, timedOut: false };
    } finally {
      if (timer != null) {
        clearTimeout(timer);
      }
    }
  };

  const first = await runOnce();
  if (first.value != null && !isEmpty(first.value)) {
    return { value: first.value, timedOut: false, retried: false };
  }

  if (!softRetry) {
    return { value: first.value, timedOut: first.timedOut, retried: false };
  }

  await delay(120);
  const second = await runOnce();
  return {
    value: second.value,
    timedOut: first.timedOut || second.timedOut,
    retried: true,
  };
}

export function formatLookupEmptySummaryKo(
  kind: "숙소" | "맛집" | "약국·편의" | "지도",
): string {
  return `${kind} 후보가 비었어요 · 조건을 바꿔 다시 찾아볼까요`;
}

export function formatLookupCountSummaryKo(
  kind: "숙소" | "맛집" | "약국·편의" | "지도",
  count: number,
): string {
  if (count <= 0) {
    return formatLookupEmptySummaryKo(kind);
  }
  if (kind === "지도") {
    return `${count}곳을 지도에서 찾았어요`;
  }
  return `${kind} ${count}곳을 확인했어요`;
}
