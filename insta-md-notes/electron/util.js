const fs = require("fs");
const path = require("path");
const os = require("os");
const ini = require("ini");

const constants = require("./constants.json");
const fileName = new Date().toISOString().split("T")[0];

const checkFolderPath = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true }); // recursive: true allows nested folders
    console.log("Folder created:", folderPath);
  } else {
    console.log("Folder already exists:", folderPath);
  }
};

const getFormattedContent = (title, content) =>
  `**${title}**
${content}
---`;

const getUserDefinedPath = () => {
  let _path = "";
  const userIniPath = path.join(process.resourcesPath, "user-config.ini");
  if (fs.existsSync(userIniPath)) {
    const iniData = ini.parse(fs.readFileSync(userIniPath, "utf-8"));
    if (iniData.Settings?.savePath) {
      _path = iniData.Settings.savePath;
      console.log("Using installer-provided savePath:", _path);
    }
  }
  console.log(_path);
  return _path;
};

const loadConfig = (defaultConfig) => {
  const defaultConfigPath = path.join(__dirname, "..", "config.json");

  let config = defaultConfig;
  let _path = getUserDefinedPath();

  _path = !_path ? path.join(os.homedir(), config.folderName) : _path;
  try {
    const raw = fs.readFileSync(defaultConfigPath, "utf-8");
    const parsed = JSON.parse(raw);
    config = { ...config, ...parsed };
    if (config.savePath === undefined || config?.savePath === "")
      config.savePath = _path;
    checkFolderPath(config.savePath);
  } catch (e) {
    console.warn("Could not read config.json. Using defaults.", e);
  }
  return config;
};

const saveNote = (data, folderPath, event) => {
  const saveFilePath = path.join(folderPath, `${fileName}.md`);
  if (data && data.time && data.content) {
    const newContent = getFormattedContent(data.time, data.content);
    // Check if file exists
    fs.readFile(saveFilePath, "utf-8", (readErr, existingContent) => {
      if (readErr && readErr.code !== "ENOENT") {
        console.error("Failed to read existing note:", readErr);
        return;
      }

      const finalContent = `${newContent}\n\n${existingContent || ""}`;

      fs.writeFile(saveFilePath, finalContent, (writeErr) => {
        if (writeErr) {
          console.error("Failed to save note:", writeErr);
          event.sender.send("note-saved", { isSuccess: false, key: data.time });
        } else {
          console.log("Note prepended to:", saveFilePath);
          event.sender.send("note-saved", { isSuccess: true, key: data.time });
        }
      });
    });
  }
};

module.exports = {
  loadConfig,
  saveNote,
};
