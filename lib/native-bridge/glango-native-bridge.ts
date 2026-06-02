import { Capacitor, registerPlugin } from "@capacitor/core";
import type { GlangoNativeBridgePlugin } from "@/lib/native-bridge/glango-native-bridge.types";

export const GlangoNativeBridge = registerPlugin<GlangoNativeBridgePlugin>(
  "GlangoNativeBridge",
  {
    web: () =>
      import("@/lib/native-bridge/glango-native-bridge.web").then(
        (module) => new module.GlangoNativeBridgeWeb(),
      ),
  },
);

export function isNativeShell(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroidShell(): boolean {
  return Capacitor.getPlatform() === "android";
}

export function isIosShell(): boolean {
  return Capacitor.getPlatform() === "ios";
}
