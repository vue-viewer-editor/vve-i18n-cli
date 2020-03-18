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
      const fileContent = file.contents.toString();
      // 匹配中文字符的正则表达式： [\u4e00-\u9fa5] // https://www.w3cschool.cn/regexp/nck51pqj.html
      // 匹配双字节字符(包括汉字在内)：[^\x00-\xff] // https://www.w3cschool.cn/regexp/nck51pqj.html
      // (?!\$t\()([^\x00-\xff]+) 不已啥开头
      // ([^\x00-\xff]+)
      // 匹配中文
      const regI18n = new RegExp(/([^\x00-\xff]+)/, "g");
      // while ((tmpRegData.matches = regI18n.exec(fileContent))) {
      //   // console.log(tmpRegData.matches)
      //   console.log(tmpRegData.matches[1])
      // }

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

      // 是否被$t包裹 $t("你好") 识别出来的中文
      function isWrapByI18n (str, match, index) {
        const prefix = fileContent.slice(index - 4, index).replace('"', "'");
        const subfix = fileContent.slice(index + match.length, index + match.length + 2).replace('"', "'");
        return prefix === "$t('" && subfix === "')"
      }

      // 国际化文本，至少包含一个中文，可以包含中文数字.和空格，用户匹配
      const i18nContentReg = /(?![{}A-Za-z0-9.]+)([^\x00-\xff]|[A-Za-z0-9. ])+/g
      // 判定是否包含中文，用于test
      const i18nContenTestReg = /^(?![A-Za-z0-9.]+$)([^\x00-\xff]|[A-Za-z0-9. ])+$/
      // tag的内容正则匹配
      const TagContentReg = new RegExp('>((?:[^\x00-\xff]|\w|[0-9{}.A-Za-z\\s])+)<', 'g')
      // 处理template
      const templateReg = new RegExp("<template>([\\s\\S]+)<\\/template>", "i")
      // html start tag匹配正则
      const startTagReg = new RegExp(/<(?:[-A-Za-z0-9_]+)((?:\s+[a-zA-Z_:@][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(?:\/?)>/, 'g')
      // 属性的正则
      const attrReg = /([@:a-zA-Z_][-a-zA-Z0-9_.]*)(?:\s*=\s*(?:(?:"((?:\\.|[^"'])*)")|(?:'((?:\\.|[^'"])*)')))/g;
      // 前后非空白
      const nonPreSubWhiteReg = /\S.+\S/

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
      console.log(newFileContent)
    })
  )
  .on("end", () => {
  });
  