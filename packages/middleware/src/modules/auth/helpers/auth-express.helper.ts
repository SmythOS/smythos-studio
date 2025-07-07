import { Response } from 'express';
import ApiError from '../../../utils/apiError';
import { LogtoUser } from '../../../../types';

export const authExpressHelpers = {
  getUserId: (res: Response) => {
    const userId = res.locals.user.id;
    if (!userId) throw new ApiError(500, 'User id not found');
    return userId;
  },

  getUser: (res: Response) => {
    const user = res.locals.user;
    if (!user) throw new ApiError(500, 'User not found');
    return user;
  },

  _getLogtoUser: (res: Response): LogtoUser => {
    const user = res.locals.logtoUser;
    if (!user) throw new ApiError(500, 'User not found');
    return user;
  },

  getUserEmail: (res: Response): string => {
    const email = res.locals.user.email;
    if (!email) throw new ApiError(500, 'Email not found');
    return email;
  },

  getTeamId: (res: Response) => {
    const teamId = res.locals.targetTeamId || res.locals.user.teamId; // fallback to user's team id
    if (!teamId) throw new ApiError(500, 'Target team id not found');
    return teamId;
  },

  // getChosenTeamId: (res: Response) => {
  //   const teamId = res.locals.targetTeamId || res.locals.user.teamId; // fallback to user's team id
  //   if (!teamId) throw new ApiError(500, 'Target team id not found');
  //   return teamId;
  // },

  getParentTeamId: (res: Response) => {
    const teamId = res.locals.user.teamId;
    if (!teamId) throw new ApiError(500, 'Team id not found');
    return teamId;
  },
};
