#!/usr/bin/env node

"use strict";
const program = require("commander");
const utils = require("../utils");
const { loadConfig } = require("../configuration");
const vfs = require("vinyl-fs");
const map = require("map-stream");
const path = require("path");
const fs = require("fs");

function commaSeparatedList(value, split = ",") {
  return value.split(split).filter(item => item);
}

program
  .version(require('../../package.json').version)
  .option("--cwd <path>", "工作目录")
  .option("--root-dir <path>", "国际文本所在的根目录")
  .option(
    "--config <path>",
    "配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js"
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
    "--ignore-text-in-quote-rules <items>",
    "反引号中需要忽略的文本规则，可以是正则或者字符串",
    commaSeparatedList
  )
  .option(
    "--disabled-rules <items>",
    "如果满足匹配的内容，就忽略检查",
    commaSeparatedList
  )
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
  // 反引号中需要忽略的文本规则，可以是正则或者字符串
  ignoreTextInQuoteRules: [
    /t\(/
  ],
  // 如果满足匹配的内容，就忽略检查
  disableRules: [
    // 单行禁用，使用：在当前行添加 // vve-i18n-zh-check-disable-line
    /(.*\/\/(?:[^\S\r\n]*|.*[^\S\r\n]+)vve-i18n-zh-check-disable-line(?:[^\S\r\n]*|[^\S\r\n]+.*))/g,
    // 下一行禁用，使用：在上一行添加 // vve-i18n-zh-check-disable-next-line
    /\/\/(?:[^\S\r\n]*|.*[^\S\r\n]+)vve-i18n-zh-check-disable-next-line(?:[^\S\r\n]*|[^\S\r\n]+.*)\n(.+)/g,
    // 代码块禁用，使用：在需要的地方包括
    /\/\*\s*vve-i18n-zh-check-disable\s*\*\/([\s\S]*?)(?:(?:\/\*\s*vve-i18n-zh-check-enable\s*\*\/)|$)/g
  ],
};

Object.assign(config, program);

const CONFIG_JS_FILENAME = "vve-i18n-cli.config.js";

let absoluteCwd = path.resolve(config.cwd);

// 优先判断是否需要读取文件
if (!config.disableConfigFile) {
  let configFilePath = path.join(absoluteCwd, CONFIG_JS_FILENAME);
  if (config.config) {
    configFilePath = path.resolve(config.config);
  }
  if (fs.existsSync(configFilePath)) {
    const conf = loadConfig(configFilePath);
    if (conf && conf.options && conf.options.zhCheck) {
      Object.assign(config, conf.options.zhCheck, program);
    }
  }
}

// 制定配置文件后，cwd在配置文件中定义，则cwd就需要重新获取
if (!program.cwd) {
  absoluteCwd = path.resolve(config.cwd);
}

const { ignoreTextInQuoteRules } = config

const absoluteRootDir = path.resolve(absoluteCwd, config.rootDir);

// 匹配中文字符的正则表达式： [\u4e00-\u9fa5] // https://www.w3cschool.cn/regexp/nck51pqj.html
// 匹配双字节字符(包括汉字在内)：[^\x00-\xff] // https://www.w3cschool.cn/regexp/nck51pqj.html
// (?!\$t\()([^\x00-\xff]+) 不已啥开头
// ([^\x00-\xff]+)
// 匹配中文
const regI18n = new RegExp(/([^\x00-\xff]+)/, "g");

// 获取当前元素所在行之前的元素
function getLinePreText(str, match, index, range = 300) {
  const startIndex = index - 1
  let end = startIndex - range
  for (let i = startIndex; i >= end; i--) {
    if (str.charAt(i) === '\n') {
      end = i
      break;
    }
  }
  return str.slice(end, index)
}

// 获取当前元素所在行之后的元素
function getLineSubfixText(str, match, index, range = 300) {
  const startIndex = match.length + index
  let end = startIndex + range
  for (let i = startIndex; i <= end; i++) {
    if (str.charAt(i) === '\n') {
      end = i
      break;
    }
  }
  return str.slice(startIndex, end)
}

// 判定是否被双斜杆注释包裹
function isWrapByDoubelSlashComment (str, match, index, range = 500) {
  const linePreText = getLinePreText(str, match ,index, range)
  return linePreText.indexOf('//') !== -1
}

