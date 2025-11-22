require('dotenv').config();
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const logger = require('./logger');

/**
 * Configure OAuth 2.0 Strategy
 */
const configureOAuth = () => {
  try {
    // Custom OAuth2Strategy for Zoho
    const ZohoStrategy = new OAuth2Strategy(
      {
        authorizationURL: process.env.OAUTH_AUTHORIZATION_URL,
        tokenURL: process.env.OAUTH_TOKEN_URL,
        clientID: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        callbackURL: process.env.OAUTH_CALLBACK_URL,
        scope: ['ZohoCliq.Channels.READ', 'ZohoCliq.Messages.CREATE', 'AaaServer.profile.READ'],
        scopeSeparator: ',',
        state: true,
      },
      async (accessToken, refreshToken, params, profile, done) => {
        try {
          logger.info('OAuth token received', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken 
          });

          // Fetch user info from Zoho
          const userInfoResponse = await axios.get(process.env.OAUTH_USER_INFO_URL, {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          });

          const userInfo = userInfoResponse.data;
          logger.info('User info received', { userInfo });

          // Create user object
          const user = {
            id: userInfo.ZUID || userInfo.id || userInfo.user_id,
            email: userInfo.Email || userInfo.email,
            name: userInfo.Display_Name || userInfo.display_name || userInfo.name,
            firstName: userInfo.First_Name || userInfo.first_name || userInfo.firstName,
            lastName: userInfo.Last_Name || userInfo.last_name || userInfo.lastName,
            accessToken,
            refreshToken,
            provider: 'zoho',
          };

          logger.info('OAuth user authenticated', { userId: user.id, email: user.email });
          return done(null, user);
        } catch (error) {
          logger.error('Error fetching user info:', error.response?.data || error.message);
          return done(error, null);
        }
      }
    );

    // Override token params to use POST body instead of Basic Auth
    ZohoStrategy._oauth2.getOAuthAccessToken = function(code, params, callback) {
      const postData = {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: params.redirect_uri,
        client_id: this._clientId,
        client_secret: this._clientSecret,
      };

      this._request('POST', this._getAccessTokenUrl(), {
        'Content-Type': 'application/x-www-form-urlencoded',
      }, new URLSearchParams(postData).toString(), null, function(error, data) {
        if (error) callback(error);
        else {
          let results;
          try {
            results = JSON.parse(data);
          } catch (e) {
            results = require('querystring').parse(data);
          }
          callback(null, results.access_token, results.refresh_token, results);
        }
      });
    };

    passport.use('oauth2', ZohoStrategy);

    // Serialize user for session
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    // Deserialize user from session
    passport.deserializeUser((user, done) => {
      done(null, user);
    });

    logger.info('✅ OAuth 2.0 configured successfully');
  } catch (error) {
    logger.error('❌ OAuth configuration error:', error);
    throw error;
  }
};

module.exports = { configureOAuth };
