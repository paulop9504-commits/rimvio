import { isIOS, isStandalonePwa } from "@/lib/platform/device";

/** iOS home-screen PWA — aggressive memory guards for WebGL + Field. */
export function shouldUseIosPwaMemoryGuards(): boolean {
  return isIOS() && isStandalonePwa();
}

/** Defer heavy overlays until Globe GPU can suspend (ms). */
export function iosPwaOverlayOpenDelayMs(): number {
  return shouldUseIosPwaMemoryGuards() ? 180 : 0;
}

/** Defer discovery pin fetches after layer toggle (ms). */
export function iosPwaDiscoveryPinsDelayMs(): number {
  return shouldUseIosPwaMemoryGuards() ? 900 : 0;
}
