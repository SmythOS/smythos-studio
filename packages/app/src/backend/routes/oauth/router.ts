import express from 'express';
import passport from 'passport';
import { dynamicStrategyInitialization } from '../../middlewares/dynamicStrategy.mw';
import { includeTeamDetails } from '../../middlewares/auth.mw';
import { getTeamSettingsObj, saveTeamSettingsObj } from '../../services/team-data.service';
const router = express.Router();
import config from '../../../backend/config';
import { replaceTemplateVariablesOptimized } from './helper/oauthHelper';
import crypto from 'crypto';
import axios from 'axios';

// Websites that don't provide expires_in But estimated times in docs.
const PROVIDER_EXPIRATION_TIMES = {
  'public-api.wordpress.com': {
    expiresInSeconds: 14 * 24 * 60 * 60, // 14 days in seconds
    bufferInSeconds: 60 * 60, // 1 hour buffer
  },
  // Add other providers here with their specific expiration times
  // 'api.example.com': { expiresInSeconds: X, bufferInSeconds: Y }
};

router.post('/checkAuth', includeTeamDetails, async (req, res) => {
  try {
    const existing = await getTeamSettingsObj(req, 'oauth');
    if (existing) {
      const result = await compareOAuthDetails(existing, req);
      // Use res.send() or res.json() to send the result back to the client.
      res.json({ success: result });
    } else {
      // If there are no existing settings, respond accordingly.
      res.status(404).send('No existing OAuth settings found.');
    }
  } catch (error) {
    console.error('Error during comparing oauth values:', error);
    // Send a 500 Internal Server Error response with an error message.
    res.status(500).send('Failed to compare oauth values.');
  }
});

router.post('/init', includeTeamDetails, dynamicStrategyInitialization, async (req, res) => {
  try {
    const {
      service,
      scope,
      clientID,
      clientSecret,
      authorizationURL,
      tokenURL,
      oauth2CallbackURL,
    } = req.body;

    let authUrl = `/oauth/${service}`;

    if (['google', 'linkedin', 'oauth2'].includes(service)) {
      const oauthParams: any = {
        scopes: encodeURIComponent(scope),
        clientID: encodeURIComponent(clientID),
        clientSecret: encodeURIComponent(clientSecret),
        callbackURL: encodeURIComponent(oauth2CallbackURL),
      };

      if (authorizationURL) oauthParams.authorizationURL = encodeURIComponent(authorizationURL);
      if (tokenURL) oauthParams.tokenURL = encodeURIComponent(tokenURL);

      authUrl +=
        '?' +
        Object.entries(oauthParams)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');
    }

    res.json({ authUrl });
  } catch (error) {
    console.error('Error in /init route:', error);
    res.status(500).json({ error: 'Failed to initialize authentication' });
  }
});

