/* eslint-disable no-else-return */
import { AuthStrategy } from '.';
import { LOGGER } from '../../../../../../config/logging';
import { userService } from '../../../../user/services';

interface UserTokenData {
  logtoUser?: any;
  user?: {
    id: any;
    email: any;
    teamId: any;
  };
  userId?: any;
}

export default class DefaultUIAuth implements AuthStrategy {
  name = 'defaultUIAuth';

  async verifyToken(token: string) {
    const data: UserTokenData = {};

    if (!token) {
      return { error: 'Access token is required', data: null, success: false };
    }

    const userAuth = {
      sub: 'sub_1',
      name: 'Admin',
      picture: undefined,
      updated_at: Date.now(),
      username: null,
      created_at: Date.now(),
      email: 'admin@smythos.com',
      email_verified: true,
      primaryEmail: 'admin@smythos.com',
      avatar: undefined,
    };
    data.logtoUser = userAuth;
    const logtoUser = data.logtoUser;

    if (!logtoUser.primaryEmail) logtoUser.primaryEmail = logtoUser.email;
    if (!logtoUser.avatar) logtoUser.avatar = logtoUser.picture;
    // LOGGER.info(`User ${logtoUser.primaryEmail} is logging in (name: ${logtoUser.name})`);
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
  }
}
