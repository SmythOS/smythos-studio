import httpStatus from 'http-status';
import { ExpressHandlerWithParams } from '../../../../../types';
import { subscriptionService } from '../../services';
import { PlanPropFlags, PlanPropLimits, PlanProperties, SubscriptionProperties } from '../../../quota/interfaces';
import ApiError from '../../../../utils/apiError';
import * as quotaUtils from '../../../quota/utils';

export const getTeamSubs: ExpressHandlerWithParams<
  {
    teamId: string;
  },
  {},
  any
> = async (req, res) => {
  const { teamId } = req.params;

  const subs = await subscriptionService.getTeamSubs(teamId);
  if (subs?.plan?.properties) {
    subs.plan.properties = quotaUtils.fillPlanProps(subs.plan.properties as object);
  }

  return res.status(httpStatus.OK).json({
    subs,
  });
};
