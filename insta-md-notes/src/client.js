import { marked } from "marked";
import "./style.css";

const note = document.getElementById("note");
const preview = document.getElementById("preview");
const hidePreviewBtn = document.getElementById("hide-preview");
const closeSaveBtn = document.getElementById("close-save");
const log = document.getElementById("log");

let config = {
  hiddenClass: "hidden",
};
let isPreviewVisible = config.isPreviewVisible;
let sessionKey = "";

const saveNote = () => {
  let content = localStorage.getItem(sessionKey);
  if (content) {
    window?.noteAPI?.saveNoteToFile({ time: sessionKey, content: content });
  }
};

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
  window.close();
};
const registerShortcuts = () => {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "m") {
      e.preventDefault();
      toggleMd();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveNote();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "w") {
      saveNote();
      window.close();
    }
  });
};
const togglePreview = (visility) => {
  if (visility !== undefined) isPreviewVisible = visility;
  else isPreviewVisible = !isPreviewVisible;
  if (isPreviewVisible) {
    preview.classList.remove(config.hiddenClass);
    preview.innerHTML = marked.parse(note.value);
    hidePreviewBtn.textContent = "Hide Preview";
  } else {
    preview.classList.add(config.hiddenClass);
    hidePreviewBtn.textContent = "Show Preview";
  }
};
const initialize = () => {
  sessionKey = getDateString();
  note.addEventListener("input", writeInMemory);
  closeSaveBtn.addEventListener("click", close);
  hidePreviewBtn.addEventListener("click", togglePreview);
  registerShortcuts();
  // Listen for save completion
  if (window.noteAPI?.onSaveComplete) {
    window.noteAPI?.onSaveComplete((event, response) => {
      if (response && response.isSuccess) {
        localStorage.removeItem(sessionKey);
        note.value = "";
        log.innerHTML += `Log for <b>${sessionKey}</b> written successfully.<br>`;
        sessionKey = getDateString();
      }
    });
  }
  window.noteAPI.getConfig().then((conf) => {
    console.log("Config received from Electron:", conf);
    config = { ...conf, ...config };
    togglePreview(conf.isPreviewVisible);
    setInterval(saveNote, config.saveIntervalInSeconds * 1000);
  });
};
initialize();
