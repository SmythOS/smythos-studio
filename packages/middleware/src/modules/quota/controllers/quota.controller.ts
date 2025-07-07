import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../types';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';
import { quotaService } from '../services';

export const getTeamSubsUsage: ExpressHandler<
  {},
  {
    usage: any;
  }
> = async (req, res) => {
  const parentTeamId = authExpressHelpers.getParentTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const usage = await quotaService.getTeamSubsQuotaUsage({ teamId: parentTeamId });

  return res.status(httpStatus.OK).json({
    usage,
  });
};

export const getFeaturesUsage: ExpressHandler<
  {},
  {
    usage: any;
  }
> = async (req, res) => {
  const parentTeamId = authExpressHelpers.getParentTeamId(res);
  const currTeamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const usage = await quotaService.getTeamFeaturesQuotaUsage({ parentTeamId, currTeamId });

  return res.status(httpStatus.OK).json({
    usage,
  });
};

export const getMonthlyLLMTokensAndApiRequestsUsage: ExpressHandler<
  { teamId: string },
  {
    usage: any;
  }
> = async (req, res) => {
  const { teamId } = req.params;
  const { date } = req.query;

  const usage = await quotaService.getMonthlyLLMTokensAndApiRequestsUsage({ teamId, date });

  return res.status(httpStatus.OK).json({
    usage,
  });
};

export const getTotalUsageForBillingCycle: ExpressHandlerWithParams<{}, {}, any> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);

  const result = await quotaService.getTotalUsageForBillingCycle(teamId);

  return res.status(httpStatus.OK).json(result);
};
