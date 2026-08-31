/**
 * Dev server control for a cloned repo workspace.
 * Serverless (Vercel) cannot keep a long-lived Next process — fail closed.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type DevServerState = {
  readonly platformId: string;
  readonly root: string;
  readonly port: number;
  readonly pid: number | null;
  readonly url: string | null;
  readonly status: "stopped" | "starting" | "running" | "unavailable";
  readonly logs: readonly string[];
  readonly reason?: string;
};

type LiveServer = {
  process: ChildProcess;
  state: DevServerState;
};

const SERVERS = new Map<string, LiveServer>();

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function nextDevCommand(): { file: string; args: string[] } {
  if (process.platform === "win32") {
    return { file: "npx.cmd", args: ["next", "dev"] };
  }
  return { file: "npx", args: ["next", "dev"] };
}

function defaultPort(platformId: string): number {
  let hash = 0;
  for (let i = 0; i < platformId.length; i += 1) {
    hash = (hash + platformId.charCodeAt(i) * 13) % 100;
  }
  return 3100 + hash;
}

export function readDevServerState(platformId: string): DevServerState | null {
  return SERVERS.get(platformId)?.state ?? null;
}

export async function startDevServer(input: {
  readonly platformId: string;
  readonly root: string;
  readonly port?: number;
}): Promise<DevServerState> {
  const existing = SERVERS.get(input.platformId);
  if (existing && (existing.state.status === "running" || existing.state.status === "starting")) {
    return existing.state;
  }

  if (isServerless()) {
    return {
      platformId: input.platformId,
      root: input.root,
      port: input.port ?? defaultPort(input.platformId),
      pid: null,
      url: null,
      status: "unavailable",
      logs: [],
      reason: "dev server cannot stay up on serverless — run locally",
    };
  }

  if (!existsSync(join(input.root, "package.json"))) {
    return {
      platformId: input.platformId,
      root: input.root,
      port: input.port ?? defaultPort(input.platformId),
      pid: null,
      url: null,
      status: "unavailable",
      logs: [],
      reason: "package.json missing",
    };
  }

  const port = input.port ?? defaultPort(input.platformId);
  const cmd = nextDevCommand();
  const child = spawn(cmd.file, [...cmd.args, "-p", String(port)], {
    cwd: input.root,
    windowsHide: true,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs: string[] = [];
  const pushLog = (chunk: Buffer | string) => {
    const text = String(chunk).trim();
    if (!text) return;
    logs.push(text.slice(0, 240));
    if (logs.length > 40) logs.shift();
    const live = SERVERS.get(input.platformId);
    if (live) {
      live.state = { ...live.state, logs: [...logs] };
    }
  };

  child.stdout?.on("data", pushLog);
  child.stderr?.on("data", pushLog);

  const state: DevServerState = {
    platformId: input.platformId,
    root: input.root,
    port,
    pid: child.pid ?? null,
    url: `http://127.0.0.1:${port}`,
    status: "starting",
    logs,
  };
  SERVERS.set(input.platformId, { process: child, state });

  child.on("exit", () => {
    const live = SERVERS.get(input.platformId);
    if (live) {
      live.state = { ...live.state, status: "stopped", pid: null };
    }
  });

  const ready = await waitForHealth(`http://127.0.0.1:${port}`, 20_000);
  const live = SERVERS.get(input.platformId);
  if (live) {
    live.state = {
      ...live.state,
      status: ready ? "running" : child.exitCode == null ? "starting" : "stopped",
      logs: [...logs],
    };
    return live.state;
  }
  return { ...state, status: ready ? "running" : "starting" };
}

export function stopDevServer(platformId: string): DevServerState {
  const live = SERVERS.get(platformId);
  if (!live) {
    return {
      platformId,
      root: "",
      port: 0,
      pid: null,
      url: null,
      status: "stopped",
      logs: [],
    };
  }
  try {
    live.process.kill();
  } catch {
    /* already dead */
  }
  live.state = { ...live.state, status: "stopped", pid: null };
  SERVERS.delete(platformId);
  return live.state;
}

async function waitForHealth(url: string, timeoutMs: number): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 404) return true;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

export function inferDevServerCommand(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts?.dev ?? "next dev";
  } catch {
    return "next dev";
  }
}
