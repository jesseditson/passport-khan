var vows = require('vows')
var assert = require('assert')
var util = require('util')
var khan = require('../lib/passport-khan')


vows.describe('passport-khan').addBatch({

  'module': {
    'should report a version': function (x) {
      assert.isString(khan.version)
    },
  },

}).export(module)
