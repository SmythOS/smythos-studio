import { Router } from 'express';
import asyncHandler from 'express-async-handler';

import { validate } from '../../../../middlewares/validate.middleware';
import * as aiAgentsController from '../../controllers/_sysapi/ai-agent.controller';
import * as aiAgentValidations from '../../validations/ai-agent.validation';

const router = Router();

router.get('/ai-agent/:agentId', validate(aiAgentValidations.getAgentByIdM2M), asyncHandler(aiAgentsController.getAgentById));

// get agent by endpoint (domain, method, endpointPath)

router.get('/ai-agent', validate(aiAgentValidations.getAgentByDomain), asyncHandler(aiAgentsController.getAgentByDomain));

// AGENT DEPLOYMENT
router.get('/ai-agent/:agentId/deployments', validate(aiAgentValidations.getDeploymentsByAgentId), asyncHandler(aiAgentsController.getDeployments));

router.get('/ai-agent/deployments/:deploymentId', validate(aiAgentValidations.getDeployment), asyncHandler(aiAgentsController.getDeploymentById));

// get deployment by major and minor version
router.get(
  '/ai-agent/:agentId/deployments/:majorVersion/:minorVersion',
  validate(aiAgentValidations.getDeploymentByMajorMinorVersion),
  asyncHandler(aiAgentsController.getDeploymentByMajorMinorVersion),
);

// AGENT STATE

router.get('/ai-agent/:agentId/states', asyncHandler(aiAgentsController.getStates));
router.get('/ai-agent/:agentId/states/:key', validate(aiAgentValidations.getState), asyncHandler(aiAgentsController.getState));
router.put('/ai-agent/:agentId/states', validate(aiAgentValidations.createState), asyncHandler(aiAgentsController.createState));

router.delete('/ai-agent/:agentId/states/:key', validate(aiAgentValidations.deleteState), asyncHandler(aiAgentsController.deleteState));

// AGENT SETTINGS
router.get('/ai-agent/:agentId/settings', asyncHandler(aiAgentsController.getAgentSettings));

// #region Agent Conversations

router.get('/chats', validate(aiAgentValidations.getConversationsM2M), asyncHandler(aiAgentsController.getConversations));
router.post('/chats', validate(aiAgentValidations.createConversationM2M), asyncHandler(aiAgentsController.createConversation));
router.put('/chats/:conversationId', validate(aiAgentValidations.updateConversationM2M), asyncHandler(aiAgentsController.updateConversation));
router.delete('/chats/:conversationId', validate(aiAgentValidations.deleteConversationM2M), asyncHandler(aiAgentsController.deleteConversation));
router.get('/chats/:conversationId', validate(aiAgentValidations.getConversationByIdM2M), asyncHandler(aiAgentsController.getConversationById));

// #endregion

// Add this new route near other agent listing routes
router.get('/ai-agent/teams/:teamId', validate(aiAgentValidations.getTeamAgents), asyncHandler(aiAgentsController.getTeamAgents));

export { router as _aiAgentRouter };
