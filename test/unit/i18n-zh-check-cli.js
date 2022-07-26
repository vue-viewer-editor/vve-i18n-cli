'use strict';

const shelljs = require('shelljs')
const expect = require('chai').expect
const path = require('path')
const fs = require('fs')

describe('i18n-zh-check-cli', function () {
  this.timeout(50 * 1000)

  it ('zh-check-cli shell', function (done) {
    shelljs.exec(`node ./bin/zh-check/index.js --cwd ./test/example-check`, function (code, stdout, stderr) {
      console.log('stdout', stdout)
      if (code !== 0) {
        throw new Error(stderr)
      }
      expect(stdout.indexOf("script-pre") !== -1).to.equal(true)
      expect(stdout.indexOf("props") !== -1).to.equal(true)
      expect(stdout.indexOf("back-quote") !== -1).to.equal(true)
      expect(stdout.indexOf("validator") !== -1).to.equal(true)
      done()
    })
  })
})
