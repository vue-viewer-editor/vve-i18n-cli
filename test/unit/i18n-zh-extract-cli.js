'use strict';

const shelljs = require('shelljs')
const expect = require('chai').expect
const path = require('path')
const fs = require('fs')

describe('i18n-zh-extract-cli', function () {
  this.timeout(50 * 1000)

  it ('zh-extract-cli shell', function (done) {
    shelljs.exec(`node ./bin/zh-extract/index.js --cwd ./test/example-extract`, function (code, stdout, stderr) {
      console.log('stdout', stdout)
      if (code !== 0) {
        throw new Error(stderr)
      }
      expect(stdout.indexOf("测试文字") !== -1).to.equal(true)
      done()
    })
  })
})
