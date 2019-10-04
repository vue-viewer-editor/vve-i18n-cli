#!/usr/bin/env node

"use strict";
const program = require("commander");
const jsonfile = require("jsonfile");
const utils = require("./utils");
const trans = require("./translation"); // trans
const { loadConfig } = require("./configuration");
const vfs = require("vinyl-fs");
const map = require("map-stream");
const path = require("path");
const fs = require("fs");
const uniq = require("lodash.uniq");

function commaSeparatedList(value, split = ",") {
  return value.split(split).filter(item => item);
}

program
  .version("1.0.0")
  .option("--cwd <path>", "工作目录")
  .option("--root-dir <path>", "国际文本所在的根目录")
  .option(
    "--i18n-file-rules <items>",
    "匹配含有国际化文本的文件规则",
    commaSeparatedList
  )
  .option(
    "--i18n-text-rules <items>",
    "国际化文本的正则表达式，正则中第一个捕获对象当做国际化文本",
    commaSeparatedList
  )
  .option(
    "--keep-key-rules <items>",
    "模块的国际化的json文件需要被保留下的key，即使这些组件在项目中没有被引用",
    commaSeparatedList
  )
  .option("--out-dir <path>", "生成的国际化资源包的输出目录")
  .option(
    "-l, --i18n-languages <items>",
    "需要生成的国际化语言文件，目前支持zh、en多个用逗号分割，默认全部",
    commaSeparatedList
  )
  .option(
    "--config <path>",
    "配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js"
  )
  .option("--no-config", "是否取配置文件")
  .option("-t, --translate", "是否翻译")
  .option("--translate-from-lang", "翻译的基础语言，默认是用中文翻译")
  .option(
    "--force-translate",
    "是否强制翻译，即已翻译修改的内容，也重新用翻译生成"
  )
  .option("--translate-language <items>", "翻译的语言", commaSeparatedList)
  .option("--copy-index", "模块下${outDir}/index.js文件不存在才拷贝index.js")
  .option("--force-copy-index", "是否强制拷贝最新index.js")
  .parse(process.argv);

