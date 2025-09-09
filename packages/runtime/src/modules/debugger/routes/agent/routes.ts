import { createDebuggerRouter } from '@core/shared-agent-router';
import agentLoader from '@debugger/middlewares/agentLoader.mw';
import { createSseConnection, getDebugSession, processAgentRequest } from '@debugger/services/agent-request-handler';

const middlewares = [agentLoader];

const router = createDebuggerRouter(middlewares, processAgentRequest, {
  getDebugSession,
  createSseConnection,
});

export default router;
