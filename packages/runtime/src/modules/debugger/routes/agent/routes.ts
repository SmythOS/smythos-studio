import { createDebuggerRouter } from "@core/shared-agent-router";
import agentLoader from "@debugger/middlewares/agentLoader.mw";
import {
  createSseConnection,
  getDebugSession,
  processAgentRequest,
} from "@debugger/services/agent-request-handler";

const router = createDebuggerRouter(agentLoader, processAgentRequest, {
  getDebugSession,
  createSseConnection,
});

export default router;
