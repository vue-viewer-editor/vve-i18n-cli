// const reg = /\/\/.*vve-i18n-zh-check-disabled-line.*$/
const reg = /\/\/(\s*|.*\s+)vve-i18n-zh-check-disabled-line(\s*$|\s+.*)/

// console.log(reg.test('aaa// vve-i18n-zh-check-disabled-line fd'))
// console.log(reg.test('dd // fd vve-i18n-zh-check-disabled-line fdf'))
// console.log(reg.test('// fd vve-i18n-zh-check-disabled-line fdf'))
// console.log(reg.test('// fd vve-i18n-zh-check-disabled-line fd'))
// console.log(reg.test('// fd vve-i18n-zh-check-disabled-line fdf'))
// console.log(reg.test('//vve-i18n-zh-check-disabled-line vve-i18n-zh-wrap-disabled-line'))
// console.log(reg.test('// vve-i18n-zh-check-disabled-line vve-i18n-zh-wrap-disabled-line'))
// console.log(reg.test('// vve-i18n-zh-check-disabled-line'))

// console.log(reg.test('//3ve-i18n-zh-check-disabled-line111'))
// console.log(reg.test('//vve-i18n-zh-check-disabled-line3'))
// console.log(reg.test('//22vve-i18n-zh-check-disabled-line111'))


var str = `
3123
fsfsffsd // vve-i18n-zh-check-disabled-line fd
3123
当前行被禁用 321// vve-i18n-zh-check-disabled-line fd
afsdafsadf

// vve-i18n-zh-check-disabled-next-line
fdsf
sdddddd
fsf // vve-i18n-zh-check-disabled-next-line 23123
这一行被禁用
fdsaf
fdsf
*

/* vve-i18n-zh-check-disable */13123

alert('这里被禁用)

/* vve-i18n-zh-check-enable */

/* vve-i18n-zh-check-disable */13123

alert('这里被禁用2324)

/* vve-i18n-zh-check-enable */


/* vve-i18n-zh-check-disable */

alert('这里被禁用2324)
`

var strOrigin = str

const disableTextArr = []

var disableRules = [
  // 单行禁用，使用：在当前行添加 // vve-i18n-zh-check-disabled-line
  /(.*\/\/(?:\s*|.*\s+)vve-i18n-zh-check-disabled-line(?:\s*$|\s+.*))/g,
  // 下一行禁用，使用：在上一行添加 // vve-i18n-zh-check-disabled-next-line
  /\/\/(?:\s*|.*\s+)vve-i18n-zh-check-disabled-next-line(?:\s*|\s+.*)\n(.+)/g,
  // 代码块禁用，使用：在需要的地方包括/* vve-i18n-zh-check-disable */ /* vve-i18n-zh-check-enable */
  /\/\*\s*vve-i18n-zh-check-disable\s*\*\/([\s\S]*?)(?:(?:\/\*\s*vve-i18n-zh-check-enable\s*\*\/)|$)/g
]

function replaceWithPlaceholderByRule (str, rule) {
  str = str.replace(rule, function(match, key, index) {
    const count = disableTextArr.length;
    disableTextArr.push(key);
    return match.replace(key, `@@@@@@disableText_${count}@@@@@@`);
  });
  return str
}

function replaceWithPlaceholder (str, disableRules) {
  for (let i = 0; i < disableRules.length; i++) {
    str = replaceWithPlaceholderByRule(str, disableRules[i])
  }
  return str
}

function placeholderRestore (str) {
  str = str.replace(/(@@@@@@disableText_(\d+)@@@@@@)/g, function(match, key, key2, index) {
    return disableTextArr[key2]
  });
  return str
}

strTest = placeholderRestore(replaceWithPlaceholder(strOrigin, disableRules))

console.log(strOrigin === strTest)



