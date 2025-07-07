import tokenVerStrategies from '../../src/modules/auth/middlewares/auth.middleware/strategies';
import { authMiddlewareFactory, userAuthMiddleware } from '../../src/modules/auth/middlewares/auth.middleware';
import { config } from '../../config/config';
import { expect, test, describe, vi } from 'vitest';
import { getM2MToken } from '../utils/get-tokens';
import { createRequest, createResponse } from 'node-mocks-http';
import { prisma as prismaMock } from '../libs/__mocks__/prisma-client';
import ApiError from '../../src/utils/apiError.ts';
import httpStatus from 'http-status';
import * as jose from 'jose';
import redisConn from '../../src/connections/redis.connection.ts';
import axios from 'axios';
import { userService } from '../../src/modules/user/services/index.ts';

vi.mock('../../prisma/prisma-client.ts', () => import('../libs/__mocks__/prisma-client.ts'));
// vi.mock('../../src/connections/redis.connection.ts', () => import('../libs/__mocks__/redis.ts'));

describe('Auth Middleware', async () => {
  const m2mToken = await getM2MToken();
  const m2mAuthMiddleware = authMiddlewareFactory({
    allowM2M: true,
    limitToM2M: true,
    requireTeam: false,
  });

  test('M2M JWT: should successfully authenticate M2M JWT token', async () => {
    const req = createRequest({
      headers: {
        authorization: `Bearer ${m2mToken}`,
      },
    });
    const res = createResponse();
    const next = vi.fn();

    await m2mAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  test('M2M JWT: should throw an error for invalid M2M JWT token', async () => {
    const req = createRequest({
      headers: {
        authorization: `Bearer ${'__INVALID__'.repeat(20)}`,
      },
    });
    const res = createResponse();
    const next = vi.fn();

    await m2mAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Access token is invalid or expired'));
  });

  test('API Key: should successfully authenticate API Key', async () => {
    const req = createRequest({
      headers: {
        'x-api-key': config.variables.SMYTH_API_KEY,
      },
    });
    const res = createResponse();
    const next = vi.fn();

    await m2mAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  test('API Key: should throw an error for invalid API Key', async () => {
    const req = createRequest({
      headers: {
        'x-api-key': '__INVALID__'.repeat(20),
      },
    });
    const res = createResponse();
    const next = vi.fn();

    await m2mAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'API Key is invalid'));
  });

  test('User Token: should throw an error for invalid User Token', async () => {
    const req = createRequest({
      headers: {
        authorization: `Bearer __OPAQUE_TOKEN__`,
      },
    });
    const res = createResponse();
    const next = vi.fn();

    await userAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Access token is invalid or expired'));
  });
});
