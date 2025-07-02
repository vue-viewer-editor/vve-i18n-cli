'use strict';

const shelljs = require('shelljs')
const expect = require('chai').expect
const path = require('path')
const fs = require('fs')

describe('i18n-zh-find-untrans', function () {
  this.timeout(50 * 1000)

  it ('trans-restore-cli shell', function (done) {
    shelljs.exec(`node ./bin/zh-find-untrans/index.js --cwd ./test/example-find-untrans`, function (code, stdout, stderr) {
      console.log('stdout', stdout)
      if (code !== 0) {
        throw new Error(stderr)
      }
      done()
    })
  })
})
