const { app, BrowserWindow, screen } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");

const { loadConfig, saveNote } = require("./util");
const constants = require("./constants.json");

const config = loadConfig(constants.defaultConfig);

ipcMain.on("save-note", (event, data) => saveNote(data, config.savePath, event));

ipcMain.handle("get-config", () => {
  let { saveIntervalInSeconds, isPreviewVisible, ...rest } = config;
  return {
    saveIntervalInSeconds,
    isPreviewVisible,
  };
});

createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const appWindow = new BrowserWindow({ 
    ...constants.window.default,   
    x: width - (constants.window.default.width + constants.window.offset),
    y: height - (constants.window.default.height + constants.window.offset),   
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServer = !app.isPackaged
    ? process.env.VITE_DEV_SERVER_URL || "http://localhost:3000"
    : undefined;
  if (devServer) {
    appWindow.loadURL(devServer);
  } else {
    appWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(createWindow);
