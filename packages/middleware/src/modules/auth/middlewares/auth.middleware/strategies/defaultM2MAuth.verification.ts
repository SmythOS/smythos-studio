/* eslint-disable no-await-in-loop */
import { AuthStrategy } from '.';
import { LOGGER } from '../../../../../../config/logging';

export default class DefaultM2MAuth implements AuthStrategy {
  name = 'defaultM2MAuth';

  async verifyToken(token: string) {
    if (!token) {
      LOGGER.error(new Error('M2M JWT verification failed: No M2M token found in request header'));
      return { error: 'Access token is required', success: false };
    }

    return { error: undefined, data: {}, success: true };
  }
}
