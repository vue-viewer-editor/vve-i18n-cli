const buildDebug = require("debug");
const path = require("path");
const url = require("url");

const pathToFileURL = url.pathToFileURL

const debug = buildDebug("files:configuration");

async function loadConfig(filepath) {
  try {
    const conf = await readConfig(filepath);
    return conf;
  } catch (e) {
    debug("error", e);
    return null;
  }
}

async function readConfig(filepath) {
  let options;

  let configModule
  try {
    configModule = require(filepath);
    options =
      configModule && configModule.__esModule
        ? configModule.default || undefined
        : configModule;
  } catch (e) {
    try {
      configModule = await import(pathToFileURL(filepath).href);
      options = configModule.default
    } catch (e) {
      console.error(e)
    }
  }

  return {
    filepath,
    dirname: path.dirname(filepath),
    options
  };
}

module.exports = {
  loadConfig,
  readConfig
};
