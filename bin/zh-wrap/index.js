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
    "--ignore-pre-geg <items>",
    "被忽略的前缀，是个数组",
    commaSeparatedList
  )
  .option("--i18n-import-for-js <item>", "js相关文件需要引入的国际化文件")
  .option("--js-i18n-func-name <item>", "js相关文件需要使用国际化方法")
  .option("--vue-i18n-func-name <item>", "vue相关文件需要使用的国际化方法")
  .parse(process.argv);

const config = {
  // 工作目录
  cwd: ".",
  // 根目录，国际文本所在的根目录
  rootDir: "./test/example-wrap/src",
  // 被忽略的前缀
  ignorePreReg: [
    /t\s*\(\s*$/,
    /tl\s*\(\s*$/,
    /console\.(?:log|error|warn|info|debug)\s*\(\s*$/,
  ],
  // js相关文件需要引入的国际化文件
  i18nImportForJs: "import i18n from '@/i18n'",
  // js相关文件需要使用国际化方法
  jsI18nFuncName: 'i18n.t',
  // vue相关文件需要使用的国际化方法
  vueI18nFuncName: '$t',
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

const { ignorePreReg, i18nImportForJs, jsI18nFuncName, vueI18nFuncName } = config

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

// 前缀是否满足要求
function prefixTestReg (reg, str, match, index, range) {
  const linePreText = getLinePreText(str, match ,index, range)
  return new RegExp(reg).test(linePreText.trim())
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
          // vueI18nFuncName = '$t' => `$t('${match}')`
          return `{{${vueI18nFuncName}('${match}')}}`
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
        // vueI18nFuncName = '$t' => `$t(${value})`
        return `:${name}="${vueI18nFuncName}('${value}')"`
      })
      return match.replace(attrStr, newAttStr)
    })
    return match.replace(templateKey, newTemplateKey)
  })
  // console.log(newFileContent)
  // 过滤出script相关内容，过滤出被引号包裹的中文字符串，对这种类型进行替换国际化替换
  newFileContent = newFileContent.replace(scriptReg, function (match, scriptKey, index) {
    let newScriptKey = scriptKey.replace(i18nStrReg, function (match, key, key2, index) {
      for (let i = 0; i < ignorePreReg.length; i++) {
        if (prefixTestReg(ignorePreReg[i], scriptKey, match, index, 50)) return match
      }
      // vueI18nFuncName = '$t' => `this.$t(${match})`
      return `this.${vueI18nFuncName}(${match})`
    })
    return match.replace(scriptKey, newScriptKey)
  })
  // console.log(newFileContent)
  return newFileContent
}

// 解析js文件
function processJsFile (fileContent) {
  let newFileContent = fileContent
  if (fileContent.indexOf(i18nImportForJs) === -1 && i18nImportForJs) {
    newFileContent = i18nImportForJs + '\n' + newFileContent
  }
  newFileContent = newFileContent.replace(i18nStrReg, function (match, key, key2, index) {
    for (let i = 0; i < ignorePreReg.length; i++) {
      if (prefixTestReg(ignorePreReg[i], newFileContent, match, index, 50)) return match
    }
    // jsI18nFuncName = 'i18n.t' => `i18n.t(${match})`
    return `${jsI18nFuncName}(${match})`
  })
  // console.log(newFileContent)
  return newFileContent
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
      console.log('开始解析', file.path)
      const extname = path.extname(file.path)
      let fileContent = file.contents.toString()
      let newFileContent
      if (extname.toLowerCase() === '.vue') {
        newFileContent = processVueFile(fileContent)
      } else if (extname.toLowerCase() === '.js') {
        newFileContent = processJsFile(fileContent.toString())
      }
      if (!newFileContent) {
        console.log('内容为空，无需处理', file.path)
      } else if (newFileContent !== fileContent) {
        fs.writeFileSync(file.path, newFileContent)
        console.log('处理完成', file.path)
      } else {
        console.log('内容未改变，无需处理', file.path)
      }
      cb()
    })
  )
  .on("end", () => {
    console.log('全部处理完成')
  });
}

run()
