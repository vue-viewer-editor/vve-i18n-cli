module.exports = {
  transRestore: {
    languages: {
      'en': {
        translationFiles: ['translate.xlsx'],
        i18nJsonRules: ["**/*/en.json"],
      }
    },
    excelConfig: {
      excelStartRow: 1
    }
  }
}
