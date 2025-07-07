import rateLimit from 'express-rate-limit';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';
import { config } from '../../../../config/config';

const checkoutSessionsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.variables.env === 'production' ? 5 : 50,
  keyGenerator: (_, res) => {
    return authExpressHelpers.getTeamId(res);
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,

  requestPropertyName: 'teamId',
});

const billingSessionsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.variables.env === 'production' ? 5 : 50,
  keyGenerator: (_, res) => {
    return authExpressHelpers.getTeamId(res);
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,

  requestPropertyName: 'teamId',
});

export { checkoutSessionsRateLimit, billingSessionsRateLimit };
