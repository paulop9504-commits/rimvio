import { WebPlugin } from "@capacitor/core";
import type {
  RimvioNativeBridgePlugin,
  NativePlatformInfo,
} from "@/lib/native-bridge/rimvio-native-bridge.types";

export class RimvioNativeBridgeWeb extends WebPlugin implements RimvioNativeBridgePlugin {
  async isNotificationAccessEnabled() {
    return { enabled: false };
  }

  async openNotificationAccessSettings() {
    return undefined;
  }

  async getPlatformInfo(): Promise<NativePlatformInfo> {
    return { platform: "web", isNative: false };
  }
}
