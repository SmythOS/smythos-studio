import axios, { AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { NextFunction, Request, Response } from 'express';
import { ITeam } from '../../react/shared/types/entities';
import { teamSettingKeys } from '../../shared/teamSettingKeys';
import { userSettingKeys } from '../../shared/userSettingKeys';
import config from '../config';
import { TEAM_ID_HEADER } from '../constants';
import { getM2MToken } from '../services/logto-helper';
import * as teamData from '../services/team-data.service';
import * as userData from '../services/user-data.service';

export const smythAPIReq = axios.create({
  baseURL: `${config.env.SMYTH_API_BASE_URL}/v1`,
});

// the difference between smythAPIReq and smythAPI is that smythAPI SHOULD not be intercepted by any middleware
export const smythAPI = axios.create({
  baseURL: `${config.env.SMYTH_API_BASE_URL}/v1`,
});

export const smythVaultAPI = axios.create({
  baseURL: `${config.env.SMYTH_VAULT_API_BASE_URL}`,
});

export function includeAxiosAuth(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export const headersWithToken = (token: string, headers: Record<string, unknown> = {}) => {
  return {
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Fetches user settings for a given key.
 * @param {string} token - The user's access token.
 * @param {string} key - The key for the user setting.
 * @returns {Promise<any>} The user settings or null if not found.
 */

export const getUserSettingsByKey = async (token: string, key: string): Promise<any> => {
  const userSettings = await userData.getUserSettings(token, key);
  // Check if userSettings is an empty array and return null if true
  return Array.isArray(userSettings) && userSettings.length === 0 ? null : userSettings;
};

/**
 * Fetches the current team ID for the user.
 * @param {string} token - The user's access token.
 * @returns {Promise<{ userSelectedTeam: string | null; userTeam: ITeam | null }>} The user's current team ID and team data.
 * @throws {Error} If there's an issue fetching user data or settings.
 */
export const getUserCurrentTeamId = async (
  token: string,
): Promise<{ userSelectedTeam: string | null; userTeam: ITeam | null }> => {
  const emptyResponse = {
    userTeam: null,
    userSelectedTeam: null,
  };
  if (!token) {
    // throw new Error('Invalid token provided');
    return emptyResponse;
  }

  try {
    const [userData, userSelectedTeam] = await Promise.all([
      smythAPI.get<{ user: { team: ITeam } }>('/user/me', includeAxiosAuth(token)),
      getUserSettingsByKey(token, userSettingKeys.USER_TEAM),
    ]);

    if (!userData.data || !userData.data.user) {
      // throw new Error('Invalid user data received');
      return emptyResponse;
    }

    const userTeam = userData.data.user.team;

    return {
      userTeam: userTeam || null,
      userSelectedTeam: userSelectedTeam || userTeam?.id || null,
    };
  } catch (error) {
    // console.error('Error fetching user current team ID:', error?.message);
    // throw new Error('Failed to fetch user current team ID');
    return emptyResponse;
  }
};

/**
 * Generates authentication headers with team ID and bearer token
 * @param {Request} request - The request object.
 * @param {Record<string, unknown>} headers - Additional optional headers to include.
 * @returns {Promise<{ headers: RawAxiosRequestHeaders }>} The authentication headers.
 */
export const authHeaders = async (
  request: Request,
  headers: RawAxiosRequestHeaders = {},
  providedToken?: string,
): Promise<{ headers: RawAxiosRequestHeaders }> => {
  const token = providedToken || request?.user?.accessToken;
  const userSelectedTeam =
    request.header(TEAM_ID_HEADER) || (await getUserCurrentTeamId(token))?.userSelectedTeam;

  return {
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
      [TEAM_ID_HEADER]: userSelectedTeam,
    },
  };
};

//* This function forwards the request to smythAPI and returns the exact same response/error

/**
 *
 * @param options - Options for the middleware
 * @param options.useFullEndpoint - If true, the request will be forwarded to the full express endpoint not the url provided by the caller router
 * @param options.endpointBuilder - A function that takes the request and returns the endpoint to forward the request to
 * @returns A middleware function that forwards the request to smythAPI and returns the exact same response/error
 */
export const forwardToSmythAPIMiddleware = (options?: {
  useFullEndpoint?: boolean;
  endpointBuilder?: (req: Request) => string;
}) => {
  // created this to avoid any smythAPIReq interceptors or global config
  const _smythAPIReq = axios.create({
    baseURL: `${config.env.SMYTH_API_BASE_URL}/v1`,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forwarded: AxiosRequestConfig<any> = {
        method: req.method.toLowerCase(),
        url: options?.endpointBuilder
          ? options.endpointBuilder(req)
          : options?.useFullEndpoint
            ? req.originalUrl.replace('/api/page', '') //! SHOULD BE HANDLED IN A CONFIG FILE OR SOMETHING
            : req.url,
        data: req.body,
        ...(await authHeaders(req)),
      };

      const result = await _smythAPIReq.request(forwarded);

      return res.json(result.data);
    } catch (error) {
      return res.status(error?.response?.status || 500).json({
        error: error?.response?.data ?? {
          message: 'Internal server error!',
          code: 500,
        },
      });
    }
  };
};

export const forwardToSmythM2MAPIMiddleware = (options?: {
  useFullEndpoint?: boolean;
  endpointBuilder?: (req: Request) => string;
}) => {
  // created this to avoid any smythAPIReq interceptors or global config
  const _smythAPIReq = axios.create({
    baseURL: config.api.SMYTH_M2M_API_URL,
  });

  return async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const token = await getM2MToken();
      const forwarded: AxiosRequestConfig<any> = {
        method: req.method.toLowerCase(),
        url: options?.endpointBuilder
          ? options.endpointBuilder(req)
          : options?.useFullEndpoint
            ? req.originalUrl.replace('/api/page', '') //! SHOULD BE HANDLED IN A CONFIG FILE OR SOMETHING
            : req.url,
        data: req.body,
        ...includeAxiosAuth(token),
      };

      const result = await _smythAPIReq.request(forwarded);

      return res.json(result.data);
    } catch (error) {
      return res.status(error?.response?.status || 500).json({
        error: error?.response?.data ?? {
          message: 'Internal server error!',
          code: 500,
        },
      });
    }
  };
};

/**
 * Fetches team settings
 * @param {string} token - The user's access token.
 * @param {string} key - The key for the team setting.
 * @returns {Promise<any>} The team settings or null if not found.
 */

export const getTeamSettingsByKey = async (req: Request, key: string): Promise<any> => {
  const teamSettings = await teamData.getTeamSettingsObj(req, key);
  //Object.keys(teamSettings).includes('limitValue') is for backward compatibility
  if (key === teamSettingKeys.BILLING_LIMIT && Object.keys(teamSettings).includes('limitValue')) {
    return teamSettings;
  }
  // Check if userSettings is an empty array and return null if true
  return teamSettings[key];
};

// * Disabled the handleError interceptor, we have some drawback with this implementation
// smythAPIReq.interceptors.response.use((response) => response, handleError);

// Error handling function

interface ErrorObj {
  status: number;
  message: string;
  errKey?: string;
}

class SmythAPIReqError extends Error {
  status: number;
  errKey?: string;

  constructor(errorObj: ErrorObj) {
    super(errorObj.message);
    this.name = 'SmythAPIReqError';
    this.status = errorObj.status;
    this.errKey = errorObj.errKey;
  }
}

function handleError(error) {
  const errObj: ErrorObj = { status: 500, message: '' };

  if (error.response) {
    /*
         The request was made and the server responded with a status code
         that falls out of the range of 2xx
        */
    errObj.status = error?.response?.status;
    errObj.message =
      error?.response?.data?.message || error?.response?.data?.error || error?.response?.statusText;
    errObj.errKey = error?.response?.data?.errKey;
  } else if (error.request) {
    // The request was made but no response was received
    errObj.status = 204;
    errObj.message = 'No response received!';
  } else {
    // Something happened in setting up the request that triggered an Error
    errObj.status = error?.code || error?.status;
    errObj.message = error?.message;
    errObj.errKey = error?.errKey;
  }

  errObj.status = errObj?.status || 500;
  errObj.message = errObj?.message || 'Internal server error!';

  if (typeof errObj.message === 'object') {
    errObj.message = JSON.stringify(errObj.message);
  }

  const req: Request = error?.request;
  console.log('Error in smythAPIReq! - ', error?.request?.path, errObj);
  console.log('  => Request: ', {
    headers: req?.headers,
    method: req?.method,
    path: req?.path,
    query: req?.query,
    params: req?.params,
    body: req?.body,
  });
  throw new SmythAPIReqError(errObj);
}
