const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  shell,
} = require("electron");
const AutoLaunch = require("auto-launch");
const path = require("path");
const fs = require("fs");
const os = require("os");

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
    this.initialized = false;
  }

  static getInstance() {
    if (!NoteApp.instance) {
      NoteApp.instance = new NoteApp();
    }
    return NoteApp.instance;
  }

  async init() {
    try {
      // Prevent multiple initializations
      if (this.initialized) {
        logger.warn("App already initialized, skipping");
        return;
      }

      // Request single instance lock first thing
      if (!this.requestSingleInstanceLock()) {
        return;
      }

      // Load configuration before anything else
      this.config = await loadConfig(constants.defaultConfig);
      
      // Setup autolaunch based on platform
      await this.setupPlatformSpecificAutoLaunch();
      
      // Only create UI components after ensuring we're the only instance
      await this.createWindow();
      await this.createTray();
      
      // Register shortcuts and handlers
      this.registerGlobalShortcut();
      this.registerIpcHandlers();
      this.setupAppEvents();

      this.initialized = true;
      logger.info("App initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize app:", error);
      this.quitApp();
    }
  }

  requestSingleInstanceLock() {
    // Check for lock file first (extra safety)
    this.checkAndCreateLockFile();
    
    const gotLock = app.requestSingleInstanceLock();
    
    if (!gotLock) {
      logger.info("Another instance is already running");
      
      // Attempt to focus the existing instance
      setTimeout(() => app.quit(), 500); // Delay quit to allow focus request
      return false;
    }

    app.on('second-instance', (event, commandLine, workingDirectory) => {
      logger.info("Second instance detected");
      
      // Show and focus our window
      if (this.window) {
        if (this.window.isMinimized()) this.window.restore();
        this.window.show();
        this.window.focus();
      }
    });

    return true;
  }

  checkAndCreateLockFile() {
    try {
      const lockPath = path.join(app.getPath('userData'), 'app.lock');
      
      // Check if process with PID in lock file is still running
      if (fs.existsSync(lockPath)) {
        const pid = fs.readFileSync(lockPath, 'utf8');
        
        try {
          // On Windows, this throws an error if process doesn't exist
          process.kill(parseInt(pid, 10), 0);
          logger.info(`Process with PID ${pid} still running`);
          return false;
        } catch (e) {
          // Process not running, continue with new lock
          logger.info("Stale lock file found, creating new one");
        }
      }
      
      // Create lock file with current PID
      fs.writeFileSync(lockPath, process.pid.toString());
      
      // Remove lock file on exit
      const cleanup = () => {
        try {
          if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath);
          }
        } catch (err) {
          logger.error("Failed to remove lock file:", err);
        }
      };
      
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      
      return true;
    } catch (error) {
      logger.error("Lock file error:", error);
      return false;
    }
  }

  async setupPlatformSpecificAutoLaunch() {
    try {
      // Platform-specific logic for auto-launch
      const appName = constants.window.title;
      
      if (process.platform === 'darwin') {
        // macOS specific settings
        this.autoLauncher = new AutoLaunch({
          name: appName,
          path: app.getPath("exe"),
          mac: {
            useLaunchAgent: true,
          },
          isHidden: true,
        });
      } else if (process.platform === 'win32') {
        // Windows specific settings
        const appPath = process.execPath;
        this.autoLauncher = new AutoLaunch({
          name: appName,
          path: appPath,
          isHidden: true,
        });
      } else {
        // Linux specific settings
        this.autoLauncher = new AutoLaunch({
          name: appName,
          path: app.getPath("exe"),
          isHidden: true,
        });
      }

      const isEnabled = await this.autoLauncher.isEnabled().catch(err => {
        logger.error("Error checking autolaunch status:", err);
        return false;
      });
      
      if (!isEnabled) {
        await this.autoLauncher.enable().catch(err => {
          logger.error("Error enabling autolaunch:", err);
        });
        logger.info("Auto-launch enabled");
      }
    } catch (error) {
      logger.error("Auto-launch setup failed:", error);
      // Continue app execution even if autolaunch setup fails
    }
  }

  async createWindow() {
    // Don't recreate existing window
    if (this.window && !this.window.isDestroyed()) {
      return;
    }

    // Get screen dimensions for positioning
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    // Setup window options
    const windowOptions = {
      ...constants.window.default,
      x: width - (constants.window.default.width + constants.window.offset),
      y: height - (constants.window.default.height + constants.window.offset),
      icon: path.join(__dirname, "assets", "icon.png"),
      show: false, // Don't show until ready
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false,
        sandbox: true, // Enable sandbox for security
      },
    };

    // Create window
    this.window = new BrowserWindow(windowOptions);
    
    // Load content
    const loadUrl = this.getLoadUrl();
    await this.window.loadURL(loadUrl).catch(err => {
      logger.error("Failed to load URL:", err);
      throw err; // Re-throw to be caught by init()
    });

    // Set up window events
    this.window.on("close", this.handleWindowClose.bind(this));
    this.window.on("closed", () => {
      this.window = null;
    });

    // Show window when ready - critical for performance
    this.window.once("ready-to-show", () => {
      const settings = app.getLoginItemSettings();
      if (!settings.wasOpenedAsHidden && !settings.wasOpenedAtLogin) {
        this.window.show();
      }
    });

    logger.info("Window created successfully");
  }

  async createTray() {
    // Don't recreate existing tray
    if (this.tray && !this.tray.isDestroyed()) {
      return;
    }

    try {
      // Use platform-specific icon path logic
      let iconPath;
      if (process.platform === 'darwin') {
        iconPath = path.join(__dirname, "assets", "icon-mac.png");
      } else if (process.platform === 'win32') {
        iconPath = path.join(__dirname, "assets", "icon-win.ico");
      } else {
        iconPath = path.join(__dirname, "assets", "icon.png");
      }

      // Fallback to default if specific icon doesn't exist
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(__dirname, "assets", "icon.png");
      }

      this.tray = new Tray(iconPath);
      
      // Create menu with efficient menu template
      const contextMenu = Menu.buildFromTemplate([
        {
          label: "Show Notes",
          click: () => this.showWindow(),
        },
        {
          label: "Auto-launch on Startup",
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
      
      // Use single click for simplicity and performance
      this.tray.on("click", () => this.showWindow());
      
      logger.info("Tray created successfully");
    } catch (error) {
      logger.error("Failed to create tray:", error);
      // Continue without tray if it fails
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
    if (!this.autoLauncher) return false;
    
    try {
      return await this.autoLauncher.isEnabled();
    } catch (error) {
      logger.error("Failed to check auto-launch status:", error);
      return false;
    }
  }

  async toggleAutoLaunch(enabled) {
    if (!this.autoLauncher) {
      await this.setupPlatformSpecificAutoLaunch();
      if (!this.autoLauncher) return;
    }
    
    try {
      if (enabled) {
        await this.autoLauncher.enable();
      } else {
        await this.autoLauncher.disable();
      }
      logger.info(`Auto-launch ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      logger.error("Failed to toggle auto-launch:", error);
    }
  }

  registerGlobalShortcut() {
    const shortcut = constants.window.globalShortcut;
    
    // Always unregister existing shortcuts first
    globalShortcut.unregisterAll();
    
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
    // Clean up existing listeners to prevent memory leaks
    ipcMain.removeAllListeners("save-note");
    ipcMain.removeAllListeners("close-app");
    ipcMain.removeAllListeners("open-file-explorer");
    ipcMain.removeHandler("get-config");

    // Register handlers with proper error handling
    ipcMain.on("save-note", async (event, data) => {
      try {
        const response = await saveNote(data, this.config.savePath);
        // Check if sender is still valid to prevent crashes
        if (event.sender.isDestroyed()) return;
        event.sender.send("note-saved", response);
      } catch (error) {
        logger.error("Failed to save note:", error);
        if (!event.sender.isDestroyed()) {
          event.sender.send("note-saved", { success: false, error: error.message });
        }
      }
    });

    ipcMain.on("close-app", () => {
      if (this.window) {
        this.window.hide();
      }
    });

    ipcMain.on("open-file-explorer", async (event) => {
      try {
        const savePath = this.config.savePath || path.join(os.homedir(), 'Desktop');
        // Open the file explorer at the save path
        await shell.openPath(savePath);
      } catch (error) {
        logger.error("Failed to open file explorer:", error);
        // Fallback to opening the desktop
        try {
          await shell.openPath(path.join(os.homedir(), 'Desktop'));
        } catch (fallbackError) {
          logger.error("Failed to open desktop:", fallbackError);
        }
      }
    });

    ipcMain.handle("get-config", () => {
      const { saveIntervalInSeconds, isPreviewVisible } = this.config;
      return { saveIntervalInSeconds, isPreviewVisible };
    });
  }

  setupAppEvents() {
    // Prevent app from closing when all windows are closed
    app.on("window-all-closed", (event) => {
      event.preventDefault();
      if (process.platform !== "darwin") {
        this.window = null;
      }
    });

    // Set flag when app is about to quit
    app.on("before-quit", () => {
      this.isQuitting = true;
    });

    // Handle macOS dock click
    app.on("activate", () => {
      if (process.platform === "darwin") {
        this.showWindow();
      }
    });

    // Clean up before quitting
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
      
      if (process.platform === "darwin" && app.dock) {
        app.dock.hide();
      }
    }
  }

  quitApp() {
    this.isQuitting = true;
    
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
      this.tray = null;
    }
    
    globalShortcut.unregisterAll();
    app.quit();
  }
}

// Enforce single instance with delay to avoid race conditions
let instanceLock = null;
const acquireInstanceLock = () => {
  if (!instanceLock) {
    instanceLock = app.requestSingleInstanceLock();
    if (!instanceLock) {
      logger.warn("Another instance is already running, exiting");
      app.exit(0);
      return false;
    }
  }
  return true;
};

// Add small delay to ensure proper lock handling
setTimeout(() => {
  if (!acquireInstanceLock()) return;
  
  // Initialize app instance
  const noteApp = NoteApp.getInstance();

  app.whenReady().then(() => {
    noteApp.init().catch(err => {
      logger.error("Failed to initialize app:", err);
      app.exit(1);
    });
  });
}, 100);

// Ensure clean exit on crashes and uncaught errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at:", promise, "reason:", reason);
});
