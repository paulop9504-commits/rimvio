import { loadConfig, requirePairedCredentials } from "./config.js";
import { CloudClient } from "./cloud-client.js";
import {
  connectThisPc,
  listenPcLocalBridge,
  startPcLocalBridge,
} from "./pairing-server.js";
import { SystemBrowserEngine } from "./execution/system-browser-engine.js";
import { startPairedWorkLoops } from "./run-paired-agent.js";
import { log, logError } from "./logger.js";

/**
 * Packaged Rimvio PC: pair, heartbeat, claim cloud tasks, open the system browser.
 * Playwright stays in the dev `index.ts` entry only.
 */
async function main(): Promise<void> {
  const config = loadConfig(process.argv.slice(2));
  const client = new CloudClient(config);

  const { server, state } = startPcLocalBridge({
    config,
    client,
    initialPaired: Boolean(config.deviceId && config.deviceToken),
    onPaired: (next) => {
      config.deviceId = next.deviceId;
      config.deviceToken = next.deviceToken;
      config.deviceName = next.deviceName;
    },
  });
  await listenPcLocalBridge(server, state);
  log("AGENT", "Rimvio PC is running");

  if (!config.deviceId || !config.deviceToken) {
    const next = await connectThisPc(config, client, { state });
    config.deviceId = next.deviceId;
    config.deviceToken = next.deviceToken;
    config.deviceName = next.deviceName;
  }

  requirePairedCredentials(config);
  log("AGENT", "Connected");
  log("AGENT", `Cloud ${config.apiBaseUrl}`);
  log("AGENT", `Device ${config.deviceId}`);

  const { stop } = startPairedWorkLoops({
    config,
    client,
    engine: new SystemBrowserEngine(),
  });

  const shutdown = () => {
    stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logError("ERROR", "Fatal", err);
  process.exit(1);
});
