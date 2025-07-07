import tokenVerStrategies from '../../src/modules/auth/middlewares/auth.middleware/strategies';
import { config } from '../../config/config';
import { expect, test, describe, vi } from 'vitest';
import * as jose from 'jose';
import redisConn from '../../src/connections/redis.connection.ts';
import axios from 'axios';
import { userService } from '../../src/modules/user/services/index.ts';

vi.mock('../../prisma/prisma-client.ts', () => import('../libs/__mocks__/prisma-client.ts'));
// vi.mock('../../src/connections/redis.connection.ts', () => import('../libs/__mocks__/redis.ts'));

vi.mock('jose', async () => {
  return {
    __esModule: true, //    <----- this __esModule: true is important
    ...(await vi.importActual('jose')),
  };
});

describe('Authentication System', () => {
  describe('API Key M2M Verification', async () => {
    test(' should return success true for valid token', async () => {
      const token = config.variables.SMYTH_API_KEY;
      const { success } = await tokenVerStrategies.apiKeyM2M.verifyToken(token);
      expect(success).toBe(true);
    });

    test(' should return success false for invalid token', async () => {
      const token = '__INVALID_API_KEY__';
      const { success } = await tokenVerStrategies.apiKeyM2M.verifyToken(token);
      expect(success).toBe(false);
    });
  });

  describe('JWT M2M Verification', () => {
    test('should successfully do remote token validation', async () => {
      const token = '__VALID_TOKEN__';
      const jwtVerifySpy = vi.spyOn(jose, 'jwtVerify').mockImplementation(async () => ({
        protectedHeader: { alg: '' },
        key: { type: 'alg' },
        payload: { sub: config.variables.LOGTO_M2M_APP_ID },
      }));
      const { success } = await tokenVerStrategies.jwtM2M.verifyToken(token);
      expect(jwtVerifySpy).toHaveBeenCalledTimes(1);
      expect(success).toBe(true);
    });

    test('should return success false for invalid token (after 3 retries)', async () => {
      const token = '__INVALID_TOKEN__';
      const jwtVerifySpy = vi.spyOn(jose, 'jwtVerify').mockImplementation(async () => {
        throw new Error('Invalid token');
      });
      const { success } = await tokenVerStrategies.jwtM2M.verifyToken(token);
      expect(jwtVerifySpy).toHaveBeenCalledTimes(3); // 3 retries
      expect(success).toBe(false);
    });

    describe('User Token Verification', () => {
      test(' should return success false for invalid token (active = false)', async () => {
        const dummyOpaqueToken = '0000000000000';
        vi.spyOn(redisConn, 'get').mockResolvedValue(null);
        vi.spyOn(redisConn, 'set').mockResolvedValue(null);
        vi.spyOn(axios, 'get').mockResolvedValue({ data: { introspection_endpoint: '', userinfo_endpoint: '' } });
        vi.spyOn(axios, 'post').mockResolvedValue({ data: { active: false } }); // Mock introspection response

        const { success } = await tokenVerStrategies.userToken.verifyToken(dummyOpaqueToken);
        expect(success).toBe(false);
      });

      test(' should return success true for valid token (active = true)', async () => {
        const dummyOpaque = '0000000000000';
        vi.spyOn(redisConn, 'get').mockResolvedValue(null);
        vi.spyOn(redisConn, 'set').mockResolvedValue(null);
        vi.spyOn(axios, 'get').mockResolvedValue({ data: { introspection_endpoint: '', userinfo_endpoint: '' } });
        vi.spyOn(axios, 'post').mockResolvedValue({ data: { active: true } }); // Mock introspection response

        vi.spyOn(userService, 'findOrCreateUser').mockResolvedValueOnce({
          id: 1,
          teamId: '1',
          email: 'any@any.com',
          avatar: 'any',
          name: 'any',
        });

        const { success } = await tokenVerStrategies.userToken.verifyToken(dummyOpaque);
        expect(success).toBe(true);
      });
    });
  });
});
