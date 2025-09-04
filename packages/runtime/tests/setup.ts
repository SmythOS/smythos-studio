import { vi } from 'vitest';
/**
 * Test setup and utilities following KISS principle
 */

// Simple test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '5053';
process.env.SESSION_SECRET = 'test-secret';
process.env.LOGTO_M2M_APP_ID = 'test-app-id';
process.env.LOGTO_M2M_APP_SECRET = 'test-secret';
process.env.LOGTO_SERVER = 'https://test-auth.example.com';
process.env.LOGTO_API_RESOURCE = 'https://test-api.example.com';
process.env.MIDDLEWARE_API_BASE_URL = 'https://test-middleware.example.com';

// Simple mock factories
export const createMockRequest = (overrides = {}) => ({
  headers: {},
  header: vi.fn(() => undefined),
  path: '/api/test',
  hostname: 'localhost',
  socket: { on: vi.fn() },
  ...overrides,
});

export const createMockResponse = () => ({
  status: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn().mockReturnThis(),
  locals: {},
});

export const createMockNext = () => vi.fn();

export const createMockAgent = (overrides = {}) => ({
  id: 'test-agent-id',
  ...overrides,
});
