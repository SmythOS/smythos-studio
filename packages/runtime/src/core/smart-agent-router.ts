/**
 * Smart Agent Router - Intelligently routes between debugger and agent-runner
 * Based on request characteristics and agent properties
 *
 */

import { Logger } from '@smythos/sre';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const console = Logger('[Smart Agent Router]');

export interface RouterDependencies {
  // Debugger dependencies
  debugger: {
    middlewares: express.RequestHandler[];
    processAgentRequest: (agentId: string, req: express.Request) => Promise<any>;
    getDebugSession: (id: string) => any;
    createSseConnection: (req: any) => string;
  };
  // Agent-runner dependencies
  agentRunner: {
    middlewares: express.RequestHandler[];
    processAgentRequest: (agent: any, req: express.Request) => Promise<any>;
  };
}

/**
 * Determines which service should handle the request based on headers only
 * Simple, header-based routing for predictable behavior
 *
 * ROUTING PRIORITY (highest to lowest):
 * 1. X-FORCE-AGENT-RUNNER: Forces agent-runner (overrides everything)
 * 2. Debug headers: Forces debugger (X-DEBUG-*, X-MONITOR-ID)
 * 3. X-FORCE-DEBUGGER: Forces debugger
 * 4. X-ROUTING-MODE: Explicit mode selection (debugger|agent-runner)
 * 5. Default: agent-runner (production-safe fallback)
 *
 * USAGE EXAMPLES:
 * - Test agent-runner from localhost: Add header "X-FORCE-AGENT-RUNNER: true"
 * - Test debugger from production: Add header "X-FORCE-DEBUGGER: true"
 * - Debug session: Add any X-DEBUG-* header (e.g., "X-DEBUG-RUN: true")
 * - Default behavior: No headers = agent-runner (safe for production)
 */
function shouldUseDebugger(req: any): { useDebugger: boolean; reason: string } {
  // 1. Check for explicit agent-runner header (highest priority)
  const forceAgentRunner = req.header('X-FORCE-AGENT-RUNNER') !== undefined;
  if (forceAgentRunner) {
    return {
      useDebugger: false,
      reason: 'X-FORCE-AGENT-RUNNER header present',
    };
  }

  // 2. Check for debug headers (second highest priority)
  const debugHeaders = ['X-DEBUG-RUN', 'X-DEBUG-READ', 'X-DEBUG-INJ', 'X-DEBUG-STOP', 'X-DEBUG-SKIP', 'X-MONITOR-ID'];

  const hasDebugHeader = debugHeaders.some(header => req.header(header) !== undefined);

  if (hasDebugHeader) {
    return { useDebugger: true, reason: 'Debug headers present' };
  }

  // 3. Check for explicit debugger header
  const forceDebugger = req.header('X-FORCE-DEBUGGER') !== undefined;
  if (forceDebugger) {
    return { useDebugger: true, reason: 'X-FORCE-DEBUGGER header present' };
  }

  // 4. Default routing based on explicit mode header
  const routingMode = req.header('X-ROUTING-MODE');
  if (routingMode === 'debugger') {
    return { useDebugger: true, reason: 'X-ROUTING-MODE: debugger' };
  }
  if (routingMode === 'agent-runner') {
    return { useDebugger: false, reason: 'X-ROUTING-MODE: agent-runner' };
  }

  // 5. Final fallback: Default to agent-runner for production safety
  return {
    useDebugger: false,
    reason: 'Default production-safe routing (no explicit routing headers)',
  };
}

/**
 * Creates a smart router that automatically chooses between debugger and agent-runner
 */
