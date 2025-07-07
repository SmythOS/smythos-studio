/* eslint-disable no-else-return */
/* eslint-disable consistent-return */
import { NextFunction } from 'express';
import httpStatus from 'http-status';
import ApiError from '../../../../utils/apiError';
import tokenVerStrategies from './strategies';
import { LOGGER } from '../../../../../config/logging';
import { teamService } from '../../../team/services';

const authMiddlewareFactory = ({ requireTeam = true, allowM2M = false, limitToM2M = false }) => {
  return async (req: any, res: any, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1] || req.query.token;
      const isJWT = token && token.length > 100; // JWT token is longer than 100 chars (not a perfect check)
      const X_API_KEY = req.headers['x-api-key'];

      if (isJWT) {
        LOGGER.info(`M2M JWT auth for token in progress....`);
        if (!allowM2M) throw new ApiError(httpStatus.FORBIDDEN, 'M2M is not enabled'); // we only use JWT for M2M

        const { success } = await tokenVerStrategies.jwtM2M.verifyToken(token);

        if (!success) {
          // return res.status(401).json({ error: 'Access token is invalid or expired' });
          return next(new ApiError(httpStatus.UNAUTHORIZED, 'Access token is invalid or expired'));
        }
        res.locals.isM2M = true;

        return next();
      } else if (X_API_KEY) {
        LOGGER.info(`API Key auth for key in progress....`);
        // X-API-KEY is used for internal requests to do some operations
        if (!allowM2M) throw new ApiError(httpStatus.FORBIDDEN, 'M2M is not enabled'); // we only use JWT for M2M

        const { success } = await tokenVerStrategies.apiKeyM2M.verifyToken(X_API_KEY);

        if (!success) {
          // return res.status(401).json({ error: 'API Key is invalid' });
          return next(new ApiError(httpStatus.UNAUTHORIZED, 'API Key is invalid'));
        }
        res.locals.isM2M = true;

        return next();
      } else {
        LOGGER.info(`User token auth for token in progress....`);
        // user token auth
        if (limitToM2M) throw new ApiError(httpStatus.FORBIDDEN, 'User auth is not enabled for this request');

        const { data, success } = await tokenVerStrategies.userToken.verifyToken(token);

        if (!success) {
          // return res.status(401).json({ error: 'Access token is invalid or expired' });
          return next(new ApiError(httpStatus.UNAUTHORIZED, 'Access token is invalid or expired'));
        }

        res.locals.logtoUser = data!.logtoUser;
        res.locals.user = data!.user;
        res.locals.userId = data!.userId;

        // check if another teamid was passed in the request header. if so, make sure that the user is part of that team and set the teamId in res.locals (res.locals.user.teamId)
        const teamIdHeader = req.headers['x-smyth-team-id'];
        if (teamIdHeader) {
          // check if the user is part of the team
          const hasTeamAccess = await teamService.isUserPartOfTeam(data!.userId, teamIdHeader);

          if (!hasTeamAccess) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this team');
          }

          res.locals.targetTeamId = teamIdHeader;
        }

        if (requireTeam && !data!.user?.teamId) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Please create a team and try again');
        }

        runLocalsFieldsSanityChecks(res);

        return next();
      }
    } catch (error: any) {
      // res.status(500).json({ error: error.message });
      return next(new ApiError(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR, error.message));
    }
  };
};

const runLocalsFieldsSanityChecks = (res: any) => {
  if (!res.locals.logtoUser || !res.locals.user || !res.locals.userId) {
    LOGGER.error(new Error(`CRITICAL SECURITY FLAW: User auth middleware failed to set required fields in res.locals`));
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Something went wrong');
  }
};

const userAuthMiddleware = authMiddlewareFactory({
  allowM2M: false,
  requireTeam: true,
  limitToM2M: false,
});

export { authMiddlewareFactory, userAuthMiddleware };
