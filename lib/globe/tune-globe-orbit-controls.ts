import type { GlobeInstance } from "globe.gl";
import {
  GLOBE_ORBIT_DESKTOP,
  GLOBE_ORBIT_TOUCH,
} from "@/lib/globe/globe-gesture-tuning";
import { isTouchZoomDevice } from "@/lib/globe/is-touch-zoom-device";

export type OrbitControlsLike = ReturnType<GlobeInstance["controls"]>;

/** Apple Maps–grade orbit — damping always on for buttery release inertia. */
export function tuneGlobeOrbitControls(controls: OrbitControlsLike): void {
  controls.enablePan = false;
  controls.autoRotate = false;
  controls.enableDamping = true;

  const touchDevice = isTouchZoomDevice();
  const profile = touchDevice ? GLOBE_ORBIT_TOUCH : GLOBE_ORBIT_DESKTOP;
  controls.rotateSpeed = profile.rotateSpeed;
  controls.dampingFactor = profile.dampingFactor;
  controls.zoomSpeed = profile.zoomSpeed;

  // Keep min distance sane so street zoom does not fight damping.
  if ("minDistance" in controls && typeof controls.minDistance === "number") {
    controls.minDistance = Math.max(controls.minDistance, 0.01);
  }

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
    touches.TWO = TOUCH.DOLLY;
  }

  if (touchDevice) {
    controls.enableZoom = true;
  }
}
