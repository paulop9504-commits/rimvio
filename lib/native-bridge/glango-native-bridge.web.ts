import { WebPlugin } from "@capacitor/core";
import type {
  GlangoNativeBridgePlugin,
  NativePlatformInfo,
} from "@/lib/native-bridge/glango-native-bridge.types";

export class GlangoNativeBridgeWeb extends WebPlugin implements GlangoNativeBridgePlugin {
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
