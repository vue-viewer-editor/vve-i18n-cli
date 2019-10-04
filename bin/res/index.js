const camelizeRE = /[-_](\w)/g;
function camelize(str) {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""));
}

module.exports = function makeIndex(langArr = []) {
  const importArr = langArr.map((lang, index) => {
    return `import ${camelize(lang)} from './${lang}.json'`;
  });

  const exportArr = langArr.map((lang, index) => {
    const cLang = camelize(lang);
    const langItem = cLang === lang ? `  ${lang}` : `  '${lang}': ${cLang}`;
    return langItem;
  });

  return `${importArr.join("\n")}${
    importArr.length ? "\n\n" : ""
  }export default {${exportArr.length ? "\n" : ""}${exportArr.join(",\n")}${
    exportArr.length ? "\n" : ""
  }}\n`;
};