export function createSmartAgentRouter(dependencies: RouterDependencies): express.Router {
  const router = express.Router();

  // Add correlation ID for request tracing
  router.use((req: any, res, next) => {
    if (!req.headers['x-correlation-id']) {
      req.headers['x-correlation-id'] = uuidv4();
    }
    res.setHeader('x-correlation-id', req.headers['x-correlation-id']);
    next();
  });

  // Debugger-specific routes (always use debugger)
  router.get('/agent/:id/debugSession', async (req, res) => {
    try {
      const dbgSession = dependencies.debugger.getDebugSession(req.params.id);
      res.send({ dbgSession });
    } catch (error) {
      console.error('Debug session error:', error);
      res.status(500).json({ error: 'Debug session unavailable' });
    }
  });

  router.get('/agent/:id/monitor', async (req, res) => {
    try {
      const sseId = dependencies.debugger.createSseConnection(req);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.write(`event: init\n`);
      res.write(`data: ${sseId}\n\n`);
    } catch (error) {
      console.error('Monitor error:', error);
      res.status(500).json({ error: 'Monitor unavailable' });
    }
  });

  // Smart middleware that chooses the right service
  const smartMiddleware = async (req: any, res: express.Response) => {
    const correlationId = req.headers['x-correlation-id'];
    const startTime = Date.now();

    try {
      // Step 1: Make routing decision based on headers
      const { useDebugger, reason } = shouldUseDebugger(req);

      // Step 2: Apply service-specific middleware (including upload handlers)
      const serviceMiddlewares = useDebugger ? dependencies.debugger.middlewares : dependencies.agentRunner.middlewares;

      console.debug(`Applying ${serviceMiddlewares.length} ${useDebugger ? 'debugger' : 'agent-runner'} middleware(s)`, {
        correlationId,
        middlewares: serviceMiddlewares.map(mw => mw.name || 'anonymous'),
      });
      await runMiddlewares(req, res, serviceMiddlewares);

      console.log(`Routing decision: ${useDebugger ? 'DEBUGGER' : 'AGENT-RUNNER'} - ${reason}`, {
        correlationId,
        agentId: req._agent?.id,
        path: req.path,
      });

      // Step 3: Process with appropriate service
      let result: any;

      if (useDebugger) {
        result = await dependencies.debugger.processAgentRequest(req._agent.id, req);
      } else {
        result = await dependencies.agentRunner.processAgentRequest(req._agent, req);
      }

      // Step 4: Send response
      const processingTime = Date.now() - startTime;
      console.debug(`Request completed`, {
        correlationId,
        service: useDebugger ? 'debugger' : 'agent-runner',
        status: result?.status || 200,
        processingTime,
      });

      return res.status(result?.status || 200).send(result?.data || result);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Request failed`, {
        correlationId,
        error: error.message,
        processingTime,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Common API routes
  const apiRoutes = [
    { method: 'post', path: '/api/*' },
    { method: 'get', path: '/api/*' },
    { method: 'post', path: '/:version/api/*' },
    { method: 'get', path: '/:version/api/*' },
    { method: 'post', path: /^\/v[0-9]+(\.[0-9]+)?\/api\/(.+)/ },
  ];

  apiRoutes.forEach(({ method, path }) => {
    router[method](path, smartMiddleware);
  });

  return router;
}

/**
 * Helper function to promisify Express middleware
 */
function runMiddleware(req: any, res: express.Response, middleware: express.RequestHandler): Promise<void> {
  return new Promise((resolve, reject) => {
    middleware(req, res, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Helper function to run an array of middlewares sequentially
 */
async function runMiddlewares(req: any, res: express.Response, middlewares: express.RequestHandler[]): Promise<void> {
  for (const middleware of middlewares) {
    await runMiddleware(req, res, middleware);
  }
}

/**
 * Configuration helper for different deployment scenarios
 */
export interface SmartRouterConfig {
  enableDebuggerRoutes?: boolean;
  enableMetrics?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export function createConfiguredSmartRouter(dependencies: RouterDependencies, config: SmartRouterConfig = {}): express.Router {
  const router = createSmartAgentRouter(dependencies);

  // Add health check endpoint
  router.get('/health/smart-router', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Add metrics endpoint if enabled
  if (config.enableMetrics) {
    let requestCount = 0;
    let debuggerCount = 0;
    let agentRunnerCount = 0;

    router.use((req: any, res, next) => {
      requestCount++;

      res.on('finish', () => {
        // This is a simple way to track which service was used
        // In a real implementation, you'd want more sophisticated metrics
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent.includes('debug')) {
          debuggerCount++;
        } else {
          agentRunnerCount++;
        }
      });

      next();
    });

    router.get('/metrics/smart-router', (req, res) => {
      res.json({
        totalRequests: requestCount,
        debuggerRequests: debuggerCount,
        agentRunnerRequests: agentRunnerCount,
        timestamp: new Date().toISOString(),
      });
    });
  }

  return router;
}

/**
 * Utility function to test routing decisions without making actual requests
 * Useful for debugging and testing the routing logic
 */
export function testRoutingDecision(headers: Record<string, string> = {}): {
  useDebugger: boolean;
  reason: string;
} {
  const mockReq = {
    header: (name: string) => headers[name],
  };

  return shouldUseDebugger(mockReq);
}

/**
 * Helper function to create common header combinations for testing
 */
export const RoutingHeaders = {
  // Force agent-runner (highest priority)
  FORCE_AGENT_RUNNER: { 'X-FORCE-AGENT-RUNNER': 'true' },

  // Force debugger
  FORCE_DEBUGGER: { 'X-FORCE-DEBUGGER': 'true' },

  // Debug session headers
  DEBUG_RUN: { 'X-DEBUG-RUN': 'true' },
  DEBUG_STOP: { 'X-DEBUG-STOP': 'true' },
  DEBUG_READ: { 'X-DEBUG-READ': 'true' },
  DEBUG_INJ: { 'X-DEBUG-INJ': 'true' },
  DEBUG_SKIP: { 'X-DEBUG-SKIP': 'true' },
  MONITOR: { 'X-MONITOR-ID': 'test-monitor' },

  // Explicit routing mode
  MODE_DEBUGGER: { 'X-ROUTING-MODE': 'debugger' },
  MODE_AGENT_RUNNER: { 'X-ROUTING-MODE': 'agent-runner' },

  // No headers (default behavior)
  NONE: {},
};
