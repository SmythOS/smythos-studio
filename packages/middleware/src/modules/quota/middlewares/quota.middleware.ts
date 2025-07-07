import asyncHandler from 'express-async-handler';
import { ExpressHandler } from '../../../../types';
import ApiError from '../../../utils/apiError';
import { quotaService } from '../services';
import errKeys from '../../../utils/errorKeys';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';

const prodAiAgentsQuota: ExpressHandler<{}, {}> = asyncHandler(async (req, res, next) => {
  const teamId = authExpressHelpers.getTeamId(res);

  if (!teamId) {
    throw new ApiError(500, 'quota middleware: teamId not found', undefined, false); // internal error msg
  }
  const { quotaReached } = await quotaService.checkProdAiAgentsLimit({ teamId });
  // quotaService.checkProd

  if (quotaReached) {
    throw new ApiError(402, 'You have reached your production AI Agents limit', errKeys.QUOTA_EXCEEDED);
  }

  next();
});

const devAiAgentsQuota: ExpressHandler<{}, {}> = asyncHandler(async (req, res, next) => {
  const teamId = authExpressHelpers.getTeamId(res);

  if (!teamId) {
    throw new ApiError(500, 'quota middleware: teamId not found', undefined, false); // internal error msg
  }

  const { quotaReached } = await quotaService.checkDevAiAgentsLimit({ teamId });

  if (quotaReached) {
    throw new ApiError(402, 'You have reached your development AI Agents limit', errKeys.QUOTA_EXCEEDED);
  }

  next();
});

const teamMembersQuota: ExpressHandler<{}, {}> = asyncHandler(async (req, res, next) => {
  const teamId = authExpressHelpers.getTeamId(res);

  if (!teamId) {
    throw new ApiError(500, 'quota middleware: teamId not found', undefined, false); // internal error msg
  }

  const { quotaReached } = await quotaService.checkTeamMembersLimit({ teamId });

  if (quotaReached) {
    throw new ApiError(402, 'You have reached your team members limit', errKeys.QUOTA_EXCEEDED);
  }

  next();
});

const quotaMw = {
  prodAiAgentsQuota,
  devAiAgentsQuota,
  teamMembersQuota,
};

export default quotaMw;
