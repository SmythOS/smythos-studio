import passport from 'passport';
import { strategyConfig } from '../routes/oauth/helper/strategyConfig';
import { replaceTemplateVariablesOptimized } from '../routes/oauth/helper/oauthHelper';

export const dynamicStrategyInitialization = async (req, res, next) => {
  const { service, scope } = req.body;
  //console.log(service,callbackURL)
  if (!service) {
    return res.status(400).send({ error: 'Service is required.' });
  }
  try {
    // Determine if the strategy is OAuth1.0 or OAuth2.0 based on the service
    const isOAuth2 = ['google', 'linkedin', 'oauth2'].includes(service);
    const isOAuth1 = ['twitter', 'oauth1'].includes(service);
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
    // Override default config with body parameters
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

    // Setup the callback function for the strategy
    let strategyCallback = null;
    if (isOAuth2) {
      strategyCallback = (accessToken, refreshToken, params, profile, done) =>
        processStrategy(accessToken, refreshToken, params, profile, done, service);
    } else if (isOAuth1) {
      strategyCallback = (token, tokenSecret, profile, done) =>
        processStrategy(token, tokenSecret, profile, done, service);
    }

    // Unuse the previous strategy if it was already used
    if (passport._strategies[strategy]) {
      passport.unuse(strategy);
    }

    // Use the new strategy with updated configuration
    passport.use(strategy, new Strategy(config, strategyCallback));

    next();
  } catch (error) {
    console.error('Error configuring authentication strategy:', error);
    return res
      .status(500)
      .send({ error: 'Internal server error while setting up authentication.' });
  }
};
