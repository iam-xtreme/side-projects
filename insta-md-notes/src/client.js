import { marked } from "marked";
import "./style.css";

const elements = {
  note: document.getElementById("note"),
  preview: document.getElementById("preview"),
  hidePreviewBtn: document.getElementById("hide-preview"),
  closeSaveBtn: document.getElementById("close-save"),
  openNotesBtn: document.getElementById("open-notes"),
  log: document.getElementById("log"),
};

// Configuration
const config = {
  hiddenClass: "hidden",
  debounceDelay: 300, // ms delay for debounced functions
  autoSaveInterval: 30000, // 30 seconds
};

// State management
const state = {
  sessionKey: "",
  isPreviewVisible: true,
  pendingChanges: false,
  autoSaveTimer: null,
  lastSaved: Date.now(),
};

/**
 * Utility functions
 */
// Format date for session keys and display
const getDateString = (date = new Date()) => {
  return date.toISOString().slice(0, 16).replace("T", " ");
};

// Debounce function to limit execution frequency
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// Safe localStorage access with error handling
const safeStorageOp = (operation, key, value) => {
  try {
    if (operation === "get") {
      return localStorage.getItem(key);
    } else if (operation === "set") {
      localStorage.setItem(key, value);
      return true;
    } else if (operation === "remove") {
      localStorage.removeItem(key);
      return true;
    }
  } catch (error) {
    console.error(`Storage operation failed: ${error.message}`);
    return operation === "get" ? null : false;
  }
};

/**
 * Core functionality
 */
// Process note content and update preview
const processNote = () => {
  const content = elements.note.value;
  safeStorageOp("set", state.sessionKey, content);

  // Only parse markdown when preview is visible
  if (state.isPreviewVisible) {
    try {
      elements.preview.innerHTML = marked.parse(content);
    } catch (error) {
      elements.preview.innerHTML = `<p class="error">Error parsing markdown: ${error.message}</p>`;
    }
  }

  state.pendingChanges = true;
};

// Debounced version of processNote to improve performance
const debouncedProcessNote = debounce(processNote, config.debounceDelay);

// Save note to disk through the main process
const saveNote = async () => {
  const content = safeStorageOp("get", state.sessionKey);
  if (!content) return;

  try {
    window?.noteAPI?.saveNoteToFile({ time: state.sessionKey, content });
    state.lastSaved = Date.now();
    // We'll wait for the save complete event before clearing pendingChanges
  } catch (error) {
    console.error("Failed to save note:", error);
    logMessage(`Error saving note: ${error.message}`, true);
  }
};

// Autosave at regular intervals if there are changes
const setupAutoSave = () => {
  // Clear any existing timer
  if (state.autoSaveTimer) {
    clearInterval(state.autoSaveTimer);
  }

  // Set up new autosave timer
  state.autoSaveTimer = setInterval(() => {
    if (state.pendingChanges) {
      saveNote();
    }
  }, config.autoSaveInterval);
};

// Add entry to the log display
const logMessage = (message, isError = false) => {
  const logClass = isError ? "log-error" : "log-success";
  elements.log.innerHTML += `<div class="${logClass}">${message}</div>`;

  // Auto-scroll log to bottom
  elements.log.scrollTop = elements.log.scrollHeight;

  // Limit log entries to prevent memory bloat
  const maxEntries = 50;
  const entries = elements.log.children;
  while (entries.length > maxEntries) {
    elements.log.removeChild(entries[0]);
  }
};

// Close application after saving
const closeApp = async () => {
  if (state.pendingChanges) {
    await saveNote();
    // Give a small delay to ensure save completes
    setTimeout(() => {
      window?.noteAPI?.close();
    }, 300);
  } else {
    window?.noteAPI?.close();
  }
};

// Toggle preview visibility
const togglePreview = (visibility) => {
  if (typeof visibility === "boolean") {
    state.isPreviewVisible = visibility;
  } else {
    state.isPreviewVisible = !state.isPreviewVisible;
  }

  elements.preview.classList.toggle(
    config.hiddenClass,
    !state.isPreviewVisible
  );
  elements.hidePreviewBtn.textContent = state.isPreviewVisible
    ? "Hide Preview"
    : "Show Preview";

  // Update preview content if becoming visible
  if (state.isPreviewVisible) {
    processNote();
  }
};

/**
 * Event handlers
 */
const registerEventHandlers = () => {
  // Input handling with debounce for performance
  elements.note.addEventListener("input", debouncedProcessNote);

  // Button handlers
  elements.closeSaveBtn.addEventListener("click", closeApp);
  elements.hidePreviewBtn.addEventListener("click", () => togglePreview());
  elements.openNotesBtn.addEventListener("click", () => {
    if (window.noteAPI?.openFileExplorer) {
      window.noteAPI.openFileExplorer();
      logMessage("Opening file explorer...");
    } else {
      logMessage("File explorer functionality not available", true);
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Save shortcut (Ctrl+S)
    if (e.key.toLowerCase() === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveNote();
    }

    // Close shortcut (Ctrl+W)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
      e.preventDefault();
      closeApp();
    }
  });

  // Register IPC event handlers
  if (window.noteAPI?.onSaveComplete) {
    window.noteAPI.onSaveComplete((event, response) => {
      if (response && response.isSuccess) {
        safeStorageOp("remove", state.sessionKey);
        logMessage(`Note from <b>${state.sessionKey}</b> saved successfully.`);
        state.sessionKey = getDateString();
        state.pendingChanges = false;
      } else {
        logMessage(
          `Failed to save note: ${response?.error || "Unknown error"}`,
          true
        );
      }
    });
  }

  // Handle window beforeunload to prevent data loss
  window.addEventListener("beforeunload", (e) => {
    if (state.pendingChanges) {
      // Modern browsers will ignore this message but still show a confirmation
      e.returnValue =
        "You have unsaved changes. Are you sure you want to leave?";
    }
  });
};

/**
 * Initialization
 */
const initialize = async () => {
  try {
    // Generate initial session key
    state.sessionKey = getDateString();

    // Register all event handlers
    registerEventHandlers();

    // Set up autosave
    setupAutoSave();

    // Retrieve configuration from main process
    if (window.noteAPI?.getConfig) {
      try {
        const conf = await window.noteAPI.getConfig();
        console.log("Config received:", conf);

        // Apply configuration
        if (conf) {
          if (typeof conf.isPreviewVisible === "boolean") {
            togglePreview(conf.isPreviewVisible);
          }

          if (conf.saveIntervalInSeconds) {
            config.autoSaveInterval = conf.saveIntervalInSeconds * 1000;
            setupAutoSave(); // Restart with new interval
          }
        }
      } catch (error) {
        console.error("Failed to get config:", error);
      }
    }

    // Restore previous session if exists
    const storedKeys = Object.keys(localStorage).filter((key) =>
      key.includes("-")
    );
    if (storedKeys.length > 0) {
      // Find most recent note
      const lastKey = storedKeys.sort().pop();
      const content = safeStorageOp("get", lastKey);
      if (content) {
        elements.note.value = content;
        state.sessionKey = lastKey;
        processNote();
        logMessage(`Restored unsaved note from ${lastKey}`);
      }
    }

    // Ready to use
    logMessage(`App initialized at ${state.sessionKey}`);
  } catch (error) {
    console.error("Initialization error:", error);
    logMessage(`Failed to initialize: ${error.message}`, true);
  }
};

// Start the application
initialize();
