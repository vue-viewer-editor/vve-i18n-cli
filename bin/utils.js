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
