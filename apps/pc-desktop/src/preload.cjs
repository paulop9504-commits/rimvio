const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rimvioPc", {
  snapshot: () => ipcRenderer.invoke("pc-snapshot"),
  openRimvio: () => ipcRenderer.invoke("pc-open-rimvio"),
});
