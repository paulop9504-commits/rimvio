import { loadConfig, requirePairedCredentials } from "./config.js";
import { CloudClient } from "./cloud-client.js";
import {
  connectThisPc,
  listenPcLocalBridge,
  startPcLocalBridge,
} from "./pairing-server.js";
import { log, logError } from "./logger.js";

/**
 * Packaged Rimvio PC entry: bridge + pairing + heartbeat.
 * Browser execution stays in `index.ts` (dev / later installer).
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

  const heartbeatLoop = setInterval(() => {
    void client.heartbeat().catch((err) => {
      logError("ERROR", "Heartbeat failed", err);
    });
  }, config.heartbeatIntervalMs);

  void client.heartbeat().catch((err) => {
    logError("ERROR", "Initial heartbeat failed", err);
  });
  log("AGENT", "Heartbeat started");

  const shutdown = () => {
    clearInterval(heartbeatLoop);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logError("ERROR", "Fatal", err);
  process.exit(1);
});