// 是否有一些关键词
function hasSomeKeyword (str, keywords = ['var', 'let', 'const', 'new Error']) {
  return keywords.some((item) => str.indexOf(item) !== -1) 
}

const i18nWrapPrefixReg = /t\s*\(\s*$/
// 是否被$t包裹 $t("你好") 识别出来的中文
function isWrapByI18n (str, match, index, range) {
  // const subfixText = getLineSubfixText(str, match, index, range) // 不判断后缀了，直接判定前缀
  // if (subfixText.trim().charAt(0) !== ')') return false
  const linePreText = getLinePreText(str, match ,index, range)
  if (!i18nWrapPrefixReg.test(linePreText.trim())) return false
  return true
}

// 是否被 这个注释包括的 /* 包裹的中文
function isWrapByStartComment (str, match, index, range = 500) {
  const startIndex = index - 1
  let end = startIndex - range
  for (let i = startIndex; (i >= (end -1) || i >= 1); i--) {
    // 如果先遇到*/ 则表示不是被包裹
    if (str.charAt(i - 1) === '*' && str.charAt(i) === '/') {
      return false
    } else if (str.charAt(i - 1) === '/' && str.charAt(i) === '*') {
      return true
    }
  }
  return false
}

// 是否被 这个注释是否包裹在 data {} 或者 computed 中 包裹的中文
function isWrapByDataOrComputed (str, match, index, range = 2000) {
  const startIndex = index - 1
  let end = startIndex - range
  for (let i = startIndex; (i >= (end -1) || i >= 1); i--) {
    const subStr = str.slice(i, startIndex)
    if (/^methods\s*:[\s\n]*{/.test(subStr)) {
      return false
    }
    if (/^data\s*\(\s*\)[\s\n]*{/.test(subStr)) {
      return true
    }
    if (/^computed\s*:[\s\n]*{/.test(subStr)) {
      return true
    }
  }
  return false
}

// 前缀是否满足要求
function prefixTestReg (reg, str, match, index, range) {
  const linePreText = getLinePreText(str, match ,index, range)
  return new RegExp(reg).test(linePreText.trim())
}

// 查找关闭的花括号关闭的位置
function findClosingBracketMatchIndex(str, pos) {
  if (str[pos] !== '{') {
    throw new Error("No '{' at index " + pos)
  }
  let depth = 1;
  for (let i = pos + 1; i < str.length; i++) {
    switch (str[i]) {
      case '{':
        depth++
        break;
      case '}':
        if (--depth === 0) {
          return i
        }
        break
    }
  }
  return -1
}

// 提取属性名称
const propNameReg = /([a-zA-Z0-9_$]+)["']?[\s\n]*[:\(]+/i
function matchPropName (fileContent, startIndex, endIndex) {
  const str = fileContent.slice(startIndex, endIndex)
  const match = propNameReg.exec(str)
  if (match) {
    // console.log(match[1], fileContent.charAt(startIndex + match.index))
    return {
      name: match[1],
      index: startIndex + match.index,
      fileContent,
    }
  }
  return null
}

// 提取出data,computed,methods,props等信息
const defaultObjReg = /export\s*default[\s\n]*{/i
function getVueOptionsProps (fileContent) {

  const arr = [] // [{ name: '', index: 100, fileContent: '' }]

  let match = defaultObjReg.exec(fileContent)
  if (match) {
    let bracketIndex = match.index + match[0].length - 1
    let closingBracketIndex = findClosingBracketMatchIndex(fileContent, bracketIndex)
    if (closingBracketIndex !== -1) {
      let str = fileContent.slice(bracketIndex + 1, closingBracketIndex)
      let oldBracketIndex = bracketIndex
      bracketIndex = str.indexOf('{');
      if (bracketIndex !== -1) {
        
        bracketIndex = oldBracketIndex + bracketIndex + 1

        // str = fileContent.slice(oldBracketIndex + 1, bracketIndex)
        // 提取属性名
        const obj = matchPropName(fileContent, oldBracketIndex + 1, bracketIndex)
        if (obj) {
          arr.push(obj)
        }
        
        closingBracketIndex = findClosingBracketMatchIndex(fileContent, bracketIndex);
        if (closingBracketIndex !== -1) {

          while (true) {
            const remainingPartStr = fileContent.slice(closingBracketIndex + 1)
            oldBracketIndex = closingBracketIndex + 1
            bracketIndex = remainingPartStr.indexOf('{');
            if (bracketIndex !== -1) {
              bracketIndex = oldBracketIndex + bracketIndex

              // str = fileContent.slice(oldBracketIndex + 1, bracketIndex)
              // 提取属性名
              const obj = matchPropName(fileContent, oldBracketIndex + 1, bracketIndex)
              if (obj) {
                arr.push(obj)
              }

              closingBracketIndex = findClosingBracketMatchIndex(fileContent, bracketIndex);
              if (closingBracketIndex === -1) {
                break;
              }
            } else {
              break;
            }
          }
        }
      }
    }
  }

  return arr;
}


// 国际化文本，中文开头，可以包含中文数字.和空格，用户匹配
const i18nContentReg = /(?![{}A-Za-z0-9.©×\-_!, ]+)([^\x00-\xff]|[A-Za-z0-9.©×\-_!, ])+/g
// 处理template
const templateReg = new RegExp("<template>([\\s\\S]+)<\\/template>", "i")
// 处理script
const scriptReg = /<script(?:\s*|\s+.+?)>([\s\S]+)<\/script>/i
// 国际化字符串，被单引号或者双引号包裹，内容中文开头
const i18nStrReg = /"([^"{}\n]*[^\x00-\xff]+[^"{}\n]*)"|'([^'{}\n]*[^\x00-\xff]+[^'{}\n]*)'/g
// 中文做key的正则
const zhKeyReg = /['"]?([\u4e00-\u9fa5]+)['"]?\s*:\s(?:['"`]|(?:this\.)|(?:i18n\.))/g

// 包含中文
const zhReg = new RegExp("[\\u4E00-\\u9FFF]+", "");

// 处理<script> 到 export default 中间的内容
const scriptPreReg = new RegExp("script>([\\s\\S]+)(?:export\\s*default)", "i")
// 处理props: {} 中间的中文
const propsReg = new RegExp("props\\s*:[\\s\\n]*{", "i")
// 处理``中间中文的处理
const backQuoteReg = /(`[\s\S\n]+?`)/g
// 处理validator的引用问题
const validatorReg = /(validator\s*\(\s*rule\s*,\s*(?:value|val)\s*,\s*(?:callback|cb)\s*\)[\s\n]*{)/g

function processVueFile (fileContent) {
  const resultArr = []

  // 处理<script> 到 export default 中间的内容
  let match = scriptPreReg.exec(fileContent)
  if (match) {
    const matchContent = match[1]
    let zhMatch;
    while(zhMatch = i18nStrReg.exec(matchContent)) {
      // 忽略被/* */ 注释的中文
      if (isWrapByStartComment(matchContent, zhMatch[0], zhMatch.index)) {
        continue;
      }
      // 忽略被// 注释的中文
      if (isWrapByDoubelSlashComment(matchContent, zhMatch[0], zhMatch.index)) {
        continue;
      }
      resultArr.push({
        type: 'script-pre',
        text: zhMatch[0].slice(1, zhMatch[0].length - 1), // 去掉引号，只保留中文
      })
    }
  }

  // 获取vue的属性列表
  const vueOptionsPropsList = getVueOptionsProps(fileContent)

  // 处理props: {} 中间的中文
  let propsMatch = propsReg.exec(fileContent)
  let vuePropInfo = vueOptionsPropsList.find(item => item.name === 'props')
  if (propsMatch && vuePropInfo && propsMatch.index === vuePropInfo.index) {
    const propsStartIndex = propsMatch.index + propsMatch[0].length - 1
    const propsCloseIndex = findClosingBracketMatchIndex(fileContent, propsStartIndex)
    if (propsCloseIndex !== -1) {
      const matchContent = fileContent.slice(propsStartIndex, propsCloseIndex)
      let zhMatch;
      while(zhMatch = i18nStrReg.exec(matchContent)) {
        // 忽略被/* */ 注释的中文
        if (isWrapByStartComment(matchContent, zhMatch[0], zhMatch.index)) {
          continue;
        }
        // 忽略被// 注释的中文
        if (isWrapByDoubelSlashComment(matchContent, zhMatch[0], zhMatch.index)) {
          continue;
        }

        resultArr.push({
          type: 'props',
          text: zhMatch[0].slice(1, zhMatch[0].length - 1), // 去掉引号，只保留中文
        })
      }
    }
  }

  // 处理``中间中文的处理
  let backQuoteMatch
  while (backQuoteMatch = backQuoteReg.exec(fileContent)) {
    if (backQuoteMatch) {
      // 忽略被/* */ 注释的中文
      if (isWrapByStartComment(fileContent, backQuoteMatch[0], backQuoteMatch.index)) {
        continue;
      }
      // 忽略被// 注释的中文
      if (isWrapByDoubelSlashComment(fileContent, backQuoteMatch[0], backQuoteMatch.index)) {
        continue;
      }
      // 是否包含一些关键字，如果是，则不处理，表示一些实例代码
      if (hasSomeKeyword(backQuoteMatch[0])) {
        continue;
      }

      // 处理反引号中需要忽略的文本
      var flag = false
      var pureTextMatch = backQuoteMatch[0].slice(1, -2)
      for (let i = 0; i < ignoreTextInQuoteRules.length; i++) {
        if (typeof ignoreTextInQuoteRules[i] === 'string') {
          if (ignoreTextInQuoteRules[i] === pureTextMatch) {
            flag = true
            break
          }
        } else if (Object.prototype.toString.call(ignoreTextInQuoteRules[i]) === "[object RegExp]") {
          if (ignoreTextInQuoteRules[i].test(pureTextMatch)) {
            flag = true
            break;
          }
        }
      }
      if (flag) {
        continue;
      }
      // 处理反引号中需要忽略的文本 end

      if (zhReg.test(backQuoteMatch[0])) {
        resultArr.push({
          type: 'back-quote',
          text: backQuoteMatch[0].slice(1, backQuoteMatch[0].length - 1), // 去掉引号，只保留中文
        })
      }
    }
  }
  // validator 国际化中文
  let validatorMatch
  while (validatorMatch = validatorReg.exec(fileContent)) {

    // 只处理包裹在data和computed中的方法
    if (isWrapByDataOrComputed(fileContent, validatorMatch[0], validatorMatch.index)) {

      // console.log(propsMatch[0])
      const validatorStartIndex = validatorMatch.index + validatorMatch[0].length - 1
      const validatorCloseIndex = findClosingBracketMatchIndex(fileContent, validatorStartIndex)
      if (validatorCloseIndex !== -1) {
        const matchContent = fileContent.slice(validatorStartIndex, validatorCloseIndex)

        let zhMatch
        while(zhMatch = i18nStrReg.exec(matchContent)) {
          // 忽略被/* */ 注释的中文
          if (isWrapByStartComment(matchContent, zhMatch[0], zhMatch.index)) {
            continue;
          }
          // 忽略被// 注释的中文
          if (isWrapByDoubelSlashComment(matchContent, zhMatch[0], zhMatch.index)) {
            continue;
          }
          resultArr.push({
            type: 'validator',
            text: zhMatch[0].slice(1, zhMatch[0].length - 1), // 去掉引号，只保留中文
          })
        }
      }
    }
  }
  // 处理中文做key
  let zhKeyMatch
  while (zhKeyMatch = zhKeyReg.exec(fileContent)) {
    // 忽略被/* */ 注释的中文
    if (isWrapByStartComment(fileContent, zhKeyMatch[0], zhKeyMatch.index)) {
      continue;
    }
    // 忽略被// 注释的中文
    if (isWrapByDoubelSlashComment(fileContent, zhKeyMatch[0], zhKeyMatch.index)) {
      continue;
    }
    // 只处理包裹在data和computed中的方法
    if (isWrapByDataOrComputed(fileContent, zhKeyMatch[0], zhKeyMatch.index)) {
      resultArr.push({
        type: 'zh-key',
        text: zhKeyMatch[1], // 去掉引号，只保留中文
      })
    }
  }
  
  // 其他待处理
  return resultArr
}

function processJsFile (fileContent) {
  const resultArr = []

  // 处理``中间中文的处理
  let backQuoteMatch
  while (backQuoteMatch = backQuoteReg.exec(fileContent)) {
    if (backQuoteMatch) {
      // 忽略被/* */ 注释的中文
      if (isWrapByStartComment(fileContent, backQuoteMatch[0], backQuoteMatch.index)) {
        continue;
      }
      // 忽略被// 注释的中文
      if (isWrapByDoubelSlashComment(fileContent, backQuoteMatch[0], backQuoteMatch.index)) {
        continue;
      }
      // 是否包含一些关键字，如果是，则不处理
      if (hasSomeKeyword(backQuoteMatch[0])) {
        continue;
      }

      // 处理反引号中需要忽略的文本
      var flag = false
      var pureTextMatch = backQuoteMatch[0].slice(1, -2)
      for (let i = 0; i < ignoreTextInQuoteRules.length; i++) {
        if (typeof ignoreTextInQuoteRules[i] === 'string') {
          if (ignoreTextInQuoteRules[i] === pureTextMatch) {
            flag = true
            break
          }
        } else if (Object.prototype.toString.call(ignoreTextInQuoteRules[i]) === "[object RegExp]") {
          if (ignoreTextInQuoteRules[i].test(pureTextMatch)) {
            flag = true
            break;
          }
        }
      }
      if (flag) {
        continue;
      }
      // 处理反引号中需要忽略的文本 end

      if (zhReg.test(backQuoteMatch[0])) {
        resultArr.push({
          type: 'back-quote',
          text: backQuoteMatch[0].slice(1, backQuoteMatch[0].length - 1), // 去掉引号，只保留中文
        })
      }
    }
  }
  // 处理中文做key
  let zhKeyMatch
  while (zhKeyMatch = zhKeyReg.exec(fileContent)) {
    // 忽略被/* */ 注释的中文
    if (isWrapByStartComment(fileContent, zhKeyMatch[0], zhKeyMatch.index)) {
      continue;
    }
    // 忽略被// 注释的中文
    if (isWrapByDoubelSlashComment(fileContent, zhKeyMatch[0], zhKeyMatch.index)) {
      continue;
    }
    // 只处理包裹在data和computed中的方法
    if (isWrapByDataOrComputed(fileContent, zhKeyMatch[0], zhKeyMatch.index)) {
      resultArr.push({
        type: 'zh-key',
        text: zhKeyMatch[1], // 去掉引号，只保留中文
      })
    }
  }
  // 其他待处理
  return resultArr
}

// 禁用的文本列表，临时使用
const disableTextArr = []

// 根据匹配规则，把匹配的内容，替换成一个占位符
function replaceWithPlaceholderByRule (str, rule) {
  str = str.replace(new RegExp(rule), function(match, key, index) {
    const count = disableTextArr.length;
    disableTextArr.push(key);
    return match.replace(key, `@@@@@@disableText_${count}@@@@@@`);
  });
  return str
}

// 根据匹配规则列表，把匹配的内容，替换成一个占位符
function replaceWithPlaceholder (str, disableRules) {
  for (let i = 0; i < disableRules.length; i++) {
    str = replaceWithPlaceholderByRule(str, disableRules[i])
  }
  return str
}

// 把占位的内容，还原
function placeholderRestore (str) {
  str = str.replace(/(@@@@@@disableText_(\d+)@@@@@@)/g, function(match, key, key2, index) {
    return disableTextArr[key2]
  });
  return str
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
      console.log('开始解析', file.path)
      const extname = path.extname(file.path)
      let fileContent = file.contents.toString()
      
      // 根据禁用匹配规则列表，把匹配的内容替换成一个占位符，之后check就不会check这些代码
      fileContent = replaceWithPlaceholder(fileContent, config.disableRules)

      if (extname.toLowerCase() === '.vue') {
        const resultArr = processVueFile(fileContent)
        if (resultArr.length) {
          result[file.path] = resultArr
        }
      } else if (extname.toLowerCase() === '.js') {
        const resultArr = processJsFile(fileContent)
        if (resultArr.length) {
          result[file.path] = resultArr
        }
      }
      cb()
    })
  )
  .on("end", () => {
    console.log('全部处理完成')
    const filesPathArr = Object.keys(result)
    if (filesPathArr.length) {
      for (let i = 0; i < filesPathArr.length; i++) {
        const path = filesPathArr[i]
        console.log(`文件：${path}`)
        for (let j = 0; j < result[path].length; j++) {
          console.log(JSON.stringify(result[path][j]))
        }
      }
    } else {
      console.log('恭喜，检测通过')
    }
  });
}

run()
