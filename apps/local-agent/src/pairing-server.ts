import http from "node:http";
import { exec } from "node:child_process";
import type { CloudClient } from "./cloud-client.js";
import type { AgentConfig } from "./config.js";
import { writePcCredentials } from "./credential-store.js";
import { log, logError } from "./logger.js";

const PORT = 38472;
const WEB_PAIR_WAIT_MS = 90_000;

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

export async function connectThisPc(config: AgentConfig, client: CloudClient): Promise<AgentConfig> {
  let paired = Boolean(config.deviceId && config.deviceToken);
  let resolvePair: ((value: AgentConfig) => void) | null = null;
  const done = new Promise<AgentConfig>((resolve) => {
    resolvePair = resolve;
  });

  const finish = (next: AgentConfig) => {
    paired = true;
    writePcCredentials({
      deviceId: next.deviceId,
      deviceToken: next.deviceToken,
      deviceName: next.deviceName,
    });
    resolvePair?.(next);
  };

  const server = http.createServer((req, res) => {
    cors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, paired }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/web-pair") {
      void (async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        let body: { code?: string; deviceName?: string } = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            code?: string;
            deviceName?: string;
          };
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "invalid_json" }));
          return;
        }
        try {
          const result = await client.pairWithCode(body.code ?? "", body.deviceName || config.deviceName);
          const next = {
            ...config,
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
          const result = await client.exchangeDesktopSession(nonce, exchange);
          const next = {
            ...config,
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

  await new Promise<void>((resolve) => {
    server.listen(PORT, "127.0.0.1", () => resolve());
  });
  log("AGENT", "Waiting to connect this PC");

  const timedOut = await Promise.race([
    done.then(() => false),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(true), WEB_PAIR_WAIT_MS);
    }),
  ]);

  if (timedOut && !paired) {
    try {
      const session = await client.createDesktopSession(config.deviceName, PORT);
      log("AGENT", "Open Rimvio in the browser to finish connecting");
      openBrowser(session.approveUrl);
    } catch (err) {
      logError("ERROR", "desktop session failed", err);
    }
  }

  const next = await done;
  server.close();
  return next;
}
