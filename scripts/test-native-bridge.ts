import assert from "node:assert/strict";
import { GlangoNativeBridgeWeb } from "@/lib/native-bridge/glango-native-bridge.web";

async function main() {
  const web = new GlangoNativeBridgeWeb();

  const access = await web.isNotificationAccessEnabled();
  assert.equal(access.enabled, false);

  const platform = await web.getPlatformInfo();
  assert.equal(platform.platform, "web");
  assert.equal(platform.isNative, false);

  console.log("test-native-bridge: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
