export type NativeNotificationPayload = {
  source_app: string;
  title: string;
  content: string;
  timestamp: string;
};

export type NativePlatformInfo = {
  platform: "android" | "ios" | "web";
  isNative: boolean;
};

export interface RimvioNativeBridgePlugin {
  isNotificationAccessEnabled(): Promise<{ enabled: boolean }>;
  openNotificationAccessSettings(): Promise<void>;
  getPlatformInfo(): Promise<NativePlatformInfo>;
  addListener(
    eventName: "notificationPosted",
    listenerFunc: (payload: NativeNotificationPayload) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}
