/**
 * Sequenced Brief Replay — pure runner (MapLibre / tests inject flyTo).
 */

export type BriefReplayStop = {
  readonly id: string;
  readonly lng: number;
  readonly lat: number;
};

export async function runWorkspaceBriefReplay(input: {
  readonly stops: readonly BriefReplayStop[];
  readonly flyTo: (
    stop: BriefReplayStop,
    index: number,
  ) => void | Promise<void>;
  readonly onStep?: (index: number, stop: BriefReplayStop) => void;
  readonly onDone?: () => void;
  readonly shouldCancel?: () => boolean;
  /** Dwell after each fly (ms). */
  readonly stepMs?: number;
}): Promise<void> {
  const stops = input.stops.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng),
  );
  if (stops.length === 0) {
    input.onDone?.();
    return;
  }
  const stepMs = Math.max(400, input.stepMs ?? 1400);
  for (let i = 0; i < stops.length; i += 1) {
    if (input.shouldCancel?.()) break;
    const stop = stops[i]!;
    input.onStep?.(i, stop);
    await Promise.resolve(input.flyTo(stop, i));
    if (input.shouldCancel?.()) break;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, stepMs);
    });
  }
  input.onDone?.();
}
