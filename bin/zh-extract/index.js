#!/usr/bin/env node

"use strict";
const program = require("commander");
const utils = require("../utils");
const { loadConfig } = require("../configuration");
const vfs = require("vinyl-fs");
const map = require("map-stream");
const path = require("path");
const fs = require("fs");
const ObjectsToCsv = require('objects-to-csv');

function commaSeparatedList(value, split = ",") {
  return value.split(split).filter(item => item);
}

function commaSeparatedJson(value) {
  try {
    return JSON.parse(value)
  } catch (e) {
    return []
  }
}

program
  .version(require('../../package.json').version)
  .option("--cwd <path>", "工作目录")
  .option("--root-dir <path>", "国际文本所在的根目录")
  .option(
    "--config <path>",
    "配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js"
  )
  .option(
    "--config-key-name <item>",
    "config配置文件中对应的入口配置key的名称"
  )
  .option("--disable-config-file", "是否取配置文件")
  .option(
    "--i18n-file-rules <items>",
    "匹配含有国际化文本的文件规则",
    commaSeparatedList
  )
  .option(
    "--ignore-i18n-file-rules <items>",
    "不匹配含有国际化文本的文件规则",
    commaSeparatedList
  )
  .option(
    "--zh-reg <item>",
    "中文正则"
  )
  .option(
    "--ignore-key-rules <items>",
    "忽略被提取的内容的规则",
    commaSeparatedList
  )
  .option(
    "--custom-ignore-wrap <items>",
    "自定义忽略被包裹的内容，需要包含三个group，前中后",
    commaSeparatedJson
  )
  .option(
    "--ignore-wrap <items>",
    "忽略被包裹，需要包含三个group，前中后",
    commaSeparatedJson
  )
  .option(
    "--ignore-disable-wrap <items>",
    "忽略禁用包裹，需要包含三个group，前中后",
    commaSeparatedJson
  )
  .option("--out-dir <path>", "输出目录")
  .option("--out-csv", "是否输出csv")
  .option("--simple-json-out", "是否输出简单的json文件")
  .option("--simple-json-out-file <item>", "输出的简单的json文件，把所有的key合并起来，与simpleJsonReferenceFile的内容进行合并")
  .option("--simple-json-reference-file <item>", "参考的简单的json文件")
  .option("--simple-json-use-key-for-default", "用键来设置默认值")
  .option("--simple-json-remove-unused-keys", "是否删除不在扫描文件中出现的key")
  
  .parse(process.argv);

const config = {
  // 工作目录
  cwd: ".",
  // 根目录，国际文本所在的根目录
  rootDir: "src",
  // 配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js
  config: undefined,
  // 是否取配置文件
  disableConfigFile: false,
  // 匹配含有国际化文本的文件规则
  i18nFileRules: ["**/*.+(vue|js)"],
  // 不匹配含有国际化文本的文件规则
  ignoreI18nFileRules: [],
  // 中文正则
  zhReg: /([^\x00-\xff]+)/,
  // 忽略被提取的内容的规则可以是一个字符串，正则，或者是函数
  ignoreKeyRules: [
  ],
  // 自定义忽略被包裹的内容，需要包含三个group，前中后
  customIgnoreWrap: [
    { name: 'i18n', regex: /(t\s*\()([\s\S]*?)(\))/g },
  ],
  // 忽略被包裹，需要包含三个group，前中后
  ignoreWrap: [
    { name: 'singleLineComment', regex: /(\/\/)([\s\S]*?)(\n)/g },
    { name: 'multiLineComment', regex: /(\/\*)([\s\S]*?)(\*\/)/g },
    { name: 'htmlComment', regex: /(<\!--)([\s\S]*?)(-->)/g },
  ],
  // 忽略禁用包裹，需要包含三个group，前中后
  ignoreDisableWrap: [
    { name: 'disableLine', regex: /(\n|^)(.*)(\/\/(?:[^\S\r\n]*|.*[^\S\r\n]+)vve-i18n-zh-extract-disable-line(?:[^\S\r\n]*|[^\S\r\n]+.*))/g },
    { name: 'disableNextLine', regex: /(\/\/(?:[^\S\r\n]*|.*[^\S\r\n]+)vve-i18n-zh-extract-disable-next-line(?:[^\S\r\n]*|[^\S\r\n]+.*)\n)(.+)(\n|$)/g },
    { name: 'disableWrap', regex: /(\/\*\s*vve-i18n-zh-extract-disable\s*\*\/)([\s\S]*?)((?:\/\*\s*vve-i18n-zh-extract-enable\s*\*\/)|$)/g }
  ],
  // 输出的目录
  outDir: '',
  // 是否输出csv文件
  outCsv: false,
  // 是否输出简单的json文件
  simpleJsonOut: false,
  // 输出的简单的json文件，把所有的key合并起来，与simpleJsonReferenceFile的内容进行合并
  simpleJsonOutFile: 'simple.json',
  // 参考的简单的json文件
  simpleJsonReferenceFile: '',
  // 用键来设置默认值
  simpleJsonUseKeyForDefault: false,
  // 是否删除不在newData中出现的key
  simpleJsonRemoveUnusedKeys: false,
};

