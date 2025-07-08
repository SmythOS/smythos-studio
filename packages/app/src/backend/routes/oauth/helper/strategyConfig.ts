import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as OAuth1Strategy } from 'passport-oauth1';

class CustomOAuth2Strategy extends OAuth2Strategy {
  authorizationParams(options) {
    const params = super.authorizationParams(options);
    // Inject additional parameters here
    params.access_type = 'offline';
    params.prompt = 'consent';
    return params;
  }
}
class CustomOAuth1Strategy extends OAuth1Strategy {
  // Override the userAuthorizationParams method to include additional parameters
  userAuthorizationParams(options) {
    const params = super.userAuthorizationParams(options) || {};
    // Add 'perms' parameter for Flickr API access level
    params.perms = 'delete'; // Or 'read' or 'write' depending on the required permissions
    return params;
  }
}

export const strategyConfig = {
  oauth2: {
    Strategy: CustomOAuth2Strategy,
    config: {
      authorizationURL: 'authorizationURL', // OAuth2 authorization endpoint
      tokenURL: 'tokenURL', // OAuth2 token endpoint
      clientID: 'clientID',
      clientSecret: 'clientSecret',
      callbackURL: 'callbackURL',
      scope: [],
      store: true, // to handle state
    },

    processStrategy: (accessToken, refreshToken, params, profile, done) => {
      // OAuth2-specific handling
      //console.log('OAuth2 =>', {accessToken}, {refreshToken}, {profile}, {params});
      done(null, { accessToken, refreshToken, params, profile });
    },
  },
  oauth1: {
    Strategy: CustomOAuth1Strategy,
    config: {
      requestTokenURL: 'requestTokenURL', // OAuth1 request token endpoint
      accessTokenURL: 'accessTokenURL', // OAuth1 access token endpoint
      userAuthorizationURL: 'userAuthorizationURL', // OAuth1 user authorization endpoint
      consumerKey: 'consumerKey',
      consumerSecret: 'consumerSecret',
      callbackURL: 'callbackURL',
      store: true, // to handle state
    },
    processStrategy: (token, tokenSecret, profile, done) => {
      // OAuth1-specific handling
      //console.log('OAuth1 =>', {token}, {tokenSecret}, {profile});
      done(null, { token, tokenSecret, profile });
    },
  },
  // we can add more strategies as needed
};
