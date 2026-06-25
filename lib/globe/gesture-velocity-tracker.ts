const SAMPLE_WINDOW_MS = 140;
const MAX_SAMPLES = 8;

type Sample = { t: number; dx: number; dy: number };

/** Recent pointer deltas → release velocity for inertial pan. */
export class GestureVelocityTracker {
  private samples: Sample[] = [];

  reset() {
    this.samples = [];
  }

  record(deltaX: number, deltaY: number, now = performance.now()) {
    this.samples.push({ t: now, dx: deltaX, dy: deltaY });
    while (
      this.samples.length > MAX_SAMPLES ||
      (this.samples.length > 1 &&
        now - this.samples[0]!.t > SAMPLE_WINDOW_MS)
    ) {
      this.samples.shift();
    }
  }

  velocity(): { vx: number; vy: number } {
    if (this.samples.length === 0) {
      return { vx: 0, vy: 0 };
    }
    const first = this.samples[0]!;
    const last = this.samples[this.samples.length - 1]!;
    const dt = Math.max(10, last.t - first.t);
    let sumDx = 0;
    let sumDy = 0;
    let weightSum = 0;
    for (let index = 0; index < this.samples.length; index += 1) {
      const sample = this.samples[index]!;
      const weight = (index + 1) / this.samples.length;
      sumDx += sample.dx * weight;
      sumDy += sample.dy * weight;
      weightSum += weight;
    }
    const scale = (16 / dt) * (this.samples.length / Math.max(1, weightSum));
    return { vx: sumDx * scale, vy: sumDy * scale };
  }
}

/** Exponential decay — returns false when motion is negligible. */
export function applyInertialDecay(
  velocity: { vx: number; vy: number },
  friction = 0.936,
): { vx: number; vy: number; active: boolean } {
  const vx = velocity.vx * friction;
  const vy = velocity.vy * friction;
  const active = Math.hypot(vx, vy) > 0.28;
  return { vx, vy, active };
}
