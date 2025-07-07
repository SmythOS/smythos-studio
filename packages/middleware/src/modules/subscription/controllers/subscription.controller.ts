import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../types';
import { subscriptionService } from '../services';
import ApiError from '../../../utils/apiError';
import { config } from '../../../../config/config';
import { StripeSubsCreatedEvent } from '../interfaces';
import { stripe } from '../../../lib/payments';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';
import { SubsItemTag } from '../constants';

export const getTeamsSubs: ExpressHandler<{}, { teamsSubs: any }> = async (req, res) => {
  const parentTeamId = authExpressHelpers.getParentTeamId(res);
  const includeObject: boolean = req.query.includeObject === 'true';

  const teamsSubs = await subscriptionService.getTeamSubs(parentTeamId, {}, includeObject);

  return res.status(httpStatus.OK).json({
    message: 'Teams Subs retrieved successfully',
    teamsSubs,
  });
};
