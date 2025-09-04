import agentLoader from '@agent-runner/middlewares/agentLoader.mw';
import { processAgentRequest } from '@agent-runner/services/agent-request-handler';

import { createAgentRunnerRouter } from '@core/shared-agent-router';

const middlewares = [agentLoader];

const router = createAgentRunnerRouter(middlewares, processAgentRequest);

export default router;
