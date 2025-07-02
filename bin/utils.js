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

// 实现一个深度拷贝的功能
function deepCopy(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  let copy;
  if (obj instanceof Array) {
    copy = [];
    for (let i = 0; i < obj.length; i++) {
      copy[i] = deepCopy(obj[i]);
    }
    return copy;
  } else if (obj instanceof Date) {
    return new Date(obj.getTime());
  } else if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags);
  } else {
    copy = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        copy[key] = deepCopy(obj[key]);
      }
    }
    return copy;
  }
}

exports.deepCopy = deepCopy;

// 实现一个深度合并的功能
function deepMerge(...objects) {
  // 使用 WeakMap 跟踪已合并对象，解决循环引用
  const mergedObjects = new WeakMap();

  function merge(target, source) {
    // 基础类型直接返回源值
    if (source === null || typeof source !== 'object') {
      return source;
    }

    // 处理循环引用
    if (mergedObjects.has(source)) {
      return mergedObjects.get(source);
    }

    // 处理数组
    if (Array.isArray(source)) {
      const newArray = Array.isArray(target) ? [...target] : [];
      source.forEach((item, index) => {
        newArray[index] = merge(newArray[index], item);
      });
      mergedObjects.set(source, newArray);
      return newArray;
    }

    // 处理日期
    if (source instanceof Date) {
      return new Date(source);
    }

    // 处理正则
    if (source instanceof RegExp) {
      return new RegExp(source.source, source.flags);
    }

    // 创建新对象，避免原型污染
    const newObj = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
    mergedObjects.set(source, newObj);

    // 遍历源对象键（过滤原型属性）
    Object.keys(source).forEach(key => {
      // 跳过原型属性
      if (key === '__proto__') return;
      newObj[key] = merge(newObj[key], source[key]);
    });

    return newObj;
  }

  // 处理初始值为非对象的情况
  return objects.reduce((acc, obj) => merge(acc, obj), objects[0] ?? {});
}

exports.deepMerge = deepMerge;
