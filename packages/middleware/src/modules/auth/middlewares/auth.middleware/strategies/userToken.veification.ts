/* eslint-disable no-else-return */
import { AuthStrategy } from '.';
import { config } from '../../../../../../config/config';
import { LOGGER } from '../../../../../../config/logging';
import { LogtoUser } from '../../../../../../types';
import { userService } from '../../../../user/services';
import axios from 'axios';
import qs from 'qs';
import { stringifyErr } from '../../../../../utils/general';

interface UserTokenData {
  logtoUser?: LogtoUser;
  user?: {
    id: any;
    email: any;
    teamId: any;
  };
  userId?: any;
}

export default class UserToken implements AuthStrategy {
  name = 'userToken';

  async verifyToken(token: string) {
    const data: UserTokenData = {};

    if (!token) {
      return { error: 'Access token is required', data: null, success: false };
    }

    const oidcUrl = `${config.variables.LOGTO_API_DOMAIN}/oidc/.well-known/openid-configuration`;

    const openid: { introspection_endpoint: string; userinfo_endpoint: string } = (await axios.get(oidcUrl)).data;

    const introspectionEndpoint = openid.introspection_endpoint;
    const userinfoEndpoint = openid.userinfo_endpoint;
    if (!token) {
      return { error: 'Access token is required', data: null, success: false };
    }

    const auth = {
      username: config.variables.LOGTO_APP_ID,
      password: config.variables.LOGTO_APP_SECRET,
    };
    try {
      // Send a POST request to the introspection endpoint
      const response = await axios.post(
        introspectionEndpoint,
        qs.stringify({
          token, // The token you want to introspect
          // Optionally include token_type_hint: 'access_token' if needed
        }),
        {
          // Basic Auth with the client ID and client secret
          auth,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // The introspection response will contain a boolean "active" field indicating validity
      if (response.data && response.data.active) {
        // Token is valid; you could attach token details to the request object if needed

        const userResponse = await axios.get(userinfoEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        // Here you can do something with response. For example, add it to the request object:
        data.logtoUser = userResponse.data;

        const logtoUser = data.logtoUser as LogtoUser;

        if (!logtoUser.primaryEmail) logtoUser.primaryEmail = logtoUser.email;
        if (!logtoUser.avatar) logtoUser.avatar = logtoUser.picture;
        LOGGER.info(`User ${logtoUser.primaryEmail} is logging in (name: ${logtoUser.name})`);
        const user = await userService.findOrCreateUser({
          email: logtoUser.primaryEmail,
          name: logtoUser.name,
          avatar: logtoUser.avatar,
        }); //* check if user exists in our DB, if not, create one

        if (!user.teamId) {
          LOGGER.info(`User ${logtoUser.primaryEmail} is logging without a team`);
          return { error: 'User does not belong to a team', data: null, success: false };
        }

        data.user = {
          id: user.id,
          email: user.email,
          teamId: user.teamId,
        };
        data.userId = user.id;

        return { data, success: true };
      } else {
        LOGGER.error(new Error(`User auth failed while sending request to Introspection endpoint with message: ${stringifyErr(response.data)}`));
        return { error: 'Access token is invalid or expired', data: null, success: false };
      }
    } catch (_err: any) {
      LOGGER.error(new Error(`User auth failed with message: ${stringifyErr(_err)}`));
      return { error: 'Internal server error during token validation', data: null, success: false };
    }
  }
}
