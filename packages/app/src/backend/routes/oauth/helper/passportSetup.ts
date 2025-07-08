import passport from 'passport';
import { strategyConfig } from '../helper/strategyConfig';

export const initializePassport = () => {
  Object.keys(strategyConfig).forEach((service) => {
    const { Strategy, config, processStrategy } = strategyConfig[service];
    service = service === 'oauth2' ? service : 'oauth';
    //console.log({service})
    passport.use(`${service}`, new Strategy(config, processStrategy));
  });

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));
};
