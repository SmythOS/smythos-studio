/**
 * Simple agent service tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockAgent } from '../setup';
import '../mocks/sre.mock';

describe('Agent Services', () => {
  describe('processAgentRequest', () => {
    let processAgentRequest: any;

    beforeEach(async () => {
      vi.resetModules();
      const module = await import('@agent-runner/services/agent-request-handler');
      processAgentRequest = module.processAgentRequest;
    });

    it('returns 404 for missing agent', async () => {
      const result = await processAgentRequest(null, createMockRequest());
      expect(result).toEqual({ status: 404, data: 'Agent not found' });
    });

    it('blocks debug headers', async () => {
      const agent = createMockAgent();
      const req = createMockRequest({
        header: vi.fn(name => (name === 'X-DEBUG-RUN' ? 'true' : undefined)),
        socket: { on: vi.fn() },
      });

      const result = await processAgentRequest(agent, req);
      expect(result).toEqual({ status: 403, data: 'Debug functions are not supported' });
    });

    it('rejects invalid paths', async () => {
      const agent = createMockAgent();
      const req = createMockRequest({
        path: '/invalid',
        socket: { on: vi.fn() },
      });

      const result = await processAgentRequest(agent, req);
      expect(result.status).toBe(404);
    });

    it('processes valid requests', async () => {
      const agent = createMockAgent();
      const req = createMockRequest({
        path: '/api/test',
        socket: { on: vi.fn() },
        _agent: agent,
      });

      const result = await processAgentRequest(agent, req);
      expect(result).toEqual({ status: 200, data: { result: 'success' } });
    });
  });
});
