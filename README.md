# vve-i18n-cli

[![Build Status](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli.svg?branch=master)](https://travis-ci.org/vue-viewer-editor/vve-i18n-cli)

抽取国际化文本，生成国际化资源文件，配合[vve-i18n-zh-check-cli](README-zh-check.md)和[vve-i18n-zh-wrap-cli](README-zh-wrap.md)可以把中文包裹一层国际化函数，应用无缝变成国际化应用

## 安装

使用npm安装：

```
$ npm install vve-i18n-cli
```

## 使用

在package.json添加

```json
"scripts": {
  "i18n": "vve-i18n-cli"
}
```

然后 `npm run i18n`

## 参数

### 命令行指定参数

```javascript

program
  .version(require('../package.json').version)
  .option("--cwd <path>", "工作目录")
  .option("--root-dir <path>", "国际文本所在的根目录")
  .option(
    "--module-index-rules <items>",
    "模块入口列表",
    commaSeparatedList
  )
  .option(
    "--ignore-module-index-rules <items>",
    "忽略的模块入口列表",
    commaSeparatedList
  )
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
    "--ignore-i18n-file-rules-base-root-dir <items>",
    "不匹配含有国际化文本的文件规则，基于rootDir",
    commaSeparatedList
  )
  .option(
    "--i18n-text-rules <items>",
    "国际化文本的正则表达式，正则中第一个捕获对象当做国际化文本",
    commaSeparatedList
  )
  .option(
    "--keep-key-rules <items>",
    "模块的国际化的json文件需要被保留下的key，即使这些组件在项目中没有被引用",
    commaSeparatedList
  )
  .option(
    "--ignore-key-rules <items>",
    "忽略国际化KEY的规则，这些KEY不会生成再国际化文件中",
    commaSeparatedList
  )
  .option("--out-dir <path>", "生成的国际化资源包的输出目录")
  .option(
    "-l, --i18n-languages <items>",
    "需要生成的国际化语言文件，目前支持zh、en多个用逗号分割，默认全部",
    commaSeparatedList
  )
  .option(
    "--config <path>",
    "配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js"
  )
  .option("--disable-config-file", "是否取配置文件")
  .option("-t, --translate", "是否翻译，只翻译每次执行提取到新的key，且满足translateValueRules规则")
  .option("--translate-from-lang", "翻译的基础语言，默认是用中文翻译")
  .option(
    "--force-translate",
    "是否强制翻译，将遍历所有的key，且需满足translateValueRules规则"
  )
  .option("--translate-language <items>", "翻译的语言", commaSeparatedList)
  .option(
    "--translate-use-pin-yin",
    "非中文使用拼音来来翻译"
  )
  .option("--translate-baidu-appid <item>", "Baidu翻译appId")
  .option("--translate-baidu-key <item>", "Baidu翻译key")
  .option(
    "--translate-value-rules <items>",
    "需要翻译的Value的规则，只有value满足此条件才会翻译，如果配置空数组，则表示全部都需要翻译",
    commaSeparatedList
  )
  .option(
    "--translate-ignore-key-rules <items>",
    "忽略翻译KEY的规则，规则可以是一个字符串，正则，或者是函数",
    commaSeparatedList
  )
  .option("--copy-index", "模块下${outDir}/index.js文件不存在才拷贝index.js")
  .option("--force-copy-index", "是否强制拷贝最新index.js")
  .parse(process.argv);
```

### 配置文件指定参数

默认配置文件在${cwd}/vve-i18n-cli.config.js，样例内容如下所示

```javascript
module.exports = {
  outDir: 'lang'
}
```

### 默认值

```javascript
const config = {
  // 工作目录
  cwd: ".",
  // 根目录，国际文本所在的根目录
  rootDir: "src",
  // 默认所有模块，如果有传module参数，就只处理某个模块
  // '**/module-**/**/index.js'
  moduleIndexRules: ["."],
  // 忽略模块
  ignoreModuleIndexRules: [],
  // 匹配含有国际化文本的文件规则
  i18nFileRules: ["**/*.+(vue|js)"],
  // 不匹配含有国际化文本的文件规则
  ignoreI18nFileRules: [],
  // 不匹配含有国际化文本的文件规则，基于rootDir
  ignoreI18nFileRulesBaseRootDir: [],
  // 国际化文本的正则表达式，正则中第一个捕获对象当做国际化文本
  i18nTextRules: [/(?:[\$.])t\([\s\n]*['"](.+?)['"]/g],
  // 模块的国际化的json文件需要被保留下的key，即使这些组件在项目中没有被引用
  // 规则可以是一个字符串，正则，或者是函数
  keepKeyRules: [
    /^G\/+/ // G/开头的会被保留
  ],
  // 忽略国际化KEY的规则
  // 规则可以是一个字符串，正则，或者是函数
  ignoreKeyRules: [
  ],
  // 生成的国际化资源包的输出目录
  outDir: "lang",
  // 生成的国际化的语言
  i18nLanguages: [
    "zh", // 中文
    "en" // 英文
  ],
  // 忽略特定语言国际化的key, 他的格式 { zh: { ignore: true, keepKeyRules: [] } }
  // 根据设置的语言，ignore: true 表示忽略这个语言的所有 值与key相同 的key，不生成在国际化资源文件中，keepKeyRules表示强制保留某些key
  // 因为一般是中文做key，生成的value也是中文，一般这种情况下，key和value是一样的，会增加体积，是用此参数可以减少这种key的生成在资源文件中，减少体积。
  ignoreKeyValueSameKeys: {},
  // 配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js
  config: undefined,
  // 是否取配置文件
  disableConfigFile: false,
  // 是否翻译，只翻译每次执行提取到新的key，且满足translateValueRules规则
  translate: false,
  // 翻译的基础语言，默认是用中文翻译
  translateFromLang: "zh",
  // 是否强制翻译，将遍历所有的key，且需满足translateValueRules规则
  forceTranslate: false,
  // 翻译的语言
  translateLanguage: ["zh", "en"],
  // 非中文使用拼音来来翻译
  translateUsePinYin: false,
  // Baidu翻译appId
  translateBaiduAppid: '',
  // Baidu翻译key
  translateBaiduKey: '',
  // 需要翻译的Value的规则，只有value满足此条件才会翻译，如果配置空数组，则表示全部都需要翻译
  translateValueRules: [
    /[^\x00-\xff]+/ // 中文
  ],
  // 忽略翻译KEY的规则，规则可以是一个字符串，正则，或者是函数
  translateIgnoreKeyRules: [],
  // 模块下${outDir}/index.js文件不存在才拷贝index.js
  copyIndex: false,
  // 是否强制拷贝最新index.js
  forceCopyIndex: false
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
