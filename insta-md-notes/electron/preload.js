const { contextBridge, ipcRenderer } = require("electron");

// Store reference to callback for cleanup
let saveCompleteCallback = null;

// Cleanup function to prevent memory leaks
const cleanup = () => {
  if (saveCompleteCallback) {
    ipcRenderer.removeListener("note-saved", saveCompleteCallback);
    saveCompleteCallback = null;
  }
};

// Expose APIs with improved error handling
contextBridge.exposeInMainWorld("noteAPI", {
  saveNoteToFile: (noteContent) => {
    if (typeof noteContent !== "string" && typeof noteContent !== "object") {
      console.error("Invalid note content type");
      return false;
    }
    try {
      ipcRenderer.send("save-note", noteContent);
      return true;
    } catch (error) {
      console.error("Failed to save note:", error);
      return false;
    }
  },

  onSaveComplete: (callback) => {
    if (typeof callback !== "function") {
      console.error("Callback must be a function");
      return false;
    }

    // Clean up previous listener to prevent memory leaks
    cleanup();

    // Store reference for later cleanup
    saveCompleteCallback = (event, ...args) => callback(event, ...args);
    ipcRenderer.on("note-saved", saveCompleteCallback);

    // Return cleanup function for component unmounting
    return cleanup;
  },

  close: () => {
    try {
      cleanup(); // Clean up listeners
      ipcRenderer.send("close-app");
      return true;
    } catch (error) {
      console.error("Failed to close app:", error);
      return false;
    }
  },

  getConfig: async () => {
    try {
      return await ipcRenderer.invoke("get-config");
    } catch (error) {
      console.error("Failed to get config:", error);
      return { saveIntervalInSeconds: 60, isPreviewVisible: false };
    }
  },

  openFileExplorer: () => {
    try {
      ipcRenderer.send("open-file-explorer");
      return true;
    } catch (error) {
      console.error("Failed to open file explorer:", error);
      return false;
    }
  },
});

// Clean up when window unloads
window.addEventListener("unload", cleanup);