router.get('/:provider', async (req, res, next) => {
  try {
    const scopes = req?.session?.scopes?.split(' ') || [];
    const strategyOptions: any = {
      state: { beep: `${crypto.randomUUID()}` },
    };

    // Check if it's Twitter OAuth
    const isTwitter = [
      req.session?.oauth_info?.authorizationURL,
      req.session?.oauth_info?.tokenURL,
    ].some((url) => url?.includes('x.com') || url?.includes('twitter.com'));

    if (isTwitter && req.session.strategyType === 'oauth2') {
      // Generate state for CSRF protection
      const state = crypto.randomBytes(32).toString('base64url');

      // Generate code verifier for PKCE
      const codeVerifier = crypto.randomBytes(32).toString('base64url');

      // Generate code challenge using SHA-256
      const codeChallenge = await crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(codeVerifier))
        .then((buffer) => Buffer.from(buffer).toString('base64url'));

      // Store verifier and state in session for callback validation
      req.session.code_verifier = codeVerifier;
      req.session.oauth_state = state;

      // Construct Twitter-specific OAuth URL
      const twitterAuthUrl = new URL('https://x.com/i/oauth2/authorize');
      const queryParams = new URLSearchParams({
        response_type: 'code',
        client_id: req.session.oauth_info.clientID,
        redirect_uri: req.session.oauth_info.oauth2CallbackURL,
        scope: scopes.join(' '),
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      return res.redirect(`${twitterAuthUrl.toString()}?${queryParams.toString()}`);
    }
    // For other providers, use passport authentication
    else if (req.session.strategyType === 'oauth2') {
      strategyOptions.scope = scopes;
      strategyOptions.accessType = 'offline';
      strategyOptions.prompt = 'consent';
    }

    passport.authenticate(req.session.strategyType, strategyOptions, (err, user, info) => {
      if (err) {
        console.error('Error during authentication:', err);
        return res.status(500).send('Failed to initiate authentication.');
      }
      if (!user) {
        console.error('Authentication failed:', info.message);
        return res.status(401).send('Authentication failed.');
      }
      // Authentication success
      // Handle user as needed
      // For example, redirect or respond with a message
    })(req, res, next);
  } catch (error) {
    console.error('Error during authentication process:', error);
    return res.status(500).send('Failed to initiate authentication.');
  }
});

router.get('/:provider/callback', async (req, res, next) => {
  const { state, code } = req.query;

  // Detect Twitter/X based on the authorization URL in session
  const isTwitterAuth =
    req.session?.oauth_info?.authorizationURL?.includes('x.com') ||
    req.session?.oauth_info?.authorizationURL?.includes('twitter.com');

  // Handle Twitter OAuth2
  if (isTwitterAuth) {
    // Verify state parameter
    if (!state || state !== req.session.oauth_state) {
      console.error('State parameter mismatch or missing');
      return res.status(401).send(`
        <script>
          window.opener.postMessage({
              type: 'error',
              data: { message: 'Invalid state parameter. Possible CSRF attack.' }
          }, '${config.env.UI_SERVER}');
          window.close();
        </script>`);
    }

    // If state is valid, exchange the code for tokens using PKCE
    try {
      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code: code as string,
          grant_type: 'authorization_code',
          client_id: req.session.oauth_info.clientID,
          redirect_uri: req.session.oauth_info.oauth2CallbackURL,
          code_verifier: req.session.code_verifier,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${req.session.oauth_info.clientID}:${req.session.oauth_info.clientSecret}`,
            ).toString('base64')}`,
          },
        },
      );

      // Create user object with token response
      const user = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        params: {
          expires_in: tokenResponse.data.expires_in,
        },
      };

      // Store tokens and complete authentication
      await handleTokenStorage(req.session, user, req);
      handleSuccessfulAuthentication(req.session.strategyType, res);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return res.status(500).send(`
        <script>
          window.opener.postMessage({
              type: 'error',
              data: { message: 'Failed to exchange authorization code for tokens.' }
          }, '${config.env.UI_SERVER}');
          window.close();
        </script>`);
    }
  } else {
    // Existing passport authentication for other providers
    passport.authenticate(req.session.strategyType, async (err: any, user, info) => {
      try {
        if (!req.session || !req.session.strategyType) {
          throw new Error('Session or strategy type is not correctly set.');
        }
        if (err || !user) {
          console.error(
            `Authentication failed for provider ${req.session.strategyType}. Error:`,
            err,
            `Info:`,
            info,
          );

          let errorDescription = 'Authentication failed.'; // Default error message
          let errorCode = 'unknown_error';

          if (err) {
            errorDescription = err.message || errorDescription;
            errorCode = err?.code || info?.message || errorCode;

            // Handling detailed OAuth errors
            if (err.oauthError && typeof err.oauthError.statusCode === 'number') {
              const statusCode = err.oauthError.statusCode;
              errorDescription = mapStatusCodeToMessage(statusCode); // Use the function to map status code to message
              errorCode = `HTTP ${statusCode}`;
            }
          } else if (info && typeof info.message === 'string') {
            // Fallback to using the info message if available
            errorDescription = info.message;
          }

          throw new Error(`${errorDescription} (Error code: ${errorCode})`);
        }

        await handleTokenStorage(req.session, user, req);
        handleSuccessfulAuthentication(req.session.strategyType, res);
      } catch (error) {
        console.error('Error in callback route:', error);
        const errorMessage = `${error.message || 'Unknown error'}.`;
        const errorScript = `
          <script>
            window.opener.postMessage({
                type: 'error',
                data: { message: '${errorMessage.replace(/'/g, "\\'")}' }
            }, '${config.env.UI_SERVER}');
            window.close();
          </script>`;
        res.send(errorScript);
      }
    })(req, res, next);
  }
});

