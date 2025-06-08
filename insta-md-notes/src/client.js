import { marked } from "marked";
import "./style.css";

const note = document.getElementById("note");
const preview = document.getElementById("preview");
const hidePreviewBtn = document.getElementById("hide-preview");
const closeSaveBtn = document.getElementById("close-save");
const log = document.getElementById("log");

const config = {
  hiddenClass: "hidden",
};

let sessionKey = "";
let isPreviewVisible = true;

const getDateString = (date) => {
  date = date ?? new Date();
  return date.toISOString().slice(0, 16).replace("T", " ");
};

const writeInMemory = () => {
  const content = note.value;
  const key = sessionKey;
  localStorage.setItem(key, content);
  preview.innerHTML = marked.parse(content);
};

const close = () => {
  saveNote();
  window?.noteAPI?.close();
};

const registerShortcuts = () => {
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "s" && e.ctrlKey) {
      e.preventDefault();
      saveNote();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "w") {
      close();
    }
  });
};

const saveNote = () => {
  const content = localStorage.getItem(sessionKey);
  if (content) {
    window?.noteAPI?.saveNoteToFile({ time: sessionKey, content: content });
  }
};

const togglePreview = (visibility) => {
  if (visibility !== undefined && typeof visibility === "boolean") isPreviewVisible = visibility;
  else isPreviewVisible = !isPreviewVisible;
  preview.classList.toggle(config.hiddenClass);
  hidePreviewBtn.textContent = isPreviewVisible
    ? "Hide Preview"
    : "Show Preview";
};

const initialize = async () => {
  sessionKey = getDateString();
  note.addEventListener("input", writeInMemory);
  closeSaveBtn.addEventListener("click", close);
  hidePreviewBtn.addEventListener("click", togglePreview);
  registerShortcuts();

  if (window.noteAPI?.onSaveComplete) {
    window.noteAPI.onSaveComplete((event, response) => {
      if (response && response.isSuccess) {
        localStorage.removeItem(sessionKey);
        note.value = "";
        log.innerHTML += `Log for <b>${sessionKey}</b> written successfully.<br>`;
        sessionKey = getDateString();
      }
    });
  }

  if (window.noteAPI?.getConfig) {
    const conf = await window.noteAPI.getConfig();
    console.log("Config received from Electron:", conf);
    isPreviewVisible = conf.isPreviewVisible;
    togglePreview(conf.isPreviewVisible);
  }
};

initialize();
