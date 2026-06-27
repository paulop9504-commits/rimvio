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

  async getNetworkType() {
    return { type: "unknown" as const };
  }

  async requestPhotoLibraryPermission() {
    return { granted: false };
  }

  async scanPhotoLibrary() {
    return { photos: [], nextCursorMs: Date.now() };
  }

  async importPhotoToCache(_options: {
    contentUri: string;
    fileName?: string;
  }): Promise<import("@/lib/native-bridge/rimvio-native-bridge.types").NativePhotoCacheImport> {
    throw new Error("album_sync_web_unsupported");
  }
}
