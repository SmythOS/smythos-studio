/**
 * Error middleware tests - KISS approach
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockResponse, createMockNext } from '../../setup';

vi.mock('@smythos/sre', () => ({
  Logger: vi.fn(() => ({ error: vi.fn() })),
}));

vi.mock('@core/config', () => ({
  default: { env: { NODE_ENV: 'test' } },
}));

describe('Error Middleware', () => {
  let errorHandler: any;
  let notFoundHandler: any;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('@core/middlewares/error.mw');
    errorHandler = module.errorHandler;
    notFoundHandler = module.notFoundHandler;
  });

  describe('errorHandler', () => {
    it('handles operational errors', () => {
      const mockReq = createMockRequest({
        method: 'GET',
        path: '/api/test',
        ip: '127.0.0.1',
        get: vi.fn(() => 'test-user-agent'),
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const error = new Error('Test error');
      (error as any).statusCode = 400;
      (error as any).isOperational = true;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        code: 400,
        message: 'Test error',
      });
    });

    it('defaults to 500 for non-operational errors', () => {
      const mockReq = createMockRequest({
        method: 'GET',
        path: '/api/test',
        ip: '127.0.0.1',
        get: vi.fn(() => 'test-user-agent'),
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const error = new Error('Programming error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        code: 500,
        message: 'Internal Server Error',
      });
    });
  });

  describe('notFoundHandler', () => {
    it('creates 404 error', () => {
      const mockReq = createMockRequest({ method: 'GET', path: '/missing' });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Path not found: GET /missing',
          statusCode: 404,
          isOperational: true,
        }),
      );
    });
  });
});
