'use strict';

const shelljs = require('shelljs')
const expect = require('chai').expect
const path = require('path')
const jsonfile = require("jsonfile");

describe('i18n-zh-wrap-cli', function () {
  this.timeout(20 * 1000)

  it ('zh-wrap-cli shell', function (done) {
    shelljs.exec(`node ./bin/zh-wrap/index.js --cwd ./test/example-wrap`, function (code, stdout, stderr) {
      if (code !== 0) {
        throw new Error(stderr)
      }
      const fileContent = jsonfile.readFileSync('./test/example-wrap/src/index.vue');

      expect(fileContent.indexOf('<p>{{$t('测试文字')}}</p>') !== -1).to.equal(true)
      done()
    })
  })
})
