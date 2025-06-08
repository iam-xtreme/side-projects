const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const ini = require("ini");
const logger = require("./logger");

const fileName = new Date().toISOString().split("T")[0];

const checkFolderPath = async (folderPath) => {
  try {
    await fs.access(folderPath);
    logger.info(`Folder already exists: ${folderPath}`);
  } catch {
    await fs.mkdir(folderPath, { recursive: true });
    logger.info(`Folder created: ${folderPath}`);
  }
};

const getFormattedContent = (title, content) => {
  return `**${title}**
${content}
---`;
};

const getUserDefinedPath = async () => {
  const userIniPath = path.join(process.resourcesPath, "user-config.ini");
  try {
    const iniData = await fs.readFile(userIniPath, "utf-8");
    const config = ini.parse(iniData);
    return config.Settings?.savePath || "";
  } catch {
    return "";
  }
};

const loadConfig = async (defaultConfig) => {
  const defaultConfigPath = path.join(__dirname, "..", "config.json");
  try {
    const raw = await fs.readFile(defaultConfigPath, "utf-8");
    const parsed = JSON.parse(raw);
    const config = { ...defaultConfig, ...parsed };
    const savePath = await getUserDefinedPath();
    config.savePath = savePath || path.join(os.homedir(), config.folderName);
    await checkFolderPath(config.savePath);
    return config;
  } catch (error) {
    logger.warn("Could not read config.json. Using defaults.", error);
    return defaultConfig;
  }
};

const saveNote = async (data, folderPath) => {
  const saveFilePath = path.join(folderPath, `${fileName}.md`);
  if (data && data.time && data.content) {
    const newContent = getFormattedContent(data.time, data.content);
    try {
      const existingContent = '';
      try {
        existingContent = await fs.readFile(saveFilePath, "utf-8");
      } catch (error) {
        logger.info("No existing content found or file is empty.");
      }
      const finalContent = `${newContent}\n\n${existingContent}`;
      await fs.writeFile(saveFilePath, finalContent, {
        encoding: "utf8",
        flag: "w",
      });
      logger.info(`Note prepended to: ${saveFilePath}`);
      return { isSuccess: true, key: data.time };
    } catch (error) {
      logger.error("Failed to save note:", error);
      return { isSuccess: false, key: data.time };
    }
  }
};

module.exports = {
  loadConfig,
  saveNote,
};
