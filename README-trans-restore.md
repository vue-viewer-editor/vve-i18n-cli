# vve-i18n-zh-extract-cli

[![Build Status](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli.svg?branch=master)](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli)

使用[vve-i18n-trans-restore-cli](README-trans-restore)把json或xlsx文件中翻译的内容回填到json国际化资源文件中

## 安装

使用npm安装：

```
$ npm install vve-i18n-cli
```

## 使用

在package.json添加

```json
"scripts": {
  "i18n-trans-restore": "vve-i18n-trans-restore-cli"
}
```

然后 `npm run i18n-trans-restore`

## 参数

### 命令行指定参数

```javascript


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

```

### 配置文件指定参数

默认配置文件在${cwd}/vve-i18n-cli.config.js，样例内容如下所示

```javascript
module.exports = {
  transRestore: {
    languages: {
      'en': {
        translationFiles: ['translate.json'],
        i18nJsonRules: ["**/*/en.json"],
      }
    },
    excelConfig: {
      excelStartRow: 1
    }
  }
}
```

### 默认值

```javascript

const defaultExcelConfig = {
  excelStartRow: 0, // excel起始行，开始处理
  excelKeyCol: 0, // excel key 所在列
  excelValueCol: 1, // excel value 所在列
  excelSheetIndex: 0, // excel sheet索引
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
  languages: {
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
  },
  enableLanguages: true, // 为true表示全局启用，为false表示不启用，还可以为数组，表示启用部分
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
