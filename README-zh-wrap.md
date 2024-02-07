# vve-i18n-zh-wrap-cli

[![Build Status](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli.svg?branch=master)](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli)

把vue和js中的中文包裹一层国际化函数，配合[vve-i18n-cli](README.md)可以直接生成国际化资源文件

## 例子

vue文件

```vue
<template>
  <div>
    <p>你好{{world}}</p>
  </div>
</template>
<script>
export default {
  data () {
    return {
      world: "世界"
    }
  }
}
</script>
```

vue文件转换后

```vue
<template>
  <div>
    <p>{{$t('你好')}}{{world}}</p>
  </div>
</template>
<script>
export default {
  data () {
    return {
      world: this.$t("世界")
    }
  }
}
</script>
```

js文件

```js
const OPTIONS = [
  { label: '希望', value: 1 },
  { label: '爱情', value: 2 },
]
```

js文件转换后

```js
import { i18n } from '@/i18n'
const OPTIONS = [
  { label: i18n.t('希望'), value: 1 },
  { label: i18n.t('爱情'), value: 2 },
]
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
  "i18n-zh-wrap": "vve-i18n-zh-wrap-cli"
}
```

然后 `npm run i18n-zh-wrap`

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
    "--ignore-pre-geg <items>",
    "被忽略的前缀，是个数组",
    commaSeparatedList
  )
  .option(
    "--ignore-text <items>",
    "被忽略的文本，是个数组",
    commaSeparatedList
  )
  .option(
    "--ignore-attr <items>",
    "被忽略的属性，该属性的value值如果是中文，则不会被包裹，是个数组",
    commaSeparatedList
  )
  .option(
    "--disabledRules <items>",
    "如果满足匹配的内容，就忽略包裹",
    commaSeparatedList
  )
  .option("--i18n-import-for-js <item>", "js相关文件需要引入的国际化文件")
  .option("--js-i18n-func-name <item>", "js相关文件需要使用国际化方法")
  .option("--vue-i18n-func-name <item>", "vue相关文件需要使用的国际化方法")
  .parse(process.argv);
```

### 配置文件指定参数

默认配置文件在${cwd}/vve-i18n-cli.config.js，样例内容如下所示

```javascript
module.exports = {
  zhWrap: {
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
  // 被忽略的前缀
  ignorePreReg: [
    /t\s*\([\s\n]*$/,
    /tl\s*\([\s\n]*$/,
    /console\.(?:log|error|warn|info|debug)\s*\(\s*$/,
    new RegExp("//.*"),
  ],
  // 被忽略的文本
  ignoreText: [
    /t\(/,
    /tl\(/,
  ],
  // 被忽略的属性，该属性的value值如果是中文，则不会被包裹
  ignoreAttr: [],
  // 如果满足匹配的内容，就忽略包裹
  disableRules: [
    // 单行禁用，使用：在当前行添加 // vve-i18n-zh-wrap-disable-line
    /(.*\/\/(?:[^\S\r\n]*|.*[^\S\r\n]+)vve-i18n-zh-wrap-disable-line(?:[^\S\r\n]*|[^\S\r\n]+.*))/g,
    // 下一行禁用，使用：在上一行添加 // vve-i18n-zh-wrap-disable-next-line
    /\/\/(?:[^\S\r\n]*|.*[^\S\r\n]+)vve-i18n-zh-wrap-disable-next-line(?:[^\S\r\n]*|[^\S\r\n]+.*)\n(.+)/g,
    // 代码块禁用，使用：在需要的地方包括
    /\/\*\s*vve-i18n-zh-wrap-disable\s*\*\/([\s\S]*?)(?:(?:\/\*\s*vve-i18n-zh-wrap-enable\s*\*\/)|$)/g
  ],
  // js相关文件需要引入的国际化文件
  i18nImportForJs: "import i18n from '@/i18n'",
  // js相关文件需要使用国际化方法
  jsI18nFuncName: 'i18n.t',
  // vue相关文件需要使用的国际化方法
  vueI18nFuncName: '$t',
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