async function init () {
  Object.assign(config, program);

  const CONFIG_JS_FILENAME = "vve-i18n-cli.config.js";

  let absoluteCwd = path.resolve(config.cwd);

  const configKeyName = program.configKeyName || 'zhExtract'

  // 优先判断是否需要读取文件
  if (!config.disableConfigFile) {
    let configFilePath = path.join(absoluteCwd, CONFIG_JS_FILENAME);
    if (config.config) {
      configFilePath = path.resolve(config.config);
    }
    if (fs.existsSync(configFilePath)) {
      const conf = await loadConfig(configFilePath);
      if (conf && conf.options && conf.options[configKeyName]) {
        Object.assign(config, conf.options[configKeyName], program);
      }
    }
  }

  // 制定配置文件后，cwd在配置文件中定义，则cwd就需要重新获取
  if (!program.cwd) {
    absoluteCwd = path.resolve(config.cwd);
  }

  // 输出目录
  let outPath = path.resolve(absoluteCwd)
  if(config.outDir) {
    outPath = path.resolve(outPath, config.outDir)
  }

  const { customIgnoreWrap, ignoreWrap, ignoreDisableWrap } = config

  const allIgnoreWrap = [...ignoreWrap, ...ignoreDisableWrap, ...customIgnoreWrap]

  const absoluteRootDir = path.resolve(absoluteCwd, config.rootDir);

  const testRules = utils.testRules
  const calculatePosition = utils.calculatePosition

  // 解析包裹信息
  function parseCodeWrappers(code, wrappers) {
    const results = [];

    wrappers.forEach(wrapper => {
      const { name, start, end, regex } = wrapper;
      const mReg = new RegExp(regex, 'g');
      let match;
      
      while ((match = mReg.exec(code))) {
        const startIndex = match.index + match[1].length;
        const endIndex = startIndex + match[2].length;
        results.push({ name, startIndex, endIndex });
      }
    });

    return results;
  }

  // 是否被包裹
  function isPositionWrapped(index, wrappedItems) {
    for (let i = 0; i < wrappedItems.length; i++) {
      const { startIndex, endIndex } = wrappedItems[i];
      if (index >= startIndex && index <= endIndex) {
        return true;
      }
    }
    return false;
  }

  // 匹配中文 - 支持单个正则表达式或正则表达式数组
  const zhRegs = Array.isArray(config.zhReg) ? 
    config.zhReg.map(pattern => new RegExp(pattern, "g")) : 
    [new RegExp(config.zhReg, "g")];

  function processFile (fileContent) {
    // 计算出被忽略的包裹信息，默认包括国际化，注释等信息
    const wrappedItems = parseCodeWrappers(fileContent, allIgnoreWrap)

    const arr = []
    // 遍历所有正则表达式
    zhRegs.forEach(zhReg => {
      // 重置正则表达式的lastIndex，确保每次都从开头开始匹配
      zhReg.lastIndex = 0;
      let match;
      while ((match = zhReg.exec(fileContent))) {
        let key = match[1]
        key = key.replace(/\\\\/g, '\\') // 解决\\转义后的问题
        if (testRules(key, config.ignoreKeyRules)) {
          continue
        }

        // 如果忽略了包裹了，则不处理
        const flag = isPositionWrapped(match.index, wrappedItems)
        if (flag) {
          continue
        }

        const textIndex = match.index

        // 计算文本所在的行和列
        const { row, col } = calculatePosition(fileContent, textIndex)

        arr.push({
          label: key,
          index: textIndex,
          row: row,
          col: col,
        })
      }
    });
    return arr
  }

  function outputSimpleJson (outArr) {
    // 输出简单的json数据，如果文件不存在打印提示
    if (config.simpleJsonOut) {
      if (!config.simpleJsonOutFile) {
        console.log(`提示: simpleJsonOutFile 不能为空`);
        return
      }
      const outputPath = path.resolve(absoluteCwd, config.simpleJsonOutFile);
      
      let referenceData = {};
      if (config.simpleJsonReferenceFile) {
        const referencePath = path.resolve(absoluteCwd, config.simpleJsonReferenceFile);
        // 读取参考文件内容
        if (utils.fsExistsSync(referencePath)) {
          try {
            const referenceContent = fs.readFileSync(referencePath, 'utf8');
            referenceData = JSON.parse(referenceContent);
          } catch (error) {
            console.error(`读取参考文件错误: ${error.message}`);
          }
        } else {
          console.log(`提示: 参考文件 ${referencePath} 不存在`);
        }
      }
      // 构建新的JSON数据
      const newData = {};
      outArr.forEach(item => {
        // 使用label作为键，text作为值
        newData[item.label] = config.simpleJsonUseKeyForDefault ? item.label : '';
      });

      // 合并参考数据和新数据
      // 根据配置决定是否过滤未使用的key
      let filteredReferenceData = referenceData;
      if (config.simpleJsonRemoveUnusedKeys) {
        filteredReferenceData = {};
        Object.keys(referenceData).forEach(key => {
          if (newData.hasOwnProperty(key)) {
            filteredReferenceData[key] = referenceData[key];
          }
        });
      }

      const mergedData = { ...newData, ...filteredReferenceData }

      // 对mergedData的key进行排序
      const sortedMergedData = {};
      Object.keys(mergedData).sort().forEach(key => {
        sortedMergedData[key] = mergedData[key];
      });

      // 写入输出文件
      try {
        fs.writeFileSync(outputPath, JSON.stringify(sortedMergedData, null, 2), 'utf8');
        console.log(`简单JSON文件已输出到: ${outputPath}`);
      } catch (error) {
        console.error(`写入JSON文件错误: ${error.message}`);
      }
    }
  }

  function run () {
    const result = {}
    vfs
    .src(config.i18nFileRules.map(item => path.resolve(absoluteRootDir, item)),{
        ignore: config.ignoreI18nFileRules.map(item => path.resolve(absoluteRootDir, item)),
        dot: false
      }
    )
    .pipe(
      map((file, cb) => {
        if (file.isDirectory()) {
          cb()
          return
        }
        console.log('开始解析', file.path)
        const extname = path.extname(file.path)
        let fileContent = file.contents.toString()
        
        const resultArr = processFile(fileContent)
        if (resultArr.length) {
          result[file.path] = resultArr
        }

        cb()
      })
    )
    .on("end", async () => {
      console.log('全部处理完成')
      const filesPathArr = Object.keys(result)
      if (filesPathArr.length) {
        // 处理结果数据
        console.log('---提取结果---')
        const outArr = []
        for (let i = 0; i < filesPathArr.length; i++) {
          const path = filesPathArr[i]
          console.log(`文件：${path}`)
          for (let j = 0; j < result[path].length; j++) {
            console.log(result[path][j].label)
            outArr.push({ path, ...result[path][j] })
          }
        }
        // 输出结果数据
        if (config.outCsv) {
          const csv = new ObjectsToCsv(outArr);
          const csvFile = path.resolve(outPath, "vve-i18n-extract-output.csv")
          if (utils.fsExistsSync(csvFile)) {
            fs.unlinkSync(csvFile)
          }
          await csv.toDisk(csvFile, { bom: true }); // bom为true 解决中文乱码问题
        }

        // 输出简单的json数据，如果文件不存在打印提示
        if (config.simpleJsonOut) {
          outputSimpleJson(outArr)
        }

        console.log('---提取完成---')
      } else {
        console.log('---提取完成，无可提取的内容---')
      }
    });
  }

  run()
}

init()
