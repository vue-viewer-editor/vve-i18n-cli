'use strict';

const shelljs = require('shelljs')
const expect = require('chai').expect
const path = require('path')
const jsonfile = require("jsonfile");

describe('i18n-cli', function () {
  this.timeout(50 * 1000)

  it ('should be a function', function (done) {
    shelljs.exec(`node ./bin/index.js --cwd ./test/example`, function (code, stdout, stderr) {
      if (code !== 0) {
        throw new Error(stderr)
      }
      const i18nData = jsonfile.readFileSync('./test/example/src/lang/zh.json');
      expect(JSON.stringify(i18nData)).to.equal(JSON.stringify({
        '世界': '世界',
        '你好': '你好',
      }))
      done()
    })
  })
})
