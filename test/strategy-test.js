var vows = require('vows')
var assert = require('assert')
var util = require('util')
var KhanStrategy = require('../lib/passport-khan').Strategy
var userInfo = require('./fixtures/user-body')

vows.describe('KhanStrategy').addBatch({

  'strategy': {
    topic: function() {
      return new KhanStrategy({
        consumerKey: 'ABC123',
        consumerSecret: 'secret'
      },
      function() {})
    },

    'should be named khan': function (strategy) {
      assert.equal(strategy.name, 'khan')
    },
  },

  'strategy when loading user profile': {
    topic: function() {
      var strategy = new KhanStrategy({
        consumerKey: 'ABC123',
        consumerSecret: 'secret'
      },
      function() {})

      // mock
      strategy._oauth.get = function(url, token, tokenSecret, callback) {
        var body = JSON.stringify(userInfo)

        callback(null, body, undefined)
      }

      return strategy
    },

    'when told to load user profile': {
      topic: function(strategy) {
        var self = this
        function done(err, profile) {
          self.callback(err, profile)
        }

        process.nextTick(function () {
          strategy.userProfile('token', 'token-secret', {}, done)
        })
      },

      'should not error' : function(err, req) {
        assert.isNull(err)
      },
      'should load profile' : function(err, profile) {
        assert.equal(profile.provider, 'khan')
        assert.equal(profile.id, userInfo.kaid)
        assert.equal(profile.username, 'jesseditson')
        assert.equal(profile.displayName, 'Jesse Ditson')
      },
      'should set raw property' : function(err, profile) {
        assert.isString(profile._raw)
      },
      'should set json property' : function(err, profile) {
        assert.isObject(profile._json)
      },
    },
  },

  'strategy when loading user profile and encountering an error': {
    topic: function() {
      var strategy = new KhanStrategy({
        consumerKey: 'ABC123',
        consumerSecret: 'secret'
      },
      function() {})

      // mock
      strategy._oauth.get = function(url, token, tokenSecret, callback) {
        callback(new Error('something went wrong'))
      }

      return strategy
    },

    'when told to load user profile': {
      topic: function(strategy) {
        var self = this
        function done(err, profile) {
          self.callback(err, profile)
        }

        process.nextTick(function () {
          strategy.userProfile('token', 'token-secret', {}, done)
        })
      },

      'should error' : function(err, req) {
        assert.isNotNull(err)
      },
      'should wrap error in InternalOAuthError' : function(err, req) {
        assert.equal(err.constructor.name, 'InternalOAuthError')
      },
      'should not load profile' : function(err, profile) {
        assert.isUndefined(profile)
      },
    },
  },

}).export(module)
