import agentLoader from "@agent-runner/middlewares/agentLoader.mw";
import { processAgentRequest } from "@agent-runner/services/agent-request-handler";

import { uploadHandler } from "@core/middlewares/uploadHandler.mw";
import { createAgentRunnerRouter } from "@core/shared-agent-router";

/* agentLoader must come before agentAuth because agentAuth relies on req._agent, set by agentLoader.
Also, uploadHandler should precede agentLoader to parse multipart/form-data correctly */
const middlewares = [uploadHandler, agentLoader];

const router = createAgentRunnerRouter(middlewares, processAgentRequest);

export default router;
