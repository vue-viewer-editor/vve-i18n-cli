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

// 匹配中文字符的正则表达式： [\u4e00-\u9fa5] // https://www.w3cschool.cn/regexp/nck51pqj.html
// 匹配双字节字符(包括汉字在内)：[^\x00-\xff] // https://www.w3cschool.cn/regexp/nck51pqj.html
// (?!\$t\()([^\x00-\xff]+) 不已啥开头
// ([^\x00-\xff]+)
// 匹配中文
const regI18n = new RegExp(/([^\x00-\xff]+)/, "g");

// 左边是否是>
function letfRt (str, startIndex, range = 50) {
  const end = startIndex - range
  for (let i = startIndex; i >= end; i--) {
    if (str.charAt(i) === '>') return true
    if (!str.charAt(i).trim()) continue
    return false
  }
  return false
}
// 右边是否是<
function rightLt (str, startIndex, range = 50) {
  const end = startIndex + range
  for (let i = startIndex; i <= end; i++) {
    if (str.charAt(i) === '<') return true
    if (!str.charAt(i).trim()) continue
    return false
  }
  return false
}
// 是否在 > 之间 <
function betweenRtAndLt (strContent, match, index, range) {
  return letfRt(strContent, index - 1, range) && rightLt(strContent, match.length + index, range)
}

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

const i18nWrapPrefixReg = /t\s*\(\s*$/
// 是否被$t包裹 $t("你好") 识别出来的中文
function isWrapByI18n (str, match, index, range) {
  // const subfixText = getLineSubfixText(str, match, index, range) // 不判断后缀了，直接判定前缀
  // if (subfixText.trim().charAt(0) !== ')') return false
  const linePreText = getLinePreText(str, match ,index, range)
  if (!i18nWrapPrefixReg.test(linePreText.trim())) return false
  return true
}

// 国际化文本，中文开头，可以包含中文数字.和空格，用户匹配
const i18nContentReg = /(?![{}A-Za-z0-9.]+)([^\x00-\xff]|[A-Za-z0-9. ])+/g
// 判定是否包含中文，用于test
const i18nContenTestReg = /^(?![A-Za-z0-9.]+$)([^\x00-\xff]|[A-Za-z0-9. ])+$/
// 处理template
const templateReg = new RegExp("<template>([\\s\\S]+)<\\/template>", "i")
// 处理script
const scriptReg = new RegExp("<script>([\\s\\S]+)<\\/script>", "i")
// tag的内容正则匹配
const TagContentReg = new RegExp('>((?:[^\x00-\xff]|\w|[0-9{}.A-Za-z\\s])+)<', 'g')
// html start tag匹配正则
const startTagReg = new RegExp(/<(?:[-A-Za-z0-9_]+)((?:\s+[a-zA-Z_:@][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(?:\/?)>/, 'g')
// 属性的正则
const attrReg = /([@:a-zA-Z_][-a-zA-Z0-9_.]*)(?:\s*=\s*(?:(?:"((?:\\.|[^"'])*)")|(?:'((?:\\.|[^'"])*)')))/g;
// 前后非空白
const nonPreSubWhiteReg = /\S.+\S/
// 国际化字符串，被单引号或者双引号包裹，内容中文开头
const i18nStrReg = /"((?![{}A-Za-z0-9.]+)(?:[^\x00-\xff]|[A-Za-z0-9. ])+)"|'((?![{}A-Za-z0-9.]+)(?:[^\x00-\xff]|[A-Za-z0-9. ])+)'/g

// 解析vue文件
function processVueFile (fileContent) {
  // 过滤出template相关内容，处理tag内容的国际化
  let newFileContent = fileContent.replace(templateReg, function (match, templateKey, index) {
    // 经过TagContentReg的过滤，$()"",这些关键字都不会被当作国际化文本处理
    let newTemplateKey = templateKey.replace(TagContentReg, function (match, tagContentKey, index) {
      if (!tagContentKey.trim()) return match
      // console.log(match, tagContentKey)
      // 经过这一层过滤，会过滤去tag内容的中文，并加上国际化文本
      const newTagContentKey = tagContentKey.replace(i18nContentReg, function (match) {
        // 这个一层过滤，前后空格不会被包裹在国际化里面
        // 例子 <p> 啦啦啦 </p>  变成 <p> {{$t('啦啦啦')}} </p>
        const newMatch = match.replace(nonPreSubWhiteReg, function (match) {
          return `{{$t('${match}')}}`
        })
        return newMatch
      })
      return match.replace(tagContentKey, newTagContentKey)
    })
    return match.replace(templateKey, newTemplateKey)
  })
  // console.log(newFileContent)
  // 过滤出template相关内容，处理tag属性的国际化
  newFileContent = newFileContent.replace(templateReg, function (match, templateKey, index) {
    // 过滤出属性 <p title="希望的田野">
    let newTemplateKey = templateKey.replace(startTagReg, function (match, key, index) {
      const attrStr = key
      if (!attrStr.trim()) return match
      const newAttStr = attrStr.replace(attrReg, function (match, name, doubleQuoteValue, singleQuoteValue) {
        const value = doubleQuoteValue || singleQuoteValue
        if (name.charAt(0) === '@' || name.charAt(0) === ':') return match
        if (!i18nContenTestReg.test(value)) return match
        // console.log(arguments)
        return `:${name}="$t('${value}')"`
      })
      return match.replace(attrStr, newAttStr)
    })
    return match.replace(templateKey, newTemplateKey)
  })
  // console.log(newFileContent)
  // 过滤出script相关内容，过滤出被引号包裹的中文字符串，对这种类型进行替换国际化替换
  newFileContent = newFileContent.replace(scriptReg, function (match, scriptKey, index) {
    let newScriptKey = scriptKey.replace(i18nStrReg, function (match, key, key2, index) {
      if (isWrapByI18n(scriptKey, match, index, 50)) return match
      return `this.$t(${match})`
    })
    return match.replace(scriptKey, newScriptKey)
  })
  // console.log(newFileContent)
}

const i18nImportForJs = "import i18n from '@/i18n'"
const jsI18nFuncName = 'i18n.t'
const vueI18nFuncName = 't'

// 解析js文件
function processJsFile (fileContent) {
  let newFileContent = fileContent
  if (fileContent.indexOf(i18nImportForJs) === -1) {
    newFileContent = i18nImportForJs + '\n' + newFileContent
  }
  newFileContent = newFileContent.replace(i18nStrReg, function (match, key, key2, index) {
    if (isWrapByI18n(fileContent, match, index, 50)) return match
    return `i18n.t(${match})`
  })
  console.log(newFileContent)
}

function run () {
  vfs
  .src([
    path.resolve(absoluteRootDir, '**/*.+(vue)'),
    path.resolve(absoluteRootDir, '**/*.+(js)')
  ],{
      dot: false
    }
  )
  .pipe(
    map((file, cb) => {
      console.log('file',file.path)
      const extname = path.extname(file.path)
      if (extname.toLowerCase() === '.vue') {
        // processVueFile(file.contents.toString())
      } else if (extname.toLowerCase() === '.js') {
        processJsFile(file.contents.toString())
      }
      cb()
    })
  )
  .on("end", () => {
    console.log('end')
  });
}

run()
