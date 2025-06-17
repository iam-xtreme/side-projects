const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
} = require("electron");
const AutoLaunch = require("auto-launch");
const path = require("path");

const { loadConfig, saveNote } = require("./util");
const constants = require("./constants.json");
const logger = require("./logger");

class NoteApp {
  constructor() {
    this.tray = null;
    this.window = null;
    this.config = null;
    this.isQuitting = false;
    this.autoLauncher = null;
  }

  static getInstance() {
    if (!NoteApp.instance) {
      NoteApp.instance = new NoteApp();
    }
    return NoteApp.instance;
  }

  async init() {
    try {
      // Request single instance lock
      if (!this.requestSingleInstanceLock()) {
        return;
      }

      this.config = await loadConfig(constants.defaultConfig);
      await this.setupAutoLaunch();
      await this.createWindow();
      await this.createTray();
      this.registerGlobalShortcut();
      this.registerIpcHandlers();
      this.setupAppEvents();

      logger.info("App initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize app:", error);
      app.quit();
    }
  }

  requestSingleInstanceLock() {
    const gotLock = app.requestSingleInstanceLock();
    
    if (!gotLock) {
      logger.info("Another instance is already running");
      app.quit();
      return false;
    }

    app.on('second-instance', () => {
      // Someone tried to run a second instance, focus our window instead
      if (this.window) {
        if (this.window.isMinimized()) this.window.restore();
        this.window.show();
        this.window.focus();
      }
    });

    return true;
  }

  async setupAutoLaunch() {
    try {
      this.autoLauncher = new AutoLaunch({
        name: constants.window.title,
        path: app.getPath("exe"),
        isHidden: true, // Start minimized to tray
      });

      const isEnabled = await this.autoLauncher.isEnabled();
      if (!isEnabled) {
        await this.autoLauncher.enable();
        logger.info("Auto-launch enabled");
      }
    } catch (error) {
      logger.error("Auto-launch setup failed:", error);
    }
  }

  async createWindow() {
    if (this.window && !this.window.isDestroyed()) {
      return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowOptions = {
      ...constants.window.default,
      x: width - (constants.window.default.width + constants.window.offset),
      y: height - (constants.window.default.height + constants.window.offset),
      icon: path.join(__dirname, "assets", "icon.png"),
      show: false, // Don't show immediately
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false,
        sandbox: false,
      },
    };

    this.window = new BrowserWindow(windowOptions);
    
    // Load URL
    const loadUrl = this.getLoadUrl();
    await this.window.loadURL(loadUrl);

    // Set up window events
    this.window.on("close", this.handleWindowClose.bind(this));
    this.window.on("closed", () => {
      this.window = null;
    });

    // Show window ready
    this.window.once("ready-to-show", () => {
      if (!app.getLoginItemSettings().wasOpenedAsHidden) {
        this.window.show();
      }
    });

    logger.info("Window created successfully");
  }

  async createTray() {
    if (this.tray && !this.tray.isDestroyed()) {
      return;
    }

    try {
      const iconPath = path.join(__dirname, "assets", "icon.png");
      this.tray = new Tray(iconPath);
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: "Show Notes",
          click: () => this.showWindow(),
        },
        {
          label: "Toggle Auto-launch",
          type: "checkbox",
          checked: await this.isAutoLaunchEnabled(),
          click: (menuItem) => this.toggleAutoLaunch(menuItem.checked),
        },
        { type: "separator" },
        {
          label: "Quit",
          click: () => this.quitApp(),
        },
      ]);

      this.tray.setToolTip(constants.window.title);
      this.tray.setContextMenu(contextMenu);
      
      this.tray.on("click", () => this.showWindow());
      
      logger.info("Tray created successfully");
    } catch (error) {
      logger.error("Failed to create tray:", error);
    }
  }

  showWindow() {
    if (!this.window || this.window.isDestroyed()) {
      this.createWindow();
    } else {
      this.window.show();
      this.window.focus();
    }
  }

  async isAutoLaunchEnabled() {
    try {
      return await this.autoLauncher?.isEnabled() || false;
    } catch (error) {
      logger.error("Failed to check auto-launch status:", error);
      return false;
    }
  }

  async toggleAutoLaunch(enabled) {
    try {
      if (enabled) {
        await this.autoLauncher?.enable();
      } else {
        await this.autoLauncher?.disable();
      }
      logger.info(`Auto-launch ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      logger.error("Failed to toggle auto-launch:", error);
    }
  }

  registerGlobalShortcut() {
    const shortcut = constants.window.globalShortcut;
    
    // Unregister existing shortcut first
    globalShortcut.unregister(shortcut);
    
    const success = globalShortcut.register(shortcut, () => {
      this.showWindow();
    });

    if (!success) {
      logger.error(`Failed to register shortcut: ${shortcut}`);
    } else {
      logger.info(`Global shortcut registered: ${shortcut}`);
    }
  }

  registerIpcHandlers() {
    // Remove existing listeners
    ipcMain.removeAllListeners("save-note");
    ipcMain.removeAllListeners("close-app");
    ipcMain.removeHandler("get-config");

    ipcMain.on("save-note", async (event, data) => {
      try {
        const response = await saveNote(data, this.config.savePath);
        event.sender.send("note-saved", response);
      } catch (error) {
        logger.error("Failed to save note:", error);
        event.sender.send("note-saved", { success: false, error: error.message });
      }
    });

    ipcMain.on("close-app", () => {
      if (this.window) {
        this.window.hide();
      }
    });

    ipcMain.handle("get-config", () => {
      const { saveIntervalInSeconds, isPreviewVisible } = this.config;
      return { saveIntervalInSeconds, isPreviewVisible };
    });
  }

  setupAppEvents() {
    app.on("window-all-closed", (event) => {
      event.preventDefault(); // Prevent quit on window close
    });

    app.on("before-quit", () => {
      this.isQuitting = true;
    });

    app.on("activate", () => {
      // On macOS, re-create window when dock icon is clicked
      if (process.platform === "darwin") {
        this.showWindow();
      }
    });

    app.on("will-quit", () => {
      globalShortcut.unregisterAll();
    });
  }

  getLoadUrl() {
    if (!app.isPackaged) {
      return process.env.VITE_DEV_SERVER_URL || constants.debug.clientUrl;
    }
    return `file://${path.join(__dirname, "../dist/index.html")}`;
  }

  handleWindowClose(event) {
    if (!this.isQuitting) {
      event.preventDefault();
      this.window.hide();
      
      if (process.platform === "darwin") {
        app.dock.hide();
      }
    }
  }

  quitApp() {
    this.isQuitting = true;
    
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
    }
    
    globalShortcut.unregisterAll();
    app.quit();
  }
}

// Initialize app
const noteApp = NoteApp.getInstance();

app.whenReady().then(() => {
  noteApp.init();
});

// Handle app events
app.on("ready", () => {
  // Additional ready logic if needed
});

// Prevent multiple instances
app.on("second-instance", () => {
  // This is handled in requestSingleInstanceLock
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at:", promise, "reason:", reason);
});
