const { google, baidu, youdao } = require("translation.js");
const pinyin = require('./pinyin.js')

/**
 * 翻译
 * https://github.com/Selection-Translator/translation.js
 * youdao, baidu, google
 */
function translate(fromLang, lang, word, translateUsePinYin) {
  const from = fromLang === "zh" ? "zh-CN" : fromLang;

  if (translateUsePinYin && from === 'zh-CN') {
    return new Promise(resolve => {
      resolve(pinyin.convert_cc2py_composite(word)[0] || word)
    })
  }
  // 默认使用Baidu
  return baidu
    .translate({
      text: word,
      from,
      to: lang
    })
    .then(result => {
      return result.result[0] || "";
    });
}

exports.translate = translate;

/**
 * 翻译列表
 * 如果其中一个翻译错误，跳过
 * 顺序执行，防止同时开太多进程，程序异常
 */
async function translateArr(fromLang, lang, wordArr, translateUsePinYin) {
  const result = [];
  for (let i = 0; i < wordArr.length; i++) {
    const word = wordArr[i];
    const p = translate(fromLang, lang, word, translateUsePinYin)
      .then(res => {
        console.log(word, "\t" + res);
        result[word] = res;
      })
      .catch(err => {
        console.log(err);
      });
    await p;
  }
  return result;
}

exports.translateArr = translateArr;

// translateArr('zh', 'en', ['您好', '哈哈']).then(res => {
//   console.log(res)
// })
