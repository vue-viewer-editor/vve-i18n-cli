# vve-i18n-zh-check-cli

[![Build Status](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli.svg?branch=master)](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli)

使用[vve-i18n-zh-wrap-cli](README-zh-wrap.md)把vue和js中的中文包裹一层国际化函数，但有些中文无法被包裹或者包裹后可能会导致程序异常。

使用 `vve-i18n-zh-check-cli`可以提前检测这些中文的存在，并给出相关的信息提醒开发者进行修订。

## 例子

vue文件

```vue
<template>
  <div>
    <p>测试文字</p>
  </div>
</template>
<script>
/**
 * 您好ccc
 * 吗
 * "过后打扫房间了"
 */

// 您好233 fsafsaf你好3

const message1 = "您好"

const message2 = `引号`

/**
 * 12312afsa你好22
 */

export default {
  props: {
    type: {
      default: '我是属性'
    }
  },
  data () {
    return {
      rules: [
        { 
          validator (rule, val, callback) {
            callback(new Error("请输入"))
          }
        }
      ],
      obj: {
        其他: 'aaa'
      }
    }
  },
  computed: {
  },
  methods: {
  },
  computed: {
  }
}
</script>
```

结果

```
{"type":"script-pre","text":"您好"}
{"type":"props","text":"我是属性"}
{"type":"back-quote","text":"引号"}
{"type":"validator","text":"请输入"}
{"type":"zh-key","text":"其他"}
```

## 返回类型说明

### script-pre

`<script>` 到 `export default` 中间出现的中文，建议把这一部分功能转移到vue对象中实现，避免 `this`指针异常

### props

`props: {}`中间出现的中文，建议这一块利用 `computed`改写一下

### back-quote

\`\`反引号中间出现的中文，建议利用国际化的变量语法进行处理

### validator

`validator () {}` 中间出现的中文，建议使用箭头函数实现，避免 `this`指针异常

## 安装

使用npm安装：

```
$ npm install vve-i18n-cli
```

## 使用

在package.json添加

```json
"scripts": {
  "i18n-zh-check": "vve-i18n-zh-check-cli"
}
```

然后 `npm run i18n-zh-check`

## 参数

### 命令行指定参数

```javascript
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
    "--disable-check-back-quote",
    "是否禁用检查反引号",
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
```

### 配置文件指定参数

默认配置文件在${cwd}/vve-i18n-cli.config.js，样例内容如下所示

```javascript
module.exports = {
  zhCheck: {
    rootDir: 'src',
    i18nFileRules: ["**/*.+(vue|js)"],
  }
}
```

### 默认值

```javascript

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
  // 是否禁用检查反引号，应为zh-wrap支持引号代码国际化转换，故可以通过此配置，去掉检查的引号的行为
  disableCheckBackQuote: false,
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
```

### 开发

- node >= 8

```
npm i // 安装依赖
npm test // 测试
npm run release // 发布
git push --follow-tags origin master && npm publish // npm 发布
```

## 捐赠

如果你觉得它有用，你可以给我买一杯奶茶。

<img width="650" src="https://raw.githubusercontent.com/vue-viewer-editor/vve-i18n-cli/master/qrcode-donation.png" alt="donation">
