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
const logger = require("./logger");

class NoteApp {
  constructor() {
    this.tray = null;
    this.window = null;
  }

  async init() {
    this.config = await loadConfig(constants.defaultConfig);
    await this.createWindow();
    await this.createTray();
    this.registerGlobalShortcut();
    this.setupAutoLaunch();
    this.registerIpcHandlers();
  }
  async registerIpcHandlers() {
    ipcMain.on("save-note", async (event, data) => {
      const response = await saveNote(data, this.config.savePath);
      event.sender.send("note-saved", response);
    });

    ipcMain.on("close-app", (event) => this.window.close());

    ipcMain.handle("get-config", () => {
      let { saveIntervalInSeconds, isPreviewVisible } = this.config;
      return {
        saveIntervalInSeconds,
        isPreviewVisible,
      };
    });
  }
  async createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowOptions = {
      ...constants.window.default,
      x: width - (constants.window.default.width + constants.window.offset),
      y: height - (constants.window.default.height + constants.window.offset),
      icon: path.join(__dirname, "assets", "icon.png"),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };

    this.window = new BrowserWindow(windowOptions);
    this.window.loadURL(this.getLoadUrl());
    this.window.on("close", this.handleWindowClose.bind(this));
  }

  async createTray() {
    this.tray = new Tray(path.join(__dirname, "assets", "icon.png"));
    const contextMenu = Menu.buildFromTemplate([
      // Add menu items here
    ]);
    this.tray.setToolTip(constants.window.title);
    this.tray.setContextMenu(contextMenu);
  }

  registerGlobalShortcut() {
    const ret = globalShortcut.register(constants.window.globalShortcut, () => {
      this.window.show();
      this.window.focus();
    });
    if (!ret) {
      logger.error("Failed to register shortcut");
    }
  }

  setupAutoLaunch() {
    const noteAppAutoLauncher = new AutoLaunch({
      name: constants.window.title,
      path: app.getPath("exe"),
    });

    noteAppAutoLauncher.isEnabled().then((isEnabled) => {
      if (!isEnabled) {
        noteAppAutoLauncher.enable().catch((error) => {
          logger.error("Auto-launch setup failed:", error);
        });
      }
    });
  }

  getLoadUrl() {
    const devServer = !app.isPackaged
      ? process.env.VITE_DEV_SERVER_URL || constants.debug.clientUrl
      : undefined;
    return devServer || path.join(__dirname, "../dist/index.html");
  }

  handleWindowClose(event) {
    event.preventDefault();
    this.window.hide();
    if (process.platform === "darwin") {
      app.dock.hide();
    }
  }
}

const noteApp = new NoteApp();
app.on("ready", () => {
  noteApp.init();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
