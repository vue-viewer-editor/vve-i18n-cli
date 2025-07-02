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

function commaSeparatedList(value) {
  return value.split(',').filter(item => item);
}

function separatedJsonObj(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return {};
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
  .option("--root-dir <path>", "JSON文件根目录")
  .option("--config <path>", "配置文件路径")
  .option("--disable-config-file", "禁用配置文件")
  .option("--ignore-keys <items>", "忽略的键，多个用逗号分隔", commaSeparatedList)
  .option("--ignore-values <items>", "忽略的值，多个用逗号分隔", commaSeparatedList)
  .option("--excel-config item", "生成excel文件配置", separatedJsonObj)
  .option("--all-lang-output-files <items>", "所有语言汇总的的输出文件列表，多个用逗号分隔", commaSeparatedList)
  .option("--languages <items>", "语言配置", separatedJsonObj)
  .option("--enable-languages <items>", "启用的语言", enableLanguagesParamsResolve)
  .parse(process.argv);

const defaultExcelConfig = {
  headerKeyTitle: '中文', // excel header 的 title
  skipHeader: false, // 是否跳过生成标题行
  multiSheet: false, // 是否多个sheet
}

const defaultLanguages = {
  'en': {
    i18nJsonRules: ["**/*/en.json"],
    untranslatedRules: [
      { type: 'regex', pattern: /[\u4E00-\u9FFF]/ },
    ],
    // 待翻译的
    outputFiles: [
      'untranslate.xlsx',
      'untranslate.json',
    ],
    excelConfig: {
      headerKeyTitle: '中文', // excel key 所在列，覆盖全局的设置
      headerValueTitle: 'English', // excel value 所在列，覆盖全局的设置
      skipHeader: false,
    },
    setValueEmpty: false, // 是否把value设置成空
    // ignoreI18nJsonRules: [], // 与全局的ignoreI18nJsonRules合并
    // ignoreKeys: [],
    // ignoreValues: []
  }
}

const config = {
  cwd: ".",
  rootDir: "src",
  ignoreI18nJsonRules: [], // 忽略掉国际化资源文件
  ignoreKeys: [],
  ignoreValues: [],
  excelConfig: defaultExcelConfig,
  allLangOutputFiles: [
  ],
  languages: defaultLanguages,
  enableLanguages: true
};

async function init() {
  Object.assign(config, program);
  config.excelConfig = { ...defaultExcelConfig, ...config.excelConfig }
  config.languages = utils.deepMerge(utils.deepCopy(defaultLanguages), config.languages || {})
  
  const CONFIG_JS_FILENAME = "vve-i18n-cli.config.js";
  let absoluteCwd = path.resolve(config.cwd);
  
  if (!config.disableConfigFile) {
    let configFilePath = path.join(absoluteCwd, CONFIG_JS_FILENAME);
    if (config.config) {
      configFilePath = path.resolve(config.config);
    }
    if (fs.existsSync(configFilePath)) {
      const conf = await loadConfig(configFilePath);
      const myConfig = conf && conf.options && conf.options.zhFindUntrans
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
  
  function processLanguage(lang, langConfig, untranslatedEntries) {
    return new Promise((resolve, reject) => {
      const i18nJsonRules = langConfig.i18nJsonRules;
      const ignoreI18nJsonRules = Array.from(new Set([...config.ignoreI18nJsonRules, ...(langConfig.ignoreI18nJsonRules || [])]))
      const ignoreKeys = [...config.ignoreKeys, ...langConfig.ignoreKeys || []];
      const ignoreValues = [...config.ignoreValues, ...langConfig.ignoreValues || []];
      const untranslatedRules = langConfig.untranslatedRules || [];
      
      vfs.src(i18nJsonRules.map(rule => path.resolve(absoluteRootDir, rule)), {
        ignore: ignoreI18nJsonRules.map(item => path.resolve(absoluteRootDir, item)),
        dot: false
      })
      .pipe(map((file, cb) => {
        if (file.isDirectory()) {
          cb();
          return;
        }
        
        try {
          const fileContent = JSON.parse(file.contents.toString());
          for (const [key, value] of Object.entries(fileContent)) {
            if (utils.testRules(key, ignoreKeys) || utils.testRules(value, ignoreValues)) {
              continue;
            }
            if (checkUntranslated(value, key, untranslatedRules)) {
              untranslatedEntries.push({
                lang,
                file: path.relative(config.cwd, file.path),
                key,
                value
              });
            }
          }
        } catch (e) {
          console.error(`处理文件 ${file.path} 出错:`, e.message);
        }
        cb();
      }))
      .on('end', resolve)
      .on('error', reject);
    });
  }

  function checkUntranslated(value, key, rules) {
    return rules.some(rule => {
      switch (rule.type) {
        case 'isEmpty':
          return value === '';
        case 'equalsKey':
          return value === key;
        case 'regex':
          return new RegExp(rule.pattern).test(value);
        case 'startsWith':
          return value.startsWith(rule.value);
        case 'endsWith':
          return value.endsWith(rule.value);
        case 'any':
          return true;
        default:
          return false;
      }
    });
  }

  function outputResults(entries) {
    // 初始化数据结构
    // langGroups: 按语言分组存储所有匹配的词条 { 'en': [...], 'ja': [...] }
    // allEntries: 包含所有语言唯一键的数组，用于生成总文件 [{ key: 'greeting', en: 'Hello', ja: 'こんにちは' }, ...]
    // langKeys: 存储所有启用的语言代码集合，用于生成表头 {'en', 'ja', ...}
    // keyMap: 用于快速查找和合并相同key的Map对象，键为词条key，值为包含各语言翻译的对象
    const langGroups = {};
    const allEntries = [];
    const langKeys = new Set();
    const keyMap = new Map();

    // 按语言分组并收集所有唯一键
    // 遍历所有匹配的词条，进行数据整理
    entries.forEach(entry => {
      // 如果当前语言分组不存在，则初始化该分组并记录语言代码
      if (!langGroups[entry.lang]) {
        langGroups[entry.lang] = [];  // 初始化该语言的词条数组
        langKeys.add(entry.lang);     // 将语言代码添加到集合中
      }
      // 将当前词条添加到对应语言的分组中
      langGroups[entry.lang].push(entry);

      // 如果keyMap中不存在当前key，则创建新条目并添加到allEntries
      if (!keyMap.has(entry.key)) {
        const keyEntry = { key: entry.key };  // 创建包含key的基础对象
        keyMap.set(entry.key, keyEntry);      // 将对象存入Map
        allEntries.push(keyEntry);            // 添加到总条目数组
      }
      // 将当前语言的翻译值添加到key对应的对象中
      keyMap.get(entry.key)[entry.lang] = entry.value;
    });

    // 为每种语言生成单独的输出文件
    for (const [lang, langEntries] of Object.entries(langGroups)) {
      const langConfig = config.languages[lang];
      if (!langConfig || !langConfig.outputFiles || !langConfig.outputFiles.length) continue;

      langConfig.outputFiles.forEach(outputFile => {
        const outputPath = path.resolve(absoluteCwd, outputFile);
        const ext = path.extname(outputFile).toLowerCase();

        if (ext === '.xlsx' || ext === '.xls') {
          const excelConfig = { ...config.excelConfig, ...langConfig.excelConfig };
          const worksheetData = []

          langEntries.forEach(entry => {
            const value = langConfig.setValueEmpty ? '' : entry.value
            worksheetData.push({
              [excelConfig.headerKeyTitle || 'key']: entry.key,
              [excelConfig.headerValueTitle || lang]: value // JSON文件value默认为空字符串
            });
          });

          const worksheet = xlsx.utils.json_to_sheet(worksheetData, { skipHeader: excelConfig.skipHeader });
          const workbook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, lang);
          xlsx.writeFile(workbook, outputPath);
        } else if (ext === '.json') {
          const jsonData = {};
          langEntries.forEach(entry => {
            const value = langConfig.setValueEmpty ? '' : entry.value
            jsonData[entry.key] = value; // JSON文件value默认为空字符串
          });
          fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
        }

        console.log(`已为语言 ${lang} 输出 ${langEntries.length} 个匹配的词条到 ${outputPath}`);
      });
    }

    // 生成包含所有语言的总文件
    if (config.allLangOutputFiles && config.allLangOutputFiles.length > 0) {
      config.allLangOutputFiles.forEach(outputFile => {
        const outputPath = path.resolve(absoluteCwd, outputFile);
        const ext = path.extname(outputFile).toLowerCase();
        const excelConfig = config.excelConfig;

        if (ext === '.xlsx' || ext === '.xls') {
          const workbook = xlsx.utils.book_new();

          if (excelConfig.multiSheet) {
            // 多sheet模式 - 每个语言一个sheet
            for (const [lang, langEntries] of Object.entries(langGroups)) {
              const langConfig = config.languages[lang];
              const sheetExcelConfig = { ...excelConfig, ...langConfig.excelConfig };
              const worksheetData = []

              langEntries.forEach(entry => {
                const value = langConfig.setValueEmpty ? '' : entry.value
                worksheetData.push({
                  [sheetExcelConfig.headerKeyTitle || 'key']: entry.key,
                  [sheetExcelConfig.headerValueTitle || lang]: value
                });
              });

              const worksheet = xlsx.utils.json_to_sheet(worksheetData, { skipHeader: sheetExcelConfig.skipHeader });
              xlsx.utils.book_append_sheet(workbook, worksheet, lang);
            }
          } else {
            // 单sheet模式 - 所有语言在同一sheet
            const header = [excelConfig.headerKeyTitle || 'key'];
            langKeys.forEach(lang => {
              const langConfig = config.languages[lang];
              header.push(langConfig?.excelConfig?.headerValueTitle || lang);
            });

            const worksheetData = []

            allEntries.forEach(entry => {
              const row = { [excelConfig.headerKeyTitle || 'key']: entry.key };
              langKeys.forEach(lang => {
                const langConfig = config.languages[lang];
                const value = langConfig.setValueEmpty ? '' : entry[lang]

                row[langConfig?.excelConfig?.headerValueTitle || lang] = value || '';
              });
              worksheetData.push(row);
            });

            const worksheet = xlsx.utils.json_to_sheet(worksheetData, { skipHeader: excelConfig.skipHeader });
            xlsx.utils.book_append_sheet(workbook, worksheet, 'AllLanguages');
          }

          if (Object.keys(workbook.Sheets).length > 0) {
            xlsx.writeFile(workbook, outputPath);
            console.log(`已输出包含所有语言的总文件到 ${outputPath}`);
          } else {
            console.log(`无内容可提取到 ${outputPath}`);
          }
        } else if (ext === '.json') {
          // JSON格式总文件
          const processedEntries = Array.from(keyMap.values()).map(entry => {
            const processed = { ...entry };
            // 遍历所有语言配置，处理空值
            langKeys.forEach(lang => {
              const langConfig = config.languages[lang] || {};
              processed[lang] = langConfig.setValueEmpty ? '' : processed[lang];
            });
            return processed;
          });

          if (processedEntries.length) {
            fs.writeFileSync(outputPath, JSON.stringify(processedEntries, null, 2), 'utf8');
            console.log(`已输出包含所有语言的总文件到 ${outputPath}`);
          } else {
            console.log(`无内容可提取到 ${outputPath}`);
          }
        }
      });
    }
  }
  
  const untranslatedEntries = [];
  
  for (const [lang, langConfig] of Object.entries(config.languages)) {
    const enableLanguages = config.enableLanguages
    if ((Array.isArray(enableLanguages) && enableLanguages.includes(lang)) || enableLanguages === true) {
      await processLanguage(lang, langConfig, untranslatedEntries);
    }
  }
  
  if (untranslatedEntries.length) {
    outputResults(untranslatedEntries);
  } else {
    console.log('无可提取的词条');
  }
}

init();
