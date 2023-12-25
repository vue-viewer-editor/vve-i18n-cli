# vve-i18n-zh-extract-cli

[![Build Status](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli.svg?branch=master)](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli)

使用[vve-i18n-zh-wrap-cli](README-zh-wrap.md)把vue和js中的中文包裹一层国际化函数，但有些中文无法被包裹或者包裹后可能会导致程序异常。

使用[vve-i18n-zh-check-cli](README-zh-check.md)可以提前检测这些中文的存在，并给出相关的信息提醒开发者进行修订，但提供的信息相对有限，还是有一些中文遗留。

使用 `vve-i18n-zh-extract-cli`可以提取中文，配置忽略规则，可以提取出所有上述工具无法处理的中文，后根据提取结果人工进行甄别判断处理。

## 例子

vue文件

```vue
<template>
  <div>
    <p>测试文字</p>
    <!-- 希望先学习 2dd-->
  </div>
</template>
<script>
/**
 * 多行注释1
 */

// 单行注释

/**
 * 多行注释2
 */

// vve-i18n-zh-extract-disable-next-line
const message4 = "下一行禁止提取"

/* vve-i18n-zh-extract-disable */
 const message5 = "包裹禁止提取" // 测试啦啦啦
/* vve-i18n-zh-extract-enable */

export default {
  props: {
    type: {
      default: '我是属性'
    }
  },
  data () {
    return {
      title: this.$t('您好')
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
测试文字
我是属性
```

## 安装

使用npm安装：

```
$ npm install vve-i18n-cli
```

## 使用

在package.json添加

```json
"scripts": {
  "i18n-zh-extract": "vve-i18n-zh-extract-cli"
}
```

然后 `npm run i18n-zh-extract`

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
  .parse(process.argv);
```

### 配置文件指定参数

默认配置文件在${cwd}/vve-i18n-cli.config.js，样例内容如下所示

```javascript
module.exports = {
  zhExtract: {
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
