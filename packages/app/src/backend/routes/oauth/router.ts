import { OAuthServicesRegistry } from '@src/shared/helpers/oauth/oauth-services.helper';
import { mapStatusCodeToMessage } from '@src/shared/helpers/oauth/oauth.utils';
import axios from 'axios';
import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { includeTeamDetails } from '../../middlewares/auth.mw';
import { oauthStrategyInitialization } from '../../middlewares/oauthStrategy.mw';
import { getTeamSettingsObj, saveTeamSettingsObj } from '../../services/team-data.service';
import { replaceTemplateVariablesOptimized } from './helper/oauthHelper';
const router = express.Router();

// Rate limiting for OAuth initialization
const oauthInitLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 OAuth init requests per windowMs
  message: { error: 'Too many OAuth initialization attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for trusted IPs (optional)
  skip: (req) => {
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    return trustedIPs.includes(req.ip);
  },
});

// Websites that don't provide expires_in But estimated times in docs.
//TODO : this need to be configured in oauth services json file
const PROVIDER_EXPIRATION_TIMES = {
  'public-api.wordpress.com': {
    expiresInSeconds: 14 * 24 * 60 * 60, // 14 days in seconds
    bufferInSeconds: 60 * 60, // 1 hour buffer
  },
  // Add other providers here with their specific expiration times
  // 'api.example.com': { expiresInSeconds: X, bufferInSeconds: Y }
};

/**
 * Returns the provider configuration object to compare against request body.
 * Supports both legacy (settings.oauth_info) and new flat settings structures.
 */
function getConfigForCompare(settings: any) {
  return settings?.oauth_info && typeof settings.oauth_info === 'object'
    ? settings.oauth_info
    : settings;
}

/**
 * Returns true if a valid primary token exists either in auth_data (new) or
 * mis-saved on settings (legacy/top-level).
 */
function hasPrimaryToken(authData: any, settings: any): boolean {
  if (authData && typeof authData.primary === 'string' && authData.primary !== '') return true;
  if (settings && typeof settings.primary === 'string' && settings.primary !== '') return true;
  return false;
}

/**
 * Flattens legacy settings.oauth_info into auth_settings (new shape), removes disallowed keys.
 */
function normalizeAuthSettings(mergedSettings: any): any {
  if (!mergedSettings || typeof mergedSettings !== 'object') return mergedSettings;

  // Do not persist disallowed fields
  if (mergedSettings.team) delete mergedSettings.team;

  // Flatten oauth_info if present
  if (mergedSettings.oauth_info && typeof mergedSettings.oauth_info === 'object') {
    const legacyInfo = mergedSettings.oauth_info;
    const keysToFlatten = [
      'oauth_keys_prefix',
      'service',
      'platform',
      'scope',
      'authorizationURL',
      'tokenURL',
      'clientID',
      'clientSecret',
      'requestTokenURL',
      'accessTokenURL',
      'userAuthorizationURL',
      'consumerKey',
      'consumerSecret',
    ];
    for (const k of keysToFlatten) {
      if (mergedSettings[k] === undefined && legacyInfo[k] !== undefined) {
        mergedSettings[k] = legacyInfo[k];
      }
    }
    delete mergedSettings.oauth_info;
  }

  // Ensure a name key exists to classify as named connection (even if empty)
  if (typeof mergedSettings.name === 'undefined') mergedSettings.name = '';

  return mergedSettings;
}

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

router.post(
  '/init',
  oauthInitLimit,
  includeTeamDetails,
  oauthStrategyInitialization,
  async (req, res) => {
    // Validate and store frontend origin
    const referer = req.headers.referer || req.headers.referrer || req.headers.origin;
    if (referer && typeof referer === 'string') {
      try {
        const frontendOrigin = new URL(referer).origin;

        // Validate against allowed origins (add your allowed origins to env)
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [frontendOrigin];
        if (!allowedOrigins.includes(frontendOrigin)) {
          console.warn(`[/oauth/init] Unauthorized origin: ${frontendOrigin}`);
          return res.status(403).json({ error: 'Origin not allowed' });
        }

        req.session.frontendOrigin = frontendOrigin;
      } catch (error) {
        console.error('[/oauth/init] Invalid referer/origin URL:', referer);
        return res.status(400).json({ error: 'Invalid origin' });
      }
    }

    try {
      const {
        service,
        scope,
        clientID,
        clientSecret,
        authorizationURL,
        tokenURL,
        oauth2CallbackURL,
        // OAuth1 parameters
        consumerKey,
        consumerSecret,
        requestTokenURL,
        accessTokenURL,
        userAuthorizationURL,
        oauth1CallbackURL,
      } = req.body;

      // Input validation
      if (!service || typeof service !== 'string') {
        return res.status(400).json({ error: 'Service is required and must be a string' });
      }

      // Validate URLs if provided
      const validateURL = (url: string, fieldName: string) => {
        if (!url) return;
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error(`${fieldName} must use HTTP or HTTPS`);
          }
        } catch (error) {
          throw new Error(`Invalid ${fieldName}: ${error.message}`);
        }
      };

      try {
        if (authorizationURL) validateURL(authorizationURL, 'authorizationURL');
        if (tokenURL) validateURL(tokenURL, 'tokenURL');
        if (requestTokenURL) validateURL(requestTokenURL, 'requestTokenURL');
        if (accessTokenURL) validateURL(accessTokenURL, 'accessTokenURL');
        if (userAuthorizationURL) validateURL(userAuthorizationURL, 'userAuthorizationURL');
        if (oauth2CallbackURL) validateURL(oauth2CallbackURL, 'oauth2CallbackURL');
        if (oauth1CallbackURL) validateURL(oauth1CallbackURL, 'oauth1CallbackURL');
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }

      if (OAuthServicesRegistry.isOAuth2Service(service) || service === 'oauth2') {
        // OAuth2 flow - Store sensitive data in session, return clean URL

        // Validate required OAuth2 fields
        if (!clientID || !clientSecret) {
          return res
            .status(400)
            .json({ error: 'clientID and clientSecret are required for OAuth2' });
        }

        // Store OAuth2 configuration in session (server-side only)
        req.session.oauth2Config = {
          service,
          clientID,
          //TODO: Do we need a stronger protection for this?
          clientSecret, // Safe in session
          authorizationURL,
          tokenURL,
          scope,
          callbackURL: oauth2CallbackURL,
        };

        // Return internal URL that will trigger Passport (no secrets exposed)
        // Let Passport handle state management internally
        const authUrl = `/oauth/${service}`;

        return res.json({ authUrl });
      } else if (OAuthServicesRegistry.isOAuth1Service(service) || service === 'oauth1') {
        // OAuth1 flow - Store sensitive data in session

        // Validate required OAuth1 fields
        if (!consumerKey || !consumerSecret) {
          return res
            .status(400)
            .json({ error: 'consumerKey and consumerSecret are required for OAuth1' });
        }

        // Store OAuth1 configuration in session (server-side only)
        req.session.oauth1Config = {
          service,
          consumerKey,
          //TODO: Do we need a stronger protection for this?
          consumerSecret, //Safe in session
          requestTokenURL,
          accessTokenURL,
          userAuthorizationURL,
          callbackURL: oauth1CallbackURL,
          scope,
        };

        // Return internal URL that will trigger Passport (no secrets exposed)
        // Let Passport handle state management internally
        const authUrl = `/oauth/${service}`;

        return res.json({ authUrl });
      } else {
        // Unsupported service
        return res.status(400).json({ error: 'Invalid or unsupported service.' });
      }
    } catch (error) {
      console.error('Error in /init route:', error);
      res.status(500).json({ error: 'Failed to initialize authentication' });
    }
  },
);

router.get('/:provider', async (req, res, next) => {
  try {
    const scopes = req?.session?.scopes?.split(' ') || [];
    const strategyOptions: any = {
      state: { beep: `${crypto.randomUUID()}` }, // Let Passport handle state internally
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

/**
 * Extracts the origin from the OAuth callback URL in the session.
 * Falls back to an empty string if not available or invalid.
 */
function getCallbackOrigin(req: express.Request): string {
  // For OAuth flows initiated from the React app at localhost:4002,
  // we need to send the message back to the frontend, not the backend callback URL

  // Check if we have a stored frontend origin in the session
  const frontendOrigin = req.session?.frontendOrigin;
  if (frontendOrigin) {
    return frontendOrigin;
  }

  // Check referer header to determine where the request came from
  const referer = req.headers.referer || req.headers.referrer;
  if (referer && typeof referer === 'string') {
    try {
      const refererOrigin = new URL(referer).origin;
      return refererOrigin;
    } catch (error) {
      console.error('Invalid referer URL:', referer);
    }
  }

  // For development, if running on localhost:4000 (backend), assume frontend is on 4002
  const callbackUrl =
    req.session?.oauth_info?.oauth2CallbackURL || req.session?.oauth_info?.oauth1CallbackURL;

  if (callbackUrl && callbackUrl.includes('localhost:4000')) {
    return 'http://localhost:4002';
  }

  // Fallback to extracting from callback URL (for production)
  if (typeof callbackUrl === 'string') {
    try {
      const origin = new URL(callbackUrl).origin;
      return origin;
    } catch (error) {
      console.error('Invalid callback URL:', callbackUrl);
      return '';
    }
  }

  return '';
}

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
          }, '${getCallbackOrigin(req)}');
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
      const origin = getCallbackOrigin(req);
      res.send(`
        <script>
          window.opener.postMessage({
              type: 'error',
              data: { message: 'Failed to exchange authorization code for tokens.' }
          }, '${origin}');
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
        const origin = getCallbackOrigin(req);
        const errorScript = `
          <script>
            window.opener.postMessage({
                type: 'error',
                data: { message: '${errorMessage.replace(/'/g, "\\'")}' }
            }, '${origin}');
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

async function handleOAuthOperation(
  settingKey: string,
  entryId: string,
  newDataFromAuthFlow: any,
  req: express.Request,
) {
  try {
    const existingSettings = await getTeamSettingsObj(req, settingKey);
    const existingEntryData = existingSettings?.[entryId] || {};

    // 1. Separate new token data from new settings data
    const { primary, secondary, expires_in, ...newSettingsFromAuthFlowRaw } = newDataFromAuthFlow;
    // Remove fields that must not be persisted inside auth_settings (e.g., team)
    const { team: _omitTeam, ...newSettingsFromAuthFlow } = newSettingsFromAuthFlowRaw;
    const newAuthData = { primary, secondary, expires_in };

    // 2. Determine the base settings (existing or new)
    // If existing entry has auth_settings, use that as base, otherwise use the whole existing entry (old structure) or an empty object.
    let baseSettings = {};
    if (existingEntryData.auth_settings) {
      baseSettings = existingEntryData.auth_settings;
    } else if (Object.keys(existingEntryData).length > 0 && !existingEntryData.auth_data) {
      // Handle old structure: extract settings from top level, excluding potential old token fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { primary: _p, secondary: _s, expires_in: _e, ...oldSettings } = existingEntryData;
      baseSettings = oldSettings;
    }

    // 3. Merge new settings from auth flow into base settings and normalize
    let mergedSettings: any = {
      ...(baseSettings as any),
      ...newSettingsFromAuthFlow,
    };

    // Ensure oauth_info is merged correctly if it exists in both
    if ((baseSettings as any).oauth_info && newSettingsFromAuthFlow.oauth_info) {
      mergedSettings.oauth_info = {
        ...(baseSettings as any).oauth_info,
        ...newSettingsFromAuthFlow.oauth_info,
      };
    }

    // Preserve existing display metadata if missing in incoming data
    if ((baseSettings as any).name && !mergedSettings.name)
      mergedSettings.name = (baseSettings as any).name;
    if ((baseSettings as any).platform && !mergedSettings.platform)
      mergedSettings.platform = (baseSettings as any).platform;
    // Ensure name key exists to classify as named (even if empty)
    if (typeof mergedSettings.name === 'undefined') mergedSettings.name = '';

    // Normalize
    mergedSettings = normalizeAuthSettings(mergedSettings);

    // 4. Construct the final data object with the new structure
    const finalDataToSave = {
      auth_data: newAuthData, // Always use the fresh tokens
      auth_settings: mergedSettings, // Use the merged settings
    };

    // 5. Save the final data object
    await saveTeamSettingsObj({ req, settingKey, entryId, data: finalDataToSave });
  } catch (error) {
    console.error(`[handleOAuthOperation] Error handling OAuth operation for ${entryId}:`, error);
    throw error; // Re-throw the error for higher-level handling
  }
}

function handleSuccessfulAuthentication(strategyType, res) {
  try {
    const messageType = strategyType === 'oauth' ? 'oauth' : 'oauth2';
    const messageData = { message: 'Authentication successful' };
    const origin = getCallbackOrigin(res.req);
    // If no origin found, try to use a wildcard or the opener's origin
    const targetOrigin = origin || '*';

    res.send(`<script>
      
      if (window.opener) {
        // Try sending to specific origin first, then fallback to wildcard if needed
        try {
          window.opener.postMessage({
              type: '${messageType}',
              data: ${JSON.stringify(messageData)}
          }, '${targetOrigin}');
        } catch (e) {
          console.error('[OAuth Callback] Failed to send to specific origin, trying wildcard:', e);
          window.opener.postMessage({
              type: '${messageType}',
              data: ${JSON.stringify(messageData)}
          }, '*');
        }
      } else {
        console.error('[OAuth Callback] window.opener is null - cannot send message');
      }
      
      setTimeout(() => {
        window.close();
      }, 500);
    </script>`);
  } catch (error) {
    console.error('Error in handleSuccessfulAuthentication:', error);
    throw error; // Re-throw the error for higher-level handling
  }
}

// Modify the existing compareOAuthDetails function to include template variable replacement.
async function compareOAuthDetails(existing: Record<string, any>, req: express.Request) {
  const updatedRequestBody = await replaceTemplateVariablesOptimized(req);
  const { oauth_keys_prefix } = updatedRequestBody;
  const entryId = `${oauth_keys_prefix}_TOKENS`;

  const entryData = existing[entryId];
  let connectionData: any;

  try {
    connectionData = typeof entryData === 'string' ? JSON.parse(entryData) : entryData;
  } catch (error) {
    console.error('Error parsing target object:', error);
    return false;
  }

  if (!connectionData || typeof connectionData !== 'object') {
    return false;
  }

  // Determine where the settings and auth data reside (new vs old structure)
  const settings = connectionData.auth_settings || connectionData; // Use auth_settings if exists, else assume old structure
  let authData = connectionData.auth_data || connectionData; // Use auth_data if exists, else assume old structure

  // New structure has no oauth_info; prefer oauth_info if present (legacy), else compare with flat settings
  const configToCompare: any = getConfigForCompare(settings);

  // Compare request body against provider config
  for (const [key, value] of Object.entries(updatedRequestBody)) {
    if (configToCompare[key] !== value) {
      return false;
    }
  }

  // Robust token presence check: support mis-saved tokens under auth_settings
  if (!hasPrimaryToken(authData, settings)) return false;

  return true; // All checks passed
}

router.post('/signOut', includeTeamDetails, async (req, res) => {
  try {
    // Accept either prefix (OAUTH_XXX) or full id (OAUTH_XXX_TOKENS)
    const raw = String(req.body.oauth_keys_prefix || '');
    const entryId = raw.endsWith('_TOKENS') ? raw : `${raw}_TOKENS`;
    const { invalidateAuthentication } = req.body; // invalidateAuthentication flag is still used

    const settings = await getTeamSettingsObj(req, 'oauth');
    if (!settings || !settings[entryId]) {
      return res
        .status(404)
        .json({ error: 'No existing OAuth settings found for the provided prefix.' });
    }

    // Parse existing data if it's a string
    let existingData = settings[entryId];
    try {
      existingData = typeof existingData === 'string' ? JSON.parse(existingData) : existingData;
    } catch (error) {
      console.error('Error parsing existing settings:', error);
      return res.status(500).json({ error: 'Invalid settings format' });
    }

    if (invalidateAuthentication !== true) {
      return res
        .status(400)
        .json({ error: 'Invalid request. Missing or invalid "invalidateAuthentication" flag.' });
    }

    // Prepare the updated data structure
    let updatedData;

    // Check if the existing data uses the new structure
    if (existingData.auth_data && existingData.auth_settings) {
      // New structure: Clear tokens within auth_data
      updatedData = {
        ...existingData,
        auth_data: {
          ...existingData.auth_data,
          primary: '',
          secondary: '',
          // Optionally clear expires_in or leave it? Clearing for consistency.
          expires_in: undefined, // or '' or null depending on desired state
        },
      };
      // Remove undefined expires_in if set that way
      if (updatedData.auth_data.expires_in === undefined) {
        delete updatedData.auth_data.expires_in;
      }
    } else {
      // Old structure: Clear tokens at the top level
      updatedData = {
        ...existingData,
        primary: '',
        secondary: '',
        expires_in: undefined, // or '' or null
      };
      if (updatedData.expires_in === undefined) {
        delete updatedData.expires_in;
      }
    }

    // If tokens were already empty, respond without saving (optional optimization)
    const currentPrimary = existingData.auth_data
      ? existingData.auth_data.primary
      : existingData.primary;
    const currentSecondary = existingData.auth_data
      ? existingData.auth_data.secondary
      : existingData.secondary;
    if (currentPrimary === '' && currentSecondary === '') {
      return res.json({ invalidate: true, message: 'Already signed out.' });
    }

    // Save the updated settings
    const saveResult = await saveTeamSettingsObj({
      req,
      settingKey: 'oauth',
      entryId,
      data: updatedData, // Save the structure with cleared tokens
    });

    if (!saveResult.success) {
      console.error('Failed to save team settings during sign out:', saveResult.error);
      return res.status(500).json({ error: saveResult.error || 'Failed to process Sign out.' });
    }

    return res.json({ invalidate: true, message: 'Signed out successfully.' });
  } catch (error) {
    console.error('Error during sign out:', error);
    return res.status(500).json({ error: 'Failed to process Sign out. ' + error.message });
  }
});

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
