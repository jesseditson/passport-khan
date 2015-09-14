# Passport-Khan

[Passport](https://github.com/jaredhanson/passport) strategy for authenticating
with [Khan Academy](http://khanacademy.org/) using the OAuth 1.0a API.

This module lets you authenticate using Khan Academy in your Node.js applications.
By plugging into Passport, Khan Academy authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Install

    $ npm install passport-khan

## Usage

#### Configure Strategy

The Khan Academy authentication strategy authenticates users using a Khan Academy account and
OAuth tokens.  The strategy requires a `verify` callback, which accepts these
credentials and calls `done` providing a user, as well as `options` specifying a
consumer key, consumer secret, and callback URL.

    passport.use(new KhanStrategy({
        consumerKey: KHAN_CONSUMER_KEY,
        consumerSecret: KHAN_CONSUMER_SECRET,
        callbackURL: "http://127.0.0.1:3000/auth/khan/callback"
      },
      function(token, tokenSecret, profile, done) {
        User.findOrCreate({ kaid: profile.id }, function (err, user) {
          return done(err, user);
        });
      }
    ));

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'khan'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

    app.get('/auth/khan',
      passport.authenticate('khan'));

    app.get('/auth/khan/callback',
      passport.authenticate('khan', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
      });

## Examples

For a complete, working example, refer to the [login example](https://github.com/jesseditson/passport-khan/tree/master/examples/login).

## Tests

    $ npm install --dev
    $ make test

[![Build Status](https://secure.travis-ci.org/jesseditson/passport-khan.png)](http://travis-ci.org/jesseditson/passport-khan)

## Credits

  - [Jesse Ditson](http://github.com/jesseditson)

Shamelessly copied from the [passport-vimeo repo](http://github.com/jaredhanson/passport-vimeo) by [Jared Hanson](http://github.com/jaredhanson)

## License

[The MIT License](http://opensource.org/licenses/MIT)
