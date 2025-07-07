/* eslint-disable no-await-in-loop */
import { AuthStrategy } from '.';
import { config } from '../../../../../../config/config';
import * as jose from 'jose';
import { LOGGER } from '../../../../../../config/logging';
import { stringifyErr } from '../../../../../utils/general';

interface JwtM2MData {
  payload?: any;
  logtoUserSub?: string;
}

export default class JwtM2M implements AuthStrategy {
  name = 'jwtM2M';

  async verifyToken(token: string) {
    const data: JwtM2MData = {};

    if (!token) {
      LOGGER.error(new Error('M2M JWT verification failed: No M2M token found in request header'));
      return { error: 'Access token is required', data, success: false };
    }

    const result: any = await this.jwtVerifyWithRetry(token, 2);

    if (result.error) {
      LOGGER.error(new Error(`M2M JWT verification failed while verifying token with message: ${stringifyErr(result.error)}`));
      return { error: result.error, data, success: false };
    }

    const payload = result.payload;
    data.payload = payload;
    data.logtoUserSub = payload?.sub;

    const m2mToken = config.variables.LOGTO_M2M_APP_ID;
    const isM2M = payload?.sub === m2mToken; //* if sub == M2M_TOKEN, then it's a machine to machine token

    const success = !result.error && isM2M;

    return { error: result.error, data, success };
  }

  private async jwtVerifyWithRetry(token: string, retries = 2) {
    let result: any = {};
    let retryCount = 0;
    const { jwtVerify, createRemoteJWKSet } = jose;

    while (retryCount <= retries) {
      try {
        result = await jwtVerify(token, createRemoteJWKSet(new URL(`${config.variables.LOGTO_API_DOMAIN}/oidc/jwks`)), {
          issuer: `${config.variables.LOGTO_API_DOMAIN}/oidc`,
          audience: config.variables.LOGTO_RESOURCE_INDICATOR,
        } as jose.JWTVerifyOptions);
        break;
      } catch (err: any) {
        LOGGER.error(new Error(`M2M JWT verification failed while verifying token (Retry ${retryCount}) with message: ${stringifyErr(err)}`));
        result = err;
        retryCount++;
      }
    }

    return result;
  }
}
