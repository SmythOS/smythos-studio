import { vi } from 'vitest';
/**
 * Simple SRE library mocks
 */

// Mock SRE exports - simple and focused
vi.mock('@smythos/sre', () => ({
  Logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),

  AgentProcess: {
    load: vi.fn(() => ({
      run: vi.fn().mockResolvedValue({ data: { result: 'success' } }),
    })),
  },

  ConnectorService: {
    getCacheConnector: vi.fn(() => ({
      user: vi.fn(() => ({
        set: vi.fn().mockResolvedValue(true),
      })),
    })),
    getModelsProviderConnector: vi.fn(() => ({
      requester: vi.fn(() => ({
        getModels: vi.fn().mockResolvedValue({
          'gpt-4': { name: 'GPT-4' },
        }),
        getCustomModels: vi.fn().mockResolvedValue({}),
      })),
    })),
  },

  AccessCandidate: {
    user: vi.fn(id => ({ type: 'user', id })),
    team: vi.fn(id => ({ type: 'team', id })),
  },

  version: '1.0.0-test',
}));
