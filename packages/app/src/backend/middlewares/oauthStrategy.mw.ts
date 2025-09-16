import { OAuthServicesRegistry } from '@src/shared/helpers/oauth/oauth-services.helper';
import passport from 'passport';
import { replaceTemplateVariablesOptimized } from '../routes/oauth/helper/oauthHelper';
import { strategyConfig } from '../routes/oauth/helper/strategyConfig';

export const oauthStrategyInitialization = async (req, res, next) => {
  const { service, scope } = req.body;
  //console.log(service,callbackURL)
  if (!service) {
    return res.status(400).send({ error: 'Service is required.' });
  }
  try {
    // Determine if the strategy is OAuth1.0 or OAuth2.0 based on the service using centralized configuration
    const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(service);
    const isOAuth1 = OAuthServicesRegistry.isOAuth1Service(service);
    const strategy = isOAuth2 ? 'oauth2' : 'oauth';
    req.session.strategyType = strategy;
    req.session.scopes = scope ?? '';
    req.session.oauth_info = req.body;
    req.session.team = req._team;
    // Log for debugging

    if (!isOAuth2 && !isOAuth1) {
      return res.status(400).send({ error: 'Invalid or unsupported service.' });
    }

    // Select the appropriate strategy and configuration based on the service
    let strategyDetails = isOAuth2 ? strategyConfig['oauth2'] : strategyConfig['oauth1'];
    let { Strategy, config: defaultConfig, processStrategy } = strategyDetails;

    // Prepare the configuration
    let config: any = { ...defaultConfig }; // Spread operator for shallow clone


    // Use session-stored configuration instead of URL parameters
    if (isOAuth2 && req.session.oauth2Config) {
      const oauth2Config = req.session.oauth2Config;

      // Handle template variables in session-stored config
      const configToProcess = { ...oauth2Config };
      const mockReq = {
        body: configToProcess,
        _team: req._team,
        session: req.session,
      };

      const processedConfig = await replaceTemplateVariablesOptimized(mockReq).catch((error) => {
        console.log('Template processing error for OAuth2:', error);
        return configToProcess;
      });

      config.clientID = processedConfig.clientID;
      config.clientSecret = processedConfig.clientSecret; // Safe from session + templates resolved
      config.callbackURL = processedConfig.callbackURL;
      if (processedConfig.authorizationURL)
        config.authorizationURL = processedConfig.authorizationURL;
      if (processedConfig.tokenURL) config.tokenURL = processedConfig.tokenURL;
    } else if (isOAuth1 && req.session.oauth1Config) {
      const oauth1Config = req.session.oauth1Config;

      // Handle template variables in session-stored config
      const configToProcess = { ...oauth1Config };
      const mockReq = {
        body: configToProcess,
        _team: req._team,
        session: req.session,
      };

      //TODO : do we really need to handle template variables for oauth
      const processedConfig = await replaceTemplateVariablesOptimized(mockReq).catch((error) => {
        console.log('Template processing error for OAuth1:', error);
        return configToProcess;
      });

      config.consumerKey = processedConfig.consumerKey;
      config.consumerSecret = processedConfig.consumerSecret; // Safe from session + templates resolved
      config.callbackURL = processedConfig.callbackURL;
      if (processedConfig.requestTokenURL) config.requestTokenURL = processedConfig.requestTokenURL;
      if (processedConfig.accessTokenURL) config.accessTokenURL = processedConfig.accessTokenURL;
      if (processedConfig.userAuthorizationURL)
        config.userAuthorizationURL = processedConfig.userAuthorizationURL;
    } else {
      // Fallback to legacy URL parameter method (for backward compatibility)
      //TODO : do we really need to handle template variables for oauth
      const updatedReqBody = await replaceTemplateVariablesOptimized(req).catch((error) => {
        console.log('error', error);
        return { error };
      });

      Object.entries(updatedReqBody).forEach(([key, value]) => {
        if (key === 'oauth1CallbackURL' || key === 'oauth2CallbackURL') {
          config['callbackURL'] = value;
        } else if (key in config) {
          config[key] = value;
        }
      });
    }


    // Derive callback URL when missing
    if (!config['callbackURL']) {
      try {
        const origin = req.headers?.origin || `${req.protocol}://${req.get('host')}`;
        const internalService = String(service).toLowerCase();

        const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(internalService);

        const provider = isOAuth2
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
