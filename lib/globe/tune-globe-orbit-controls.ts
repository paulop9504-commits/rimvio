import type { GlobeInstance } from "globe.gl";

export type OrbitControlsLike = ReturnType<GlobeInstance["controls"]>;

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches
  );
}

/** Apple Maps–grade orbit feel — damping, touch split, mobile rotate speed. */
export function tuneGlobeOrbitControls(controls: OrbitControlsLike): void {
  controls.enablePan = false;
  controls.autoRotate = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.078;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.95;

  const touches = controls.touches as
    | { ONE?: number; TWO?: number }
    | undefined;
  if (touches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TOUCH = (controls.constructor as any)?.TOUCH ?? {
      ROTATE: 0,
      PAN: 1,
      DOLLY_PAN: 2,
      DOLLY_ROTATE: 3,
    };
    touches.ONE = TOUCH.ROTATE;
    if (isCoarsePointer()) {
      // Custom pointer pinch owns two-finger zoom — do not map TWO (was ROTATE).
      delete touches.TWO;
    } else {
      touches.TWO = TOUCH.DOLLY;
    }
  }

  if (isCoarsePointer()) {
    controls.rotateSpeed = 0.34;
    controls.dampingFactor = 0.088;
    controls.enableZoom = false;
  }
}