const config = {
  // 工作目录
  cwd: ".",
  // 根目录，国际文本所在的根目录
  rootDir: "src",
  // 默认所有模块，如果有传module参数，就只处理某个模块
  // '**/module-**/**/index.js'
  moduleIndexRules: ["main.js"],
  // 匹配含有国际化文本的文件规则
  i18nFileRules: ["**/*.+(vue|js)"],
  // 国际化文本的正则表达式，正则中第一个捕获对象当做国际化文本
  i18nTextRules: [/(?:[\$.])t\(['"](.+?)['"]/g],
  // 模块的国际化的json文件需要被保留下的key，即使这些组件在项目中没有被引用
  // key可以是一个字符串，正则，或者是函数
  keepKeyRules: [
    /^G\/+/ // G/开头的会被保留
  ],
  // 生成的国际化资源包的输出目录
  outDir: "lang",
  // 生成的国际化的语言
  i18nLanguages: [
    "zh", // 中文
    "en" // 英文
  ],
  // 配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js
  config: undefined,
  // 是否取配置文件
  noConfig: false,
  // 是否翻译
  translate: false,
  // 翻译的基础语言，默认是用中文翻译
  translateFromLang: "zh",
  // 是否强制翻译，即已翻译修改的内容，也重新用翻译生成
  forceTranslate: false,
  // 翻译的语言
  translateLanguage: ["zh", "en"],
  // 模块下${outDir}/index.js文件不存在才拷贝index.js
  copyIndex: false,
  // 是否强制拷贝最新index.js
  forceCopyIndex: false
};

Object.assign(config, program);

const CONFIG_JS_FILENAME = "vve-i18n-cli.config.js";

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

const fsExistsSync = utils.fsExistsSync;
const filterObjByKeyRules = utils.filterObjByKeyRules;
const translateArr = trans.translateArr;

const i18nData = {};
const tmpRegData = {};

// 从文件中提取模块的的国际化KEY
function getModuleI18nData(modulePath, fileContent) {
  if (!i18nData[modulePath]) {
    i18nData[modulePath] = [];
  }
  for (let i = 0; i < config.i18nTextRules.length; i++) {
    const regI18n = new RegExp(config.i18nTextRules[i], "g");
    while ((tmpRegData.matches = regI18n.exec(fileContent))) {
      i18nData[modulePath].push(tmpRegData.matches[1]);
    }
  }
}

// 删除重复的key，并排序方便git比对
function normalizeI18nData() {
  const moduleKeys = Object.keys(i18nData);
  moduleKeys.forEach(key => {
    i18nData[key] = uniq(i18nData[key]).sort();
  });
}

// 根据旧数据，生成新数据
async function makeNewData(key, lang, originData) {
  const newData = filterObjByKeyRules(originData, config.keepKeyRules); // 根据配置保留一些keys值，保证即使在项目中不被引用也能保存下来

  let newAddDataArr = []; // 新增的数据，即在旧的翻译文件中没有出现

  i18nData[key].forEach(key => {
    if (originData.hasOwnProperty(key)) {
      newData[key] = originData[key];
    } else {
      newData[key] = key;
      newAddDataArr.push(key);
    }
  });

  // 基础语言不翻译（默认中文），因为由中文翻译成其他语言
  if (config.translate && lang !== config.translateFromLang) {
    let translateRst = {};

    // 如果强制翻译，则翻译所有的key
    if (config.forceTranslate) {
      newAddDataArr = Object.keys(newData);
    }

    // 配合--translate使用，需要翻译的语言，目前支持en、ko，多个用逗号分割，默认全部
    if (!config.translateLanguage) {
      translateRst = await translateArr(
        config.translateFromLang,
        lang,
        newAddDataArr
      );
    } else if (config.translateLanguage.includes(lang)) {
      translateRst = await translateArr(
        config.translateFromLang,
        lang,
        newAddDataArr
      );
    }
    Object.assign(newData, translateRst);
  }
  return newData;
}

// 保存国际化文件
async function saveI18nFile({ dirPath } = {}) {
  const i18nLanguages = config.i18nLanguages;

  for (let i = 0; i < i18nLanguages.length; i++) {
    const item = i18nLanguages[i];
    const i18nDir = path.resolve(dirPath, config.outDir);
    if (!fsExistsSync(i18nDir)) {
      fs.mkdirSync(i18nDir);
    }

    // 模块下i18n/index.js文件不存在才拷贝index.js，或者forceCopyIndex=true强制拷贝
    const i18nIndexFile = path.resolve(i18nDir, "index.js");
    if (
      (config.copyIndex && !fsExistsSync(i18nIndexFile)) ||
      config.forceCopyIndex
    ) {
      fs.writeFileSync(i18nIndexFile, require("./res/index.js")(i18nLanguages));
    }

    // 没有对应语言的国际化文件，就创建一个
    const langFilePath = path.resolve(i18nDir, item + ".json");
    if (!fsExistsSync(langFilePath)) {
      jsonfile.writeFileSync(langFilePath, {}, { spaces: 2, EOL: "\n" });
    }

    // 读取原有的国际化文件信息，重新与新收集的国际化信息合并
    const originData = jsonfile.readFileSync(langFilePath) || {};
    const newData = await makeNewData(dirPath, item, originData);

    // 写文件
    jsonfile.writeFile(langFilePath, newData, { spaces: 2, EOL: "\n" }, err => {
      if (err) return console.log("提取失败" + langFilePath + "\n" + err);
      console.log("提取完成" + langFilePath);
    });
  }
}

// 保存模块的I18n文件
function saveModuleI18nFile() {
  const moduleKeys = Object.keys(i18nData);
  moduleKeys.forEach(key => {
    saveI18nFile({ dirPath: key });
  });
}
vfs
  .src(
    config.moduleIndexRules.map(item => path.resolve(absoluteRootDir, item)),
    {
      dot: false
    }
  )
  .pipe(
    map((file, cb) => {
      const modulePath = path.dirname(file.path);

      vfs
        .src(config.i18nFileRules.map(item => path.resolve(modulePath, item)), {
          dot: false
        })
        .pipe(
          map((file, cb) => {
            const contents = file.contents.toString();
            getModuleI18nData(modulePath, contents);
            cb(null);
          })
        )
        .on("end", () => {
          cb(null);
        });
    })
  )
  .on("end", () => {
    normalizeI18nData();
    saveModuleI18nFile();
  });
