import http from "node:http";
import { exec } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { CloudClient } from "./cloud-client.js";
import type { AgentConfig } from "./config.js";
import { readPcCredentials, writePcCredentials } from "./credential-store.js";
import { log, logError } from "./logger.js";
import { readPcWork } from "./pc-work-view.js";

function generateDisplayPairingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => alphabet[randomBytes(1)[0]! % alphabet.length]).join("");
  return `${pick(4)}-${pick(2)}`;
}

export const PC_LOCAL_BRIDGE_PORT = 38472;
const BROWSER_FALLBACK_MS = 75_000;

export type PcBridgeState = {
  paired: boolean;
  displayCode: string;
  webPresence: boolean;
  starting: boolean;
};

function cors(res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "win32"
      ? `cmd /c start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => undefined);
}

function healthBody(state: PcBridgeState) {
  const phase = state.paired
    ? "connected"
    : state.starting
      ? "starting"
      : "pairing_required";
  return {
    ok: true,
    paired: state.paired,
    phase,
    displayCode: state.paired ? null : state.displayCode,
    webPresence: state.webPresence,
  };
}

export function startPcLocalBridge(input: {
  config: AgentConfig;
  client: CloudClient;
  initialPaired: boolean;
  onPaired: (next: AgentConfig) => void;
}): { server: http.Server; state: PcBridgeState } {
  const state: PcBridgeState = {
    paired: input.initialPaired,
    displayCode: generateDisplayPairingCode(),
    webPresence: false,
    starting: !input.initialPaired,
  };

  const finish = (next: AgentConfig) => {
    if (state.paired) {
      return;
    }
    state.paired = true;
    writePcCredentials({
      deviceId: next.deviceId,
      deviceToken: next.deviceToken,
      deviceName: next.deviceName,
    });
    input.onPaired(next);
  };

  const server = http.createServer((req, res) => {
    cors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PC_LOCAL_BRIDGE_PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(healthBody(state)));
      return;
    }

    if (req.method === "GET" && url.pathname === "/work") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(readPcWork()));
      return;
    }

    if (req.method === "POST" && url.pathname === "/announce") {
      state.webPresence = true;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/web-pair") {
      void (async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        let body: { code?: string; deviceName?: string; consent?: boolean } = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            code?: string;
            deviceName?: string;
            consent?: boolean;
          };
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "invalid_json" }));
          return;
        }
        if (!body.consent) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "consent_required" }));
          return;
        }
        if (state.paired) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, already: true }));
          return;
        }
        try {
          const result = await input.client.pairWithCode(
            body.code ?? "",
            body.deviceName || input.config.deviceName,
          );
          const next = {
            ...input.config,
            deviceId: result.deviceId,
            deviceToken: result.deviceToken,
            deviceName: result.deviceName,
          };
          finish(next);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, deviceName: result.deviceName }));
        } catch (err) {
          logError("ERROR", "web-pair failed", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "pair_failed" }));
        }
      })();
      return;
    }

    if (req.method === "GET" && url.pathname === "/callback") {
      const nonce = url.searchParams.get("nonce") ?? "";
      const exchange = url.searchParams.get("exchange") ?? "";
      void (async () => {
        try {
          const result = await input.client.exchangeDesktopSession(nonce, exchange);
          const next = {
            ...input.config,
            deviceId: result.deviceId,
            deviceToken: result.deviceToken,
            deviceName: result.deviceName,
          };
          finish(next);
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Rimvio PC connected");
        } catch (err) {
          logError("ERROR", "desktop exchange failed", err);
          res.writeHead(400);
          res.end("connect_failed");
        }
      })();
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return { server, state };
}

export async function listenPcLocalBridge(
  server: http.Server,
  state?: PcBridgeState,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PC_LOCAL_BRIDGE_PORT, "127.0.0.1", () => resolve());
  });
  if (state) {
    state.starting = false;
  }
}

export async function connectThisPc(
  config: AgentConfig,
  client: CloudClient,
  bridge: { state: PcBridgeState },
): Promise<AgentConfig> {
  if (config.deviceId && config.deviceToken) {
    bridge.state.paired = true;
    return config;
  }

  log("AGENT", `Waiting for Rimvio to approve this PC (${bridge.state.displayCode})`);

  void (async () => {
    await new Promise((r) => setTimeout(r, BROWSER_FALLBACK_MS));
    if (bridge.state.paired || bridge.state.webPresence) {
      return;
    }
    try {
      const session = await client.createDesktopSession(config.deviceName, PC_LOCAL_BRIDGE_PORT);
      log("AGENT", "Open Rimvio in the browser to finish connecting");
      openBrowser(session.approveUrl);
    } catch (err) {
      logError("ERROR", "desktop session failed", err);
    }
  })();

  while (!bridge.state.paired) {
    await new Promise((r) => setTimeout(r, 400));
  }
  const stored = readPcCredentials();
  return {
    ...config,
    deviceId: stored?.deviceId || config.deviceId,
    deviceToken: stored?.deviceToken || config.deviceToken,
    deviceName: stored?.deviceName || config.deviceName,
  };
}
