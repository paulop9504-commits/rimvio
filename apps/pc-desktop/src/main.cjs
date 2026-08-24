const { app, Tray, Menu, nativeImage, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const HEALTH = "http://127.0.0.1:38472/health";

let tray = null;
let agentChild = null;
let quitting = false;
let lastHealth = null;
let updateLabel = "";
let updateReady = false;
let autoUpdater = null;

try {
  autoUpdater = require("electron-updater").autoUpdater;
} catch {
  autoUpdater = null;
}

function packagedAgentPath() {
  return path.join(process.resourcesPath, "agent.cjs");
}

function unpackagedAgentEntry() {
  return path.join(__dirname, "..", "..", "local-agent", "src", "desktop-main.ts");
}

function startAgent() {
  if (agentChild || quitting) {
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
    if (!quitting) {
      setTimeout(startAgent, 2500);
    }
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
  lastHealth = health;
  const paired = Boolean(health?.paired);
  const code = health?.displayCode ? String(health.displayCode) : "";
  const status = paired ? "연결됨" : code ? `연결 준비 ${code}` : "연결 대기";
  const tip = updateLabel ? `Rimvio PC · ${status} · ${updateLabel}` : `Rimvio PC · ${status}`;
  tray.setToolTip(tip);
  const template = [
    { label: `Rimvio PC · ${status}`, enabled: false },
    ...(updateLabel ? [{ label: updateLabel, enabled: false }] : []),
    { type: "separator" },
    {
      label: "Rimvio 열기",
      click: () => {
        void shell.openExternal("https://rimvio.com/?pcConnect=1");
      },
    },
    {
      label: "업데이트 확인",
      click: () => {
        if (autoUpdater && app.isPackaged) {
          updateLabel = "업데이트 확인 중";
          rebuildTray(lastHealth);
          void autoUpdater.checkForUpdates();
        }
      },
    },
  ];
  if (updateReady && autoUpdater) {
    template.push({
      label: "지금 업데이트하고 다시 시작",
      click: () => {
        quitting = true;
        autoUpdater.quitAndInstall(false, true);
      },
    });
  }
  template.push({ type: "separator" }, { label: "종료", click: () => app.quit() });
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function wireAutoUpdate() {
  if (!autoUpdater || !app.isPackaged) {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => {
    updateLabel = "업데이트 확인 중";
    rebuildTray(lastHealth);
  });
  autoUpdater.on("update-available", () => {
    updateLabel = "업데이트 받는 중";
    rebuildTray(lastHealth);
  });
  autoUpdater.on("update-not-available", () => {
    updateLabel = "";
    rebuildTray(lastHealth);
  });
  autoUpdater.on("error", () => {
    updateLabel = "";
    rebuildTray(lastHealth);
  });
  autoUpdater.on("update-downloaded", () => {
    updateReady = true;
    updateLabel = "다시 시작하면 업데이트";
    rebuildTray(lastHealth);
  });
  void autoUpdater.checkForUpdates();
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
  wireAutoUpdate();
  setInterval(() => pollHealth(rebuildTray), 2000);
  pollHealth(rebuildTray);
});

app.on("before-quit", () => {
  quitting = true;
  if (agentChild && !agentChild.killed) {
    agentChild.kill();
  }
});

app.on("window-all-closed", () => {
  /* tray app — stay running */
});
