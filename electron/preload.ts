import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("onedayDesktop", {
  platform: process.platform,
  version: process.versions.electron,
});
