const { app, Tray, Menu, nativeImage, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const HEALTH = "http://127.0.0.1:38472/health";

let tray = null;
let agentChild = null;

function packagedAgentPath() {
  return path.join(process.resourcesPath, "agent.cjs");
}

function unpackagedAgentEntry() {
  return path.join(__dirname, "..", "..", "local-agent", "src", "desktop-main.ts");
}

function startAgent() {
  if (agentChild) {
    return;
  }
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    RIMVIO_API_BASE_URL: process.env.RIMVIO_API_BASE_URL || "https://rimvio.com",
  };

  if (app.isPackaged && fs.existsSync(packagedAgentPath())) {
    agentChild = spawn(process.execPath, [packagedAgentPath()], {
      env,
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    const cwd = path.join(__dirname, "..", "..", "local-agent");
    const tsxBin = path.join(cwd, "node_modules", "tsx", "dist", "cli.mjs");
    const entry = unpackagedAgentEntry();
    if (fs.existsSync(tsxBin) && fs.existsSync(entry)) {
      agentChild = spawn(process.execPath, [tsxBin, entry], {
        cwd,
        env,
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      agentChild = spawn("npx", ["tsx", "src/desktop-main.ts"], {
        cwd,
        env,
        stdio: "ignore",
        shell: true,
        windowsHide: true,
      });
    }
  }

  agentChild.on("exit", () => {
    agentChild = null;
  });
}

function pollHealth(onUpdate) {
  http
    .get(HEALTH, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          onUpdate(JSON.parse(body));
        } catch {
          onUpdate(null);
        }
      });
    })
    .on("error", () => onUpdate(null));
}

function rebuildTray(health) {
  if (!tray) {
    return;
  }
  const paired = Boolean(health?.paired);
  const code = health?.displayCode ? String(health.displayCode) : "";
  const status = paired ? "연결됨" : code ? `연결 준비 ${code}` : "연결 대기";
  tray.setToolTip(`Rimvio PC · ${status}`);
  const menu = Menu.buildFromTemplate([
    { label: `Rimvio PC · ${status}`, enabled: false },
    { type: "separator" },
    {
      label: "Rimvio 열기",
      click: () => {
        void shell.openExternal("https://rimvio.com/?pcConnect=1");
      },
    },
    { type: "separator" },
    { label: "종료", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

const TRAY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIUlEQVQ4y2NgGAWjYBSMglEwCkbBKBgFo2AUjIJRMAoGNwAAM/wBAQ0Kz4oAAAAASUVORK5CYII=";

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setLoginItemSettings({ openAtLogin: true, enabled: true });
  }
  tray = new Tray(nativeImage.createFromDataURL(TRAY_PNG));
  rebuildTray(null);
  startAgent();
  setInterval(() => pollHealth(rebuildTray), 2000);
  pollHealth(rebuildTray);
});

app.on("before-quit", () => {
  if (agentChild && !agentChild.killed) {
    agentChild.kill();
  }
});

app.on("window-all-closed", () => {
  /* tray app — stay running */
});
