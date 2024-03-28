const { google, baidu, youdao } = require("translation.js");
const pinyin = require('./pinyin.js')
const baiduTranslateService = require("vve-baidu-translate-service").default;

/**
 * 翻译
 * https://github.com/Selection-Translator/translation.js
 * youdao, baidu, google
 */
function translate(
  fromLang,
  lang,
  word,
  translateUsePinYin,
  translateBaiduAppid,
  translateBaiduKey
) {
  const from = fromLang === "zh" ? "zh-CN" : fromLang;

  if (translateUsePinYin && from === 'zh-CN') {
    return new Promise(resolve => {
      resolve(pinyin.convert_cc2py_composite(word)[0] || word)
    })
  }

  if (translateBaiduAppid && translateBaiduKey) {
    return baiduTranslateService({
      appid: translateBaiduAppid,
      key: translateBaiduKey,
      from: fromLang,
      to: lang,
      q: word,
    }).then(result => {
      if (result && result.error_code) {
        throw new Error(result)
      }
      return (result && result.trans_result && result.trans_result[0] && result.trans_result[0].dst) || ''
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
async function translateArr(
  fromLang,
  lang,
  wordArr,
  translateUsePinYin,
  translateBaiduAppid,
  translateBaiduKey
) {
  const result = [];
  for (let i = 0; i < wordArr.length; i++) {
    const word = wordArr[i];
    const p = translate(fromLang, lang, word, translateUsePinYin, translateBaiduAppid, translateBaiduKey)
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

// translateArr('zh', 'en', ['您好', '哈哈', '！', '。', '《', '》'], false, '20230615001713872', 'YFcNbyTbyfYi2SpL5PEQ').then(res => {
//   console.log(res)
// })