// Helper function for expiration calculation (if needed)
function calculateExpirationTimestamp(expiresInSeconds: number) {
  const currentTime = new Date().getTime();
  return currentTime + expiresInSeconds * 1000;
}
async function handleTokenStorage(session, oauthUser, req) {
  try {
    const { oauth_info, team, strategyType, templateKeys } = session;
    const entryId = `${oauth_info?.oauth_keys_prefix}_TOKENS`;
    const accessToken = req.user.accessToken;

    // Check if it's Twitter OAuth 1.0a
    const isTwitterOAuth1 =
      strategyType === 'oauth' &&
      (oauth_info.accessTokenURL?.includes('twitter.com') ||
        oauth_info.accessTokenURL?.includes('x.com'));

    let tokensData: any = {
      primary: oauthUser?.accessToken || oauthUser?.token,
      secondary: oauthUser?.refreshToken || oauthUser?.tokenSecret,
      type: strategyType,
      // Use accessTokenURL for Twitter OAuth 1.0a, tokenURL for others
      tokenURL: isTwitterOAuth1 ? oauth_info.accessTokenURL : oauth_info.tokenURL,
      ...(strategyType === 'oauth' && !templateKeys.includes('consumerKey')
        ? { consumerKey: oauth_info.consumerKey }
        : {}),
      ...(strategyType === 'oauth' && !templateKeys.includes('consumerSecret')
        ? { consumerSecret: oauth_info.consumerSecret }
        : {}),
      ...(strategyType === 'oauth2' && !templateKeys.includes('clientID')
        ? { clientID: oauth_info.clientID }
        : {}),
      ...(strategyType === 'oauth2' && !templateKeys.includes('clientSecret')
        ? { clientSecret: oauth_info.clientSecret }
        : {}),
    };

    // Set expiration time based on provider
    if (!oauthUser?.params?.expires_in) {
      // Extract domain from authorization URL
      const authUrlDomain = new URL(oauth_info.authorizationURL || oauth_info.userAuthorizationURL)
        .hostname;
      const providerConfig = PROVIDER_EXPIRATION_TIMES[authUrlDomain];

      if (providerConfig) {
        const expirationTime = providerConfig.expiresInSeconds - providerConfig.bufferInSeconds;
        tokensData.expires_in = calculateExpirationTimestamp(expirationTime).toString();
      }
    } else {
      tokensData.expires_in = calculateExpirationTimestamp(oauthUser.params.expires_in).toString();
    }

    const commonData = {
      team: team?.id,
      oauth_info,
    };

    tokensData = { ...tokensData, ...commonData };
    const settingKey = 'oauth';
    await handleOAuthOperation(settingKey, entryId, tokensData, req);
  } catch (error) {
    console.error('Error in handleTokenStorage:', error);
    throw error; // Re-throw the error for higher-level handling
  }
}

async function handleOAuthOperation(settingKey, entryId, data, req) {
  try {
    const existing = await getTeamSettingsObj(req, settingKey);
    console.log(
      existing && existing[entryId]
        ? 'overwriting existing oauth values'
        : 'creating new oauth values',
    );
    await saveTeamSettingsObj({ req, settingKey, entryId, data });
  } catch (error) {
    console.error(`Error handling OAuth operation for ${entryId}:`, error);
    throw error; // Re-throw the error for higher-level handling
  }
}

function handleSuccessfulAuthentication(strategyType, res) {
  try {
    const messageType = strategyType === 'oauth' ? 'oauth' : 'oauth2';
    const messageData = { message: 'Authentication successful' };

    res.send(`<script>
      window.opener.postMessage({
          type: '${messageType}',
          data: ${JSON.stringify(messageData)}
      }, '${config.env.UI_SERVER}');
      window.close();
    </script>`);
  } catch (error) {
    console.error('Error in handleSuccessfulAuthentication:', error);
    throw error; // Re-throw the error for higher-level handling
  }
}

// Modify the existing compareOAuthDetails function to include template variable replacement.
async function compareOAuthDetails(existing, req) {
  // Attempt to replace template variables in requestBody before the comparison.
  const updatedRequestBody = await replaceTemplateVariablesOptimized(req);

  const { oauth_keys_prefix } = updatedRequestBody;
  const entryId = `${oauth_keys_prefix}_TOKENS`;
  // Proceed with the rest of your compareOAuthDetails function.
  const targetObject = existing[entryId];
  let current_oauth_object;

  try {
    current_oauth_object =
      typeof targetObject === 'string' ? JSON?.parse(targetObject) : targetObject;
  } catch (error) {
    console.error('Error parsing target object:', error);
    return false;
  }

  if (!current_oauth_object || typeof current_oauth_object !== 'object') {
    return false;
  }
  for (const [key, value] of Object.entries(updatedRequestBody)) {
    if (current_oauth_object?.oauth_info?.[key] !== value) {
      return false;
    }
  }

  if ('primary' in current_oauth_object && current_oauth_object['primary'] === '') {
    return false; // The property exists and is an empty string
  } else if (current_oauth_object['primary']) {
    return true; // The property exists and has a truthy value (not empty, not null, etc.)
  }

  return true;
}

