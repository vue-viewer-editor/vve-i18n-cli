#!/usr/bin/env node

"use strict";
const program = require("commander");
const utils = require("../utils");
const { loadConfig } = require("../configuration");
const vfs = require("vinyl-fs");
const map = require("map-stream");
const path = require("path");
const fs = require("fs");

program
  .version(require('../../package.json').version)
  .option("--cwd <path>", "工作目录")
  .option("--root-dir <path>", "国际文本所在的根目录")
  .parse(process.argv);

const config = {
  // 工作目录
  cwd: ".",
  // 根目录，国际文本所在的根目录
  rootDir: "./test/example-wrap/src",
};

Object.assign(config, program);

const CONFIG_JS_FILENAME = "vve-i18n-wrap-cli.config.js";

const absoluteCwd = path.resolve(config.cwd);

// 优先判断是否需要读取文件
if (!config.noConfig) {
  let configFilePath = path.join(absoluteCwd, CONFIG_JS_FILENAME);
  if (config.config) {
    configFilePath = path.resolve(config.config);
  }
  if (fs.existsSync(configFilePath)) {
    const conf = loadConfig(configFilePath);
    if (conf) {
      Object.assign(config, conf.options, program);
    }
  }
}

const absoluteRootDir = path.resolve(absoluteCwd, config.rootDir);

const tmpRegData = {};

vfs
  .src([
    path.resolve(absoluteRootDir, '**/*.+(vue)')
  ],{
      dot: false
    }
  )
  .pipe(
    map((file, cb) => {
      console.log(file.path)
      const fileContent = file.contents.toString();
      const regI18n = new RegExp(/([\u4e00-\u9fa5]+)/, "g");
      while ((tmpRegData.matches = regI18n.exec(fileContent))) {
        console.log(tmpRegData.matches[1])
      }
    })
  )
  .on("end", () => {
  });