# vve-i18n-zh-extract-cli

[![Build Status](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli.svg?branch=master)](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli)

使用[vve-i18n-zh-find-untrans-cli](README-zh-find-untrans)从json文件中提取未翻译的内容，输出到指定excel或json文件中

## 安装

使用npm安装：

```
$ npm install vve-i18n-cli
```

## 使用

在package.json添加

```json
"scripts": {
  "zh-find-untrans": "vve-i18n-zh-find-untrans-cli"
}
```

然后 `npm run i18n-zh-find-untrans`

## 参数

### 命令行指定参数

```javascript


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

```

### 配置文件指定参数

默认配置文件在${cwd}/vve-i18n-cli.config.js，样例内容如下所示

```javascript
module.exports = {
  zhFindUntrans: {
    languages: {
      'en': {
        i18nJsonRules: ["**/*/en.json"],
        untranslatedRules: [
          { type: 'regex', pattern: /[\u4E00-\u9FFF]/ },
        ],
        outputFiles: [
          '未翻译.xlsx',
        ],
        excelConfig: {
          headerKeyTitle: '中文', // excel key 所在列，覆盖全局的设置
          headerValueTitle: 'English', // excel value 所在列，覆盖全局的设置
          skipHeader: false,
        },
      }
    },
  }
}
```

### 默认值

```javascript

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
