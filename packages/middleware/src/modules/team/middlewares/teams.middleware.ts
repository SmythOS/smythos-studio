import asyncHandler from 'express-async-handler';
import { ExpressHandler } from '../../../../types';
import { teamService } from '../services';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';
import ApiError from '../../../utils/apiError';
import httpStatus from 'http-status';

export const requireTeamManager: ExpressHandler<{}, {}> = asyncHandler(async (req, res, next) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  if (!teamId || !userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User or team not found');
  }
  await teamService.checkIfCanManageTeamOrThrow(userId, teamId);
  next();
});