router.post('/signOut', includeTeamDetails, async (req, res) => {
  try {
    const { invalidateAuthentication, oauth_keys_prefix: entryId } = req.body;
    const settings = await getTeamSettingsObj(req, 'oauth');

    // Parse existing if it's a string
    let existing = settings[entryId];
    try {
      existing = typeof existing === 'string' ? JSON?.parse(existing) : existing;
    } catch (error) {
      console.error('Error parsing existing settings:', error);
      return res.status(500).json({ error: 'Invalid settings format' });
    }

    if (!settings || !existing) {
      return res.status(404).json({ error: 'No existing OAuth settings found.' });
    }

    if (invalidateAuthentication !== true) {
      return res
        .status(400)
        .json({ error: 'Invalid request. Missing or invalid "invalidateAuthentication" flag.' });
    }
    // Clear properties if they exist
    for (let prop of ['primary', 'secondary']) {
      if (prop in existing && existing[prop] === '') {
        return res.json({ invalidate: true, message: '' }); // send empty message with true, and stop if the property exists and is an empty string
      } else if (prop in existing) {
        existing[prop] = ''; // Set the property to an empty string if it exists and is not already empty
      }
    }
    // Save the updated settings
    const saveResult = await saveTeamSettingsObj({
      req,
      settingKey: 'oauth',
      entryId,
      data: existing,
    });
    // Check the result of saveTeamSettingsObj
    if (!saveResult.success) {
      // Handle failure according to your application's needs
      console.error('Failed to save team settings:', saveResult.error);
      return res.status(500).json({ error: saveResult.error || 'Failed to process Sign out.' });
    }
    return res.json({ invalidate: true, message: 'Signed out successfully.' });
  } catch (error) {
    console.error('Error during sign out:', error);
    return res.status(500).json({ error: 'Failed to process Sign out. ' + error.message });
  }
});

// This function maps HTTP status codes to user-friendly error messages
function mapStatusCodeToMessage(statusCode) {
  switch (statusCode) {
    case 400:
      return 'Bad Request. Please verify your request and try again.';
    case 401:
      return 'Unauthorized. Please ensure you are logged in and have the necessary permissions.';
    case 403:
      return 'Forbidden. Access is denied.';
    case 404:
      return 'Not Found. The requested resource was not found.';
    case 500:
      return 'Internal Server Error. Something went wrong on our end.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

async function getClientCredentialToken({ clientID, clientSecret, tokenURL }) {
  try {
    // Sanity checks
    if (!clientID || !clientSecret || !tokenURL) {
      throw new Error('Missing required parameters for getClientCredentialToken function');
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientID,
      client_secret: clientSecret,
    });

    const response = await axios.post(tokenURL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, expires_in } = response.data;
    return {
      accessToken: access_token,
      params: { expires_in },
    };
  } catch (error) {
    throw new Error(`Failed to get token: ${error.response?.statusText || error.message}`);
  }
}
router.post('/client_credentials', includeTeamDetails, async (req, res) => {
  try {
    const updatedRequestBody = await replaceTemplateVariablesOptimized(req);

    // Sanity check for updatedRequestBody
    if (!updatedRequestBody) {
      throw new Error('Updated request body is empty');
    }

    const oauthUser = await getClientCredentialToken(updatedRequestBody);

    // Further sanity check for the response from getClientCredentialToken
    if (!oauthUser || !oauthUser.accessToken) {
      throw new Error('OAuth token retrieval failed');
    }

    Object.assign(req.session, {
      strategyType: 'oauth2',
      oauth_info: updatedRequestBody,
      team: req._team, // Ensure req._team is populated by includeTeamDetails middleware
    });

    await handleTokenStorage(req.session, oauthUser, req);

    res.json({ success: true, message: 'OAuth2 Authentication was successful' });
  } catch (error) {
    console.error('Error in client_credentials route:', error);
    res.status(500).json({
      success: false,
      message: `OAuth2 Authentication was unsuccessful: ${error.message}`,
    });
  }
});

export default router;
