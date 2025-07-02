module.exports = {
  zhFindUntrans: {
    languages: {
      'en': {
        i18nJsonRules: ["**/*/en.json"],
        untranslatedRules: [
          // { type: 'regex', pattern: /[\u4E00-\u9FFF]/ },
          { type: 'regex', pattern: /[\u4E00-\u9FFF]/ },
        ],
        outputFiles: [
          '未翻译.xlsx',
          'untranslate.json',
        ],
        excelConfig: {
          headerKeyTitle: '中文', // excel key 所在列，覆盖全局的设置
          headerValueTitle: 'English', // excel value 所在列，覆盖全局的设置
          skipHeader: false,
        },
        setValueEmpty: true,
      }
    },
    allLangOutputFiles: [
      '所有未翻译.xlsx',
      '所有未翻译.json',
    ],
    excelConfig: {
      multiSheet: true,
    },
  },
}
