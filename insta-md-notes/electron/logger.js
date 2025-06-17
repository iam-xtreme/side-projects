const path = require("path");
const fs = require("fs");
const { app } = require("electron");

class Logger {
  constructor() {
    this.logLevel = process.env.NODE_ENV === "development" ? "debug" : "info";
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage, ...args);
    
    // In production, you might want to write to a log file
    if (app && app.isPackaged) {
      this.writeToFile(logMessage, args);
    }
  }

  writeToFile(message, args) {
    try {
      const logsDir = path.join(app.getPath("userData"), "logs");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const logFile = path.join(logsDir, "app.log");
      const fullMessage = args.length > 0 ? `${message} ${JSON.stringify(args)}` : message;
      
      fs.appendFileSync(logFile, fullMessage + "\n");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  debug(message, ...args) {
    if (this.logLevel === "debug") {
      this.log("debug", message, ...args);
    }
  }

  info(message, ...args) {
    this.log("info", message, ...args);
  }

  warn(message, ...args) {
    this.log("warn", message, ...args);
  }

  error(message, ...args) {
    this.log("error", message, ...args);
  }
}

module.exports = new Logger();