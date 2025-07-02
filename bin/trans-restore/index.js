#!/usr/bin/env node

"use strict";
const program = require("commander");
const { loadConfig } = require("../configuration");
const vfs = require("vinyl-fs");
const map = require("map-stream");
const path = require("path");
const fs = require("fs");
const xlsx = require('xlsx');
const utils = require("../utils");

const testRules = utils.testRules

function commaSeparatedList(value, split = ",") {
  return value.split(split).filter(item => item);
}

function separatedJsonObj(value) {
  try {
    return JSON.parse(value)
  } catch (e) {
    return {}
  }
}

function enableLanguagesParamsResolve(value) {
  if (value === 'true') {
    return true
  } else if (value === 'false') {
    return false
  }
  return commaSeparatedList(value)
}

program
  .version(require('../../package.json').version)
  .option("--cwd <path>", "工作目录")
  .option("--root-dir <path>", "国际文本所在的根目录")
  .option("--config <path>", "配置文件路径，默认是${cwd}/vve-i18n-cli.config.js")
  .option("--disable-config-file", "是否禁用配置文件")
   .option(
    "--ignore-i18n-json-rules <items>",
    "忽略掉国际化资源文件",
    commaSeparatedList
  )
  .option("--ignore-keys <items>", "遇到某些key就忽略，不合并", commaSeparatedList)
  .option("--ignore-values <items>", "遇到某些value就忽略，不合并", commaSeparatedList)
  .option("--excel-config item", "解析excel文件配置", separatedJsonObj)
  .option("--languages item", "翻译回填配置", separatedJsonObj)
  .option("--enable-languages <items>", "启用语言配置，默认都启用", enableLanguagesParamsResolve)
  .parse(process.argv);

const defaultExcelConfig = {
  excelStartRow: 0, // excel起始行，开始处理
  excelKeyCol: 0, // excel key 所在列
  excelValueCol: 1, // excel value 所在列
  excelSheetIndex: 0, // excel sheet索引
}

const defaultLanguages = {
  // Default English configuration
  'en': {
    translationFiles: ['translate.xlsx'],
    i18nJsonRules: ["**/*/en.json"],
    // ignoreI18nJsonRules: [], // 与全局的ignoreI18nJsonRules合并
    // ignoreKeys: [], // 与全局的ignoreKeys合并
    // ignoreValues: [], // 与全局的ignoreValues合并
    // excelConfig: {
    //   excelStartRow: 0, // excel起始行，开始处理，覆盖全局的设置
    //   excelKeyCol: 0, // excel key 所在列，覆盖全局的设置
    //   excelValueCol: 1, // excel value 所在列，覆盖全局的设置
    //   excelSheetIndex: 0, // excel sheet索引，覆盖全局的设置
    // }
  }
  // Other languages can be added here or via config file
}

const config = {
  cwd: ".",
  rootDir: "src",
  config: undefined,
  disableConfigFile: false,
  ignoreI18nJsonRules: [], // 忽略掉国际化资源文件
  ignoreKeys: [], // 遇到某些key就忽略，不合并
  ignoreValues: [], // 遇到某些value就忽略，不合并
  excelConfig: defaultExcelConfig,
  languages: defaultLanguages,
  enableLanguages: true, // 为true表示全局启用，为false表示不启用，还可以为数组，表示启用部分
};

function customSheetToJson(filePath, options = {}) {
  const {
    excelStartRow = 0,
    excelKeyCol = 0,
    excelValueCol = 1,
    excelSheetIndex = 0
  } = options;

  // 读取Excel文件
  const workbook = xlsx.readFile(filePath);
  
  // 获取指定sheet
  const worksheet = workbook.Sheets[workbook.SheetNames[excelSheetIndex]];
  
  // 转换为JSON
  const data = xlsx.utils.sheet_to_json(worksheet, {
    header: 1, // 获取原始数组数据
    range: excelStartRow // 跳过起始行之前的内容
  });
  
  // 转换为键值对格式
  const result = {};
  data.forEach(row => {
    if (row[excelKeyCol] && row[excelValueCol] !== undefined) {
      result[row[excelKeyCol]] = row[excelValueCol];
    }
  });
  
  return result;
}

async function init() {
  Object.assign(config, program);
  config.excelConfig = { ...defaultExcelConfig, ...config.excelConfig }
  config.languages = utils.deepMerge(utils.deepCopy(defaultLanguages), config.languages || {})
  
  const CONFIG_JS_FILENAME = "vve-i18n-cli.config.js";

  let absoluteCwd = path.resolve(config.cwd);

  // 优先判断是否需要读取文件
  if (!config.disableConfigFile) {
    let configFilePath = path.join(absoluteCwd, CONFIG_JS_FILENAME);
    if (config.config) {
      configFilePath = path.resolve(config.config);
    }
    if (fs.existsSync(configFilePath)) {
      const conf = await loadConfig(configFilePath);
      const myConfig = conf && conf.options && conf.options.transRestore
      if (myConfig) {
        Object.assign(config, myConfig, program);
        config.excelConfig = utils.deepMerge(utils.deepCopy(defaultExcelConfig), utils.deepCopy(myConfig.excelConfig || {}), program.excelConfig || {})
        config.languages = utils.deepMerge(utils.deepCopy(defaultLanguages), utils.deepCopy(myConfig.languages || {}), program.languages || {})
      }
    }
  }

  // 制定配置文件后，cwd在配置文件中定义，则cwd就需要重新获取
  if (!program.cwd) {
    absoluteCwd = path.resolve(config.cwd);
  }

  const absoluteRootDir = path.resolve(config.cwd, config.rootDir);

  function loadTranslationFiles(filePaths, langConfig) {
    const translations = {};
    
    // todo 可以支持glob
    for (const filePath of filePaths) {
      try {
        const absoluteFilePath = path.resolve(absoluteCwd, filePath)
        if (!utils.fsExistsSync(absoluteFilePath)) {
          console.log(`${absoluteFilePath} 文件不存在`)
          continue
        }

        const ext = path.extname(filePath).toLowerCase();
        let data;

        if (ext === '.json') {
          data = JSON.parse(fs.readFileSync(absoluteFilePath, 'utf8'));
        } else if (ext === '.xlsx' || ext === '.xls') {
          const excelConfig = { ...config.excelConfig, ...(langConfig.excelConfig || {})}
          data = customSheetToJson(absoluteFilePath, excelConfig)
        }
        
        if (data) {
          Object.assign(translations, data);
        }
      } catch (e) {
        console.error(`Error loading translation file ${filePath}:`, e.message);
      }
    }

    // 使用testRules方法，把ignoreKeys和ignoreValues忽略掉
    const ignoreKeys = Array.from(new Set([...config.ignoreKeys, ...(langConfig.ignoreKeys || [])]))
    const ignoreValues = Array.from(new Set([...config.ignoreValues, ...(langConfig.ignoreValues || [])]))
    // 使用testRules方法过滤translations
    const translationsNew = {};
    for (const key in translations) {
      if (!testRules(key, ignoreKeys) && !testRules(translations[key], ignoreValues)) {
        translationsNew[key] = translations[key];
      }
    }
    return translationsNew;
  }

  function restoreTranslations(translations, lang, langConfig) {
    const i18nJsonRules = langConfig.i18nJsonRules
    
    const ignoreI18nJsonRules = Array.from(new Set([...config.ignoreI18nJsonRules, ...(langConfig.ignoreI18nJsonRules || [])]))

    vfs.src(i18nJsonRules.map(rule => path.resolve(absoluteRootDir, rule)), {
      ignore: ignoreI18nJsonRules.map(item => path.resolve(absoluteRootDir, item)),
      dot: false
    })
    .pipe(
      map((file, cb) => {
        if (file.isDirectory()) {
          cb();
          return;
        }
        
        try {
          const fileContent = JSON.parse(file.contents.toString());
          let changed = false;
          
          // Deep merge translations into the JSON file
          function mergeTranslations(obj, trans) {
            for (const key in trans) {
              if (trans[key] !== undefined && obj[key] !== undefined && obj[key] !== trans[key]) {
                obj[key] = trans[key];
                changed = true;
              }
            }
          }
          
          mergeTranslations(fileContent, translations);
          
          if (changed) {
            file.contents = Buffer.from(JSON.stringify(fileContent, null, 2));
            fs.writeFileSync(file.path, file.contents);
            console.log(`Updated translations in ${file.path}`);
          }
        } catch (e) {
          console.error(`Error processing ${file.path}:`, e.message);
        }
        
        cb();
      })
    )
    .on('end', () => {
      console.log(`Finished restoring ${lang} translations`);
    });
  }
  
  // Process each language
  for (const [lang, langConfig] of Object.entries(config.languages)) {
    const enableLanguages = config.enableLanguages
    if ((Array.isArray(enableLanguages) && enableLanguages.includes(lang)) || enableLanguages === true) {
      const translations = loadTranslationFiles(langConfig.translationFiles, langConfig);
      if (Object.keys(translations).length) {
        restoreTranslations(translations, lang, langConfig);
      }
    }
  }
}


init();
