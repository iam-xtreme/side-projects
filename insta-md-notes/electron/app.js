const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  globalShortcut,
} = require("electron");
const AutoLaunch = require("auto-launch");
const path = require("path");
const { ipcMain } = require("electron");

const { loadConfig, saveNote } = require("./util");
const constants = require("./constants.json");
const config = loadConfig(constants.defaultConfig);
const _icon = path.join(__dirname, "assets", "icon.png");
let tray = null;
let _window;

const noteAppAutoLauncher = new AutoLaunch({
  name: constants.window.title,
  path: app.getPath("exe"),
});

ipcMain.on("save-note", (event, data) =>
  saveNote(data, config.savePath, event)
);
ipcMain.on("close-app", (event) => _window.close());

ipcMain.handle("get-config", () => {
  let { saveIntervalInSeconds, isPreviewVisible, ...rest } = config;
  return {
    saveIntervalInSeconds,
    isPreviewVisible,
  };
});

createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  _window = new BrowserWindow({
    ...constants.window.default,
    x: width - (constants.window.default.width + constants.window.offset),
    y: height - (constants.window.default.height + constants.window.offset),
    icon: _icon,
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
    _window.loadURL(devServer);
  } else {
    _window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  _window.on("close", (event) => {
    event.preventDefault();
    _window.hide();
    // If you want to run completely in the background on macOS:
    if (process.platform === "darwin") {
      app.dock.hide();
    }
  });
};

app.whenReady().then(() => {
  noteAppAutoLauncher.isEnabled().then((isEnabled) => {
    if (!isEnabled) {
      noteAppAutoLauncher.enable().catch((err) => {
        console.error("Auto-launch setup failed:", err);
      });
    }
  });

  createWindow();
  tray = new Tray(_icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: `Open ${constants.window.title}`, click: () => _window.show() },
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setToolTip(constants.window.title);
  tray.setContextMenu(contextMenu);

  // 🧷 Register global shortcut
  const ret = globalShortcut.register(constants.window.globalShortcut, () => {
    _window.show();
    _window.focus();
  });

  if (!ret) {
    console.error("Failed to register shortcut");
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
