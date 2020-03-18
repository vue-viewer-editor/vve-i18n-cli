// var reg = /(?![{}A-Za-z0-9.]+)([^\x00-\xff]|[A-Za-z0-9. ])+/g
// var str = "{cc}您好aa123  "
// var newStr = str.replace(reg, function (match) {
//   if (!match.trim()) return match
//   console.log(match)
//   return `{{$t('${match}')}}`
// })
// console.log(newStr)

var reg = /\S.+\S/
var str = '  希望的的田野   '
var newStr = str.replace(reg, function (match) {
  console.log(match, match.length)
  return match
})
// console.log(newStr)