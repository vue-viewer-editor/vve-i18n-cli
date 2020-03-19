// var reg = /(?![{}A-Za-z0-9.]+)([^\x00-\xff]|[A-Za-z0-9. ])+/g
// var str = "{cc}cc您好aa123  "
// var newStr = str.replace(reg, function (match) {
//   if (!match.trim()) return match
//   console.log(match)
//   return `{{$t('${match}')}}`
// })
// console.log(newStr)

// var reg = /\S.+\S/
// var str = '  希望的的田野   '
// var newStr = str.replace(reg, function (match) {
//   console.log(match, match.length)
//   return match
// })
// console.log(newStr)

function testReg (reg, str) {
  console.log(str, reg.test(str))
}

// var reg = /^(?![A-Za-z0-9.]+$)([^\x00-\xff]|[A-Za-z0-9. ])+$/
// testReg(reg, '你好')
// testReg(reg, '你好。.  ')
// testReg(reg, '您好吗1231')
// testReg(reg, '11您好吗1231')
// testReg(reg, 'cc{11您好吗1231')

const i18nWrapPrefixReg = /\$t\s*\(\s*$/

testReg(i18nWrapPrefixReg, '$t(')
testReg(i18nWrapPrefixReg, '$t (  ')
testReg(i18nWrapPrefixReg, '$2t (  ')