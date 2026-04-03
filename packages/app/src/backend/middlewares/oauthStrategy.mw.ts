import { OAuthServicesRegistry } from '@src/shared/helpers/oauth/oauth-services.helper';
import passport from 'passport';
import { replaceTemplateVariablesOptimized } from '../routes/oauth/helper/oauthHelper';
import { strategyConfig } from '../routes/oauth/helper/strategyConfig';

/**
 * Hosts that require HTTP Basic auth for the token exchange instead of POST body params.
 * Parsed via URL hostname for robust matching.
 */
const BASIC_AUTH_HOSTS = ['twitter.com', 'api.twitter.com', 'x.com', 'api.x.com'];

/** Checks whether the token endpoint requires HTTP Basic auth by inspecting URL hostnames. */
function requiresBasicAuthHeader(body: Record<string, string>): boolean {
  const urlsToCheck = [body.authorizationURL, body.tokenURL].filter(Boolean);
  return urlsToCheck.some((rawUrl) => {
    try {
      return BASIC_AUTH_HOSTS.includes(new URL(rawUrl).hostname);
    } catch {
      return false;
    }
  });
}

export const oauthStrategyInitialization = async (req, res, next) => {
  const { service, scope } = req.body;
  if (!service) {
    return res.status(400).send({ error: 'Service is required.' });
  }
  try {
    const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(service);
    const isOAuth1 = OAuthServicesRegistry.isOAuth1Service(service);
    const strategy = isOAuth2 ? 'oauth2' : 'oauth';
    req.session.strategyType = strategy;
    req.session.scopes = scope ?? '';
    req.session.oauth_info = req.body;
    req.session.team = req._team;

    if (!isOAuth2 && !isOAuth1) {
      return res.status(400).send({ error: 'Invalid or unsupported service.' });
    }

    let strategyDetails = isOAuth2 ? strategyConfig['oauth2'] : strategyConfig['oauth1'];
    let { Strategy, config: defaultConfig, processStrategy } = strategyDetails;

    let config: any = { ...defaultConfig };

    // Always resolve template variables from the current request body
    const updatedReqBody = await replaceTemplateVariablesOptimized(req).catch((error) => {
      console.log('Template processing error:', error);
      return req.body;
    });

    Object.entries(updatedReqBody).forEach(([key, value]) => {
      if (key === 'oauth1CallbackURL' || key === 'oauth2CallbackURL') {
        config['callbackURL'] = value;
      } else if (key in config) {
        config[key] = value;
      }
    });

    if (isOAuth2) {
      const userEnabledPkce = updatedReqBody.pkce === 'true' || updatedReqBody.pkce === true;
      const hostRequiresBasicAuth = requiresBasicAuthHeader(updatedReqBody);

      // Enable PKCE when the user toggled it on, or when the provider is known to require it
      if (userEnabledPkce || hostRequiresBasicAuth) {
        console.log('will  use PKCE');
        config.pkce = true;
      } else {
        console.log('will not use PKCE');
      }

      // Some providers (e.g. Twitter/X, Spotify) require credentials as HTTP Basic auth
      // header on the token exchange rather than POST body params
      if (hostRequiresBasicAuth) {
        const basicCredentials = Buffer.from(`${config.clientID}:${config.clientSecret}`).toString(
          'base64',
        );
        config.customHeaders = { Authorization: `Basic ${basicCredentials}` };
      }
    }

    // Derive callback URL when missing
    if (!config['callbackURL']) {
      try {
        const origin = req.headers?.origin || `${req.protocol}://${req.get('host')}`;
        const internalService = String(service).toLowerCase();

        const isOAuth2Check = OAuthServicesRegistry.isOAuth2Service(internalService);

        const provider = isOAuth2Check
          ? internalService === 'oauth2'
            ? 'oauth2'
            : internalService
          : 'oauth1';
        config['callbackURL'] = `${origin}/oauth/${provider}/callback`;
      } catch (e) {
        // leave as undefined if cannot derive
      }
    }

    // Setup the callback function for the strategy
    let strategyCallback: any = null;
    if (isOAuth2) {
      strategyCallback = (
        accessToken: any,
        refreshToken: any,
        params: any,
        profile: any,
        done: any,
      ) => processStrategy(accessToken, refreshToken, params, profile, done);
    } else if (isOAuth1) {
      strategyCallback = (token: any, tokenSecret: any, profile: any, done: any) =>
        // @ts-ignore - OAuth1 processStrategy signature mismatch
        processStrategy(token, tokenSecret, profile, done);
    }

    // Unuse the previous strategy if it was already used
    if (passport._strategies[strategy]) {
      passport.unuse(strategy);
    }

    // Use the new strategy with updated configuration
    passport.use(strategy, new (Strategy as any)(config, strategyCallback));

    next();
  } catch (error) {
    console.error('Error configuring authentication strategy:', error?.message);
    return res
      .status(500)
      .send({ error: 'Internal server error while setting up authentication.' });
  }
};
