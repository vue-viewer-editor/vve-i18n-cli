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
  try {
    let configModule
    try {
      configModule = require(filepath);
    } catch (e) {
      configModule = await import(pathToFileURL(filepath).href);
    }
    options =
      configModule && configModule.__esModule
        ? configModule.default || undefined
        : configModule;
  } catch (err) {
    console.log('readConfig', err)
    throw err;
  } finally {
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
