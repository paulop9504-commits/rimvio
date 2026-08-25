import { loadConfig, requirePairedCredentials } from "./config.js";
import { CloudClient } from "./cloud-client.js";
import { createExecutionEngine } from "./execution/index.js";
import { writePcCredentials } from "./credential-store.js";
import {
  connectThisPc,
  listenPcLocalBridge,
  startPcLocalBridge,
} from "./pairing-server.js";
import { startPairedWorkLoops } from "./run-paired-agent.js";
import { log, logError } from "./logger.js";

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

  if (process.argv.includes("--pair")) {
    log("AGENT", "Connecting this PC to Rimvio…");
    const result = await client.pair();
    writePcCredentials({
      deviceId: result.deviceId,
      deviceToken: result.deviceToken,
      deviceName: result.deviceName,
    });
    config.deviceId = result.deviceId;
    config.deviceToken = result.deviceToken;
    config.deviceName = result.deviceName;
    log("AGENT", "Connected");
  } else if (!config.deviceId || !config.deviceToken) {
    const next = await connectThisPc(config, client, { state });
    config.deviceId = next.deviceId;
    config.deviceToken = next.deviceToken;
    config.deviceName = next.deviceName;
  }

  requirePairedCredentials(config);
  log("AGENT", "Connected");
  log("AGENT", `Cloud ${config.apiBaseUrl}`);
  log("AGENT", `Device ${config.deviceId}`);
  log("AGENT", `Engine ${config.executionEngine}`);

  const engine = createExecutionEngine(config.executionEngine);
  const { stop } = startPairedWorkLoops({ config, client, engine });

  const shutdown = () => {
    log("AGENT", "Shutting down...");
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
