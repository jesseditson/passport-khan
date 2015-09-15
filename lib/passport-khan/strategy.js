/**
 * Module dependencies.
 */
var Khan = require('khan')
var passport = require('passport-strategy')
var utils = require('./utils')
var url = require('url')

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

  if (!verify) { throw new TypeError('OAuthStrategy requires a verify callback'); }

  options = options || {}
  options.requestTokenURL = options.requestTokenURL || 'https://www.khanacademy.org/api/auth2/request_token'
  options.accessTokenURL = options.accessTokenURL || 'https://www.khanacademy.org/api/auth2/access_token'
  options.userAuthorizationURL = options.userAuthorizationURL || 'https://www.khanacademy.org/api/auth2/authorize'
  options.sessionKey = options.sessionKey || 'oauth:khan'
  if (!options.consumerKey) { throw new TypeError('KhanStrategy requires a consumerKey option'); }
  if (options.consumerSecret === undefined) { throw new TypeError('KhanStrategy requires a consumerSecret option'); }

  passport.Strategy.call(this)

  this._verify = verify
  this.name = 'khan'

  this.khan = Khan(options.consumerKey, options.consumerSecret)

  this._userAuthorizationURL = options.userAuthorizationURL
  this._callbackURL = options.callbackURL
  this._key = options.sessionKey
  this._trustProxy = options.proxy
  this._passReqToCallback = options.passReqToCallback
}

Strategy.prototype.authenticate = function(req, options) {
  options = options || {};
  if (!req.session) { return this.error(new Error('KhanStrategy requires session support. Did you forget app.use(express.session(...))?')); }

  var self = this;

  if (req.query && req.query.oauth_token) {
    // The request being authenticated contains an oauth_token parameter in the
    // query portion of the URL.  This indicates that the service provider has
    // redirected the user back to the application, after authenticating the
    // user and obtaining their authorization.
    //
    // The value of the oauth_token parameter is the request token.  Together
    // with knowledge of the token secret (stored in the session), the request
    // token can be exchanged for an access token and token secret.
    //
    // This access token and token secret, along with the optional ability to
    // fetch profile information from the service provider, is sufficient to
    // establish the identity of the user.

    // Bail if the session does not contain the request token and corresponding
    // secret.  If this happens, it is most likely caused by initiating OAuth
    // from a different host than that of the callback endpoint (for example:
    // initiating from 127.0.0.1 but handling callbacks at localhost).
    if (!req.session[self._key]) { return self.error(new Error('Failed to find request token in session')) }

    var oauthToken = req.query.oauth_token
    var oauthVerifier = req.query.oauth_verifier
    var oauthTokenSecret = req.session[self._key].oauth_token_secret

    this.khan.accessToken(oauthToken, oauthVerifier, oauthTokenSecret)
      .catch(function(err) {
        return self.error(new Error(err.response.text))
      })
      .then(function(res) {
        // The request token has been exchanged for an access token.  Since the
        // request token is a single-use token, that data can be removed from the
        // session.
        delete req.session[self._key].oauth_token
        delete req.session[self._key].oauth_token_secret
        if (Object.keys(req.session[self._key]).length === 0) {
          delete req.session[self._key]
        }

        if (!res) return
        var token = res.oauth_token
        var tokenSecret = res.oauth_token_secret

        self.userProfile(token, tokenSecret, {}, function(err, profile) {
          if (err) { return self.error(err) }

          function verified(err, user, info) {
            if (err) { return self.error(err) }
            if (!user) { return self.fail(info) }
            self.success(user, info);
          }

          try {
            if (self._passReqToCallback) {
              var arity = self._verify.length
              if (arity == 6) {
                self._verify(req, token, tokenSecret, params, profile, verified)
              } else { // arity == 5
                self._verify(req, token, tokenSecret, profile, verified)
              }
            } else {
              var arity = self._verify.length
              if (arity == 5) {
                self._verify(token, tokenSecret, params, profile, verified)
              } else { // arity == 4
                self._verify(token, tokenSecret, profile, verified)
              }
            }
          } catch (ex) {
            return self.error(ex)
          }
        })
      })
  } else {
    // In order to authenticate via OAuth, the application must obtain a request
    // token from the service provider and redirect the user to the service
    // provider to obtain their authorization.  After authorization has been
    // approved the user will be redirected back the application, at which point
    // the application can exchange the request token for an access token.
    //
    // In order to successfully exchange the request token, its corresponding
    // token secret needs to be known.  The token secret will be temporarily
    // stored in the session, so that it can be retrieved upon the user being
    // redirected back to the application.

    var callbackURL = options.callbackURL || this._callbackURL
    if (callbackURL) {
      var parsed = url.parse(callbackURL)
      if (!parsed.protocol) {
        // The callback URL is relative, resolve a fully qualified URL from the
        // URL of the originating request.
        callbackURL = url.resolve(utils.originalURL(req, { proxy: this._trustProxy }), callbackURL)
      }
    }

    this.khan.requestToken(callbackURL)
      .catch(function(err) {
        self.error(new Error(err.response.text))
      })
      .then(function(res) {
        if (!res) return
        var token = res.oauth_token
        var tokenSecret = res.oauth_token_secret
        if (!req.session[self._key]) { req.session[self._key] = {} }
        req.session[self._key].oauth_token = token
        req.session[self._key].oauth_token_secret = tokenSecret

        var parsed = url.parse(self._userAuthorizationURL, true)
        parsed.query.oauth_token = token
        utils.merge(parsed.query, options)
        delete parsed.search

        var location = url.format(parsed)
        self.redirect(location)
      })
  }
}

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
  this.khan(tokenSecret, token)
    .user()
    .catch(function(res) {
      done(new Error('failed to fetch user profile:' + res.response.text))
    })
    .then(function(json, body) {
      if (!json) return

      var profile = { provider: 'khan' }
      profile.id = json.kaid
      profile.username = json.username
      profile.displayName = json.nickname

      profile._raw = body
      profile._json = json

      done(null, profile)
    })
}


/**
 * Expose `Strategy`.
 */
module.exports = Strategy
