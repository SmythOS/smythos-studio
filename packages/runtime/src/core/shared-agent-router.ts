import { Logger } from '@smythos/sre';
import express from 'express';

export interface AgentRouterConfig {
  mode: 'debugger' | 'agent-runner';
  middlewares: express.RequestHandler[];
  processAgentRequest: (agentOrId: any, req: express.Request) => Promise<any>;
  additionalRoutes?: (router: express.Router) => void;
  loggerPrefix?: string;
}

/**
 * Creates a shared agent router that can be configured for both debugger and agent-runner modes
 * This allows code reuse while maintaining the ability to extract servers separately
 */
export function createAgentRouter(config: AgentRouterConfig): express.Router {
  const console = Logger(config.loggerPrefix || '[Shared] Router: Agent');
  const router = express.Router();

  // Add any additional routes specific to the mode (e.g., debugger's /debugSession and /monitor)
  if (config.additionalRoutes) {
    config.additionalRoutes(router);
  }

  // Common API routes with configurable middleware and processing
  const apiRoutes = [
    { method: 'post', path: '/api/*' },
    { method: 'get', path: '/api/*' },
    { method: 'post', path: '/:version/api/*' },
    { method: 'get', path: '/:version/api/*' },
    { method: 'post', path: /^\/v[0-9]+(\.[0-9]+)?\/api\/(.+)/ },
  ];

  apiRoutes.forEach(({ method, path }) => {
    router[method](path, config.middlewares, async (req: any, res) => {
      try {
        const agent = req._agent;
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }

        // Handle different function signatures based on mode
        let result: any;
        if (config.mode === 'debugger') {
          // Debugger mode: pass agent.id as first parameter
          result = await config.processAgentRequest(agent.id, req);
        } else {
          // Agent-runner mode: pass agent object as first parameter
          result = await config.processAgentRequest(agent, req);
        }

        return res.status(result?.status || 500).send(result?.data);
      } catch (error) {
        console.error('Error processing agent request:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  });

  return router;
}

/**
 * Factory function to create debugger-specific router
 */
export function createDebuggerRouter(
  middlewares: express.RequestHandler[],
  processAgentRequest: (agentId: string, req: express.Request) => Promise<any>,
  additionalServices?: {
    getDebugSession: (id: string) => any;
    createSseConnection: (req: any) => string;
  },
): express.Router {
  return createAgentRouter({
    mode: 'debugger',
    middlewares,
    processAgentRequest,
    loggerPrefix: '[Debugger] Router: Agent',
    additionalRoutes: router => {
      // Additional routes are now mounted directly in router-config.ts

      if (additionalServices) {
        // Debug session route
        router.get('/agent/:id/debugSession', (req, res) => {
          console.log(
            `Getting debug session for agent ${req.params.id} with client IP ${req.headers['x-forwarded-for']} - ${req.socket.remoteAddress}. x-hash-id ${req.headers['x-hash-id']}`,
          );
          const dbgSession = additionalServices.getDebugSession(req.params.id);
          res.send({ dbgSession });
        });

        // Monitor route (SSE)
        router.get('/agent/:id/monitor', (req, res) => {
          const sseId = additionalServices.createSseConnection(req);

          // Set headers for SSE
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          // Send the unique ID as the first event
          res.write(`event: init\n`);
          res.write(`data: ${sseId}\n\n`);
        });
      }
    },
  });
}

/**
 * Factory function to create agent-runner-specific router
 */
export function createAgentRunnerRouter(
  middlewares: express.RequestHandler[],
  processAgentRequest: (agent: any, req: express.Request) => Promise<any>,
): express.Router {
  return createAgentRouter({
    mode: 'agent-runner',
    middlewares,
    processAgentRequest,
    loggerPrefix: '(Agent Runner) Router: Agent',
    additionalRoutes: router => {
      // Additional routes are now mounted directly in router-config.ts
    },
  });
}
