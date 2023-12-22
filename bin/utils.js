"use strict";
const path = require("path");
const fs = require("fs");

// 判断文件是否存在
function fsExistsSync(path) {
  try {
    fs.accessSync(path, fs.F_OK);
  } catch (e) {
    return false;
  }
  return true;
}

exports.fsExistsSync = fsExistsSync;

// 拷贝文件
function copyFile(src, dist) {
  fs.writeFileSync(dist, fs.readFileSync(src));
}

exports.copyFile = copyFile;

// 过滤出满足规则的key，规则可以是一个字符串，正则或者函数
function filterObjByKeyRules(obj = {}, keyRules = []) {
  const newObj = {};
  if (keyRules.length === 0) {
    return newObj;
  }
  const keys = Object.keys(obj);
  keys.forEach(key => {
    for (let i = 0; i < keyRules.length; i++) {
      const keyRole = keyRules[i];
      if (
        (Object.prototype.toString.call(keyRole) === "[object RegExp]" &&
          keyRole.test(key)) ||
        (Object.prototype.toString.call(keyRole) === "[object Function]" &&
          keyRole(key)) ||
        keyRole === key
      ) {
        newObj[key] = obj[key];
        break;
      }
    }
  });
  return newObj;
}

exports.filterObjByKeyRules = filterObjByKeyRules;


// 判定一个KEY是否满足规则，满足一个则为true
// 规则可以是一个字符串，正则或者函数
function testRules(key, keyRules = []) {
  return keyRules.some(keyRole => {
    if (Object.prototype.toString.call(keyRole) === "[object RegExp]") {
      return keyRole.test(key)
    }
    if (Object.prototype.toString.call(keyRole) === "[object Function]") {
      return keyRole(key)
    }
    return keyRole === key
  })
}

exports.testRules = testRules;

// 计算一个文本所在的行和列
function calculatePosition(text, index) {
  // 将文本拆分为行
  const lines = text.split('\n');

  let currentLine = 0;
  let currentColumn = 0;

  // 遍历每一行，查找目标字符索引所在的行和列
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLength = line.length;

    // 如果目标索引小于当前行的长度，则目标索引在当前行
    if (index <= lineLength) {
      currentLine = i + 1; // 行数从1开始计数
      currentColumn = index + 1; // 列数从1开始计数
      break;
    }

    // 目标索引大于当前行的长度，则将目标索引减去当前行长度，并继续查找下一行
    index -= lineLength + 1; // 加1是因为行末有一个换行符
  }

  return {
    row: currentLine,
    col: currentColumn
  };
}

exports.calculatePosition = calculatePosition;
