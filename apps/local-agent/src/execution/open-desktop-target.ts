import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import {
  isPcDesktopAppId,
  type PcDesktopAppId,
} from "../../../../lib/pc-local-agent/pc-desktop-work.ts";
import { log } from "../logger.js";

const execFileAsync = promisify(execFile);

function spawnDetached(file: string, args: string[]): void {
  const child = spawn(file, args, { detached: true, stdio: "ignore" });
  child.unref();
}

async function winStart(target: string): Promise<void> {
  await execFileAsync("cmd.exe", ["/c", "start", "", target], {
    windowsHide: true,
    timeout: 15_000,
  });
}

const WIN_LAUNCH: Record<PcDesktopAppId, { file: string; args: string[] } | { start: string }> = {
  notepad: { file: "notepad.exe", args: [] },
  calc: { file: "calc.exe", args: [] },
  paint: { file: "mspaint.exe", args: [] },
  explorer: { file: "explorer.exe", args: [] },
  downloads: { file: "explorer.exe", args: ["shell:Downloads"] },
  documents: { file: "explorer.exe", args: ["shell:Personal"] },
  "desktop-folder": { file: "explorer.exe", args: ["shell:Desktop"] },
  pictures: { file: "explorer.exe", args: ["shell:My Pictures"] },
  settings: { start: "ms-settings:" },
  snipping: { file: "cmd.exe", args: ["/c", "start", "", "snippingtool"] },
  chrome: { start: "chrome" },
  edge: { start: "msedge" },
  spotify: { start: "spotify:" },
  discord: { start: "Discord" },
  slack: { start: "Slack" },
  kakaotalk: { start: "KakaoTalk" },
  zoom: { start: "Zoom" },
  notion: { start: "Notion" },
  cursor: { start: "Cursor" },
  vscode: { start: "Code" },
  steam: { start: "steam:" },
  excel: { start: "excel" },
  word: { start: "winword" },
  powerpoint: { start: "powerpnt" },
  outlook: { start: "outlook" },
  teams: { start: "ms-teams:" },
};

export async function openPcDesktopApp(appId: string): Promise<void> {
  if (!isPcDesktopAppId(appId)) {
    throw new Error("unknown_desktop_app");
  }
  log("DESKTOP", `Opening ${appId}`);
  if (process.platform === "win32") {
    const spec = WIN_LAUNCH[appId];
    if ("start" in spec) {
      await winStart(spec.start);
      return;
    }
    spawnDetached(spec.file, spec.args);
    return;
  }
  if (process.platform === "darwin") {
    await execFileAsync("open", ["-a", appId], { timeout: 15_000 }).catch(() => undefined);
    return;
  }
  await execFileAsync("xdg-open", ["."], { timeout: 15_000 }).catch(() => undefined);
}
