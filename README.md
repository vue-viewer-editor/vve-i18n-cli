# vve-i18n-cli

抽取国际化文本，生成国际化资源文件

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
    "--i18n-file-rules <items>",
    "匹配含有国际化文本的文件规则",
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
  .option("--no-config", "是否取配置文件")
  .option("-t, --translate", "是否翻译")
  .option("--translate-from-lang", "翻译的基础语言，默认是用中文翻译")
  .option(
    "--force-translate",
    "是否强制翻译，即已翻译修改的内容，也重新用翻译生成"
  )
  .option("--translate-language <items>", "翻译的语言", commaSeparatedList)
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
  // 匹配含有国际化文本的文件规则
  i18nFileRules: ["**/*.+(vue|js)"],
  // 国际化文本的正则表达式，正则中第一个捕获对象当做国际化文本
  i18nTextRules: [/(?:[\$.])t\(['"](.+?)['"]/g],
  // 模块的国际化的json文件需要被保留下的key，即使这些组件在项目中没有被引用
  // key可以是一个字符串，正则，或者是函数
  keepKeyRules: [
    /^G\/+/ // G/开头的会被保留
  ],
  // 生成的国际化资源包的输出目录
  outDir: "lang",
  // 生成的国际化的语言
  i18nLanguages: [
    "zh", // 中文
    "en" // 英文
  ],
  // 配置文件的路径，没有配置，默认路径是在${cwd}/vve-i18n-cli.config.js
  config: undefined,
  // 是否取配置文件
  noConfig: false,
  // 是否翻译
  translate: false,
  // 翻译的基础语言，默认是用中文翻译
  translateFromLang: "zh",
  // 是否强制翻译，即已翻译修改的内容，也重新用翻译生成
  forceTranslate: false,
  // 翻译的语言
  translateLanguage: ["zh", "en"],
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
npm release // 发布
git push --follow-tags origin master && npm publish // npm 发布
```
