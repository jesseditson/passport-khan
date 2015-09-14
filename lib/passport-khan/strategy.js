/**
 * Module dependencies.
 */
var util = require('util')
var OAuthStrategy = require('passport-oauth').OAuthStrategy
var InternalOAuthError = require('passport-oauth').InternalOAuthError


/**
 * `Strategy` constructor.
 *
 * The Khan authentication strategy authenticates requests by delegating to
 * Khan Academy using the OAuth protocol.
 *
 * Applications must supply a `verify` callback which accepts a `token`,
 * `tokenSecret` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `consumerKey`     identifies client to Khan Academy
 *   - `consumerSecret`  secret used to establish ownership of the consumer key
 *   - `callbackURL`     URL to which Khan Academy will redirect the user after obtaining authorization
 *
 * Examples:
 *
 *     passport.use(new KhanStrategy({
 *         consumerKey: '123-456-789',
 *         consumerSecret: 'shhh-its-a-secret'
 *         callbackURL: 'https://www.example.net/auth/khan/callback'
 *       },
 *       function(token, tokenSecret, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user)
 *         })
 *       }
 *     ))
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  options = options || {}
  options.requestTokenURL = options.requestTokenURL || 'https://www.khanacademy.org/api/auth2/request_token'
  options.accessTokenURL = options.accessTokenURL || 'https://www.khanacademy.org/api/auth2/access_token'
  options.userAuthorizationURL = options.userAuthorizationURL || 'https://www.khanacademy.org/api/auth2/authorize'
  options.sessionKey = options.sessionKey || 'oauth:khan'

  OAuthStrategy.call(this, options, verify)
  this.name = 'khan'
}

/**
 * Inherit from `OAuthStrategy`.
 */
util.inherits(Strategy, OAuthStrategy)

/**
 * Retrieve user profile from Khan Academy.
 *
 * This function constructs a normalized profile, with the following properties:
 *
 *   - `id`
 *   - `username`
 *   - `displayName`
 *
 * @param {String} token
 * @param {String} tokenSecret
 * @param {Object} params
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function(token, tokenSecret, params, done) {
  this._oauth.get('https://www.khanacademy.org/api/v1/user', token, tokenSecret, function (err, body, res) {
    if (err) { return done(new InternalOAuthError('failed to fetch user profile', err)); }

    try {
      var json = JSON.parse(body)

      var profile = { provider: 'khan' }
      profile.id = json.kaid
      profile.username = json.username
      profile.displayName = json.nickname

      profile._raw = body
      profile._json = json

      done(null, profile)
    } catch(e) {
      done(e)
    }
  })
}


/**
 * Expose `Strategy`.
 */
module.exports = Strategy
