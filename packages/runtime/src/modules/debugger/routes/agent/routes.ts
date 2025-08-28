import { uploadHandler } from "@core/middlewares/uploadHandler.mw";
import { createDebuggerRouter } from "@core/shared-agent-router";
import agentLoader from "@debugger/middlewares/agentLoader.mw";
import {
  createSseConnection,
  getDebugSession,
  processAgentRequest,
} from "@debugger/services/agent-request-handler";

/* uploadHandler should precede agentLoader to parse multipart/form-data correctly */
const middlewares = [uploadHandler, agentLoader];

const router = createDebuggerRouter(middlewares, processAgentRequest, {
  getDebugSession,
  createSseConnection,
});

export default router;
