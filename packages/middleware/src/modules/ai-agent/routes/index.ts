import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { validate } from '../../../middlewares/validate.middleware';
import { userAuthMiddleware } from '../../auth/middlewares/auth.middleware';
import * as aiAgentsController from '../controllers/ai-agent.controller';
import * as aiAgentValidations from '../validations/ai-agent.validation';

const router = Router();

router.get('/ai-agents/models', userAuthMiddleware, asyncHandler(aiAgentsController.getModelAgents));

router.get('/ai-agents', userAuthMiddleware, asyncHandler(aiAgentsController.getAiAgents));

router.delete('/ai-agent/:agentId', validate(aiAgentValidations.deleteAgent), userAuthMiddleware, asyncHandler(aiAgentsController.deleteAgent));

router.post('/ai-agent', [validate(aiAgentValidations.postSaveAgent), userAuthMiddleware], asyncHandler(aiAgentsController.postSaveAgent));

router.get('/ai-agent/:agentId', userAuthMiddleware, validate(aiAgentValidations.getAgentById), asyncHandler(aiAgentsController.getAgentById));

// AGENT LOCKING

router.put('/ai-agent/lock', userAuthMiddleware, validate(aiAgentValidations.accquireAgentLock), asyncHandler(aiAgentsController.accquireAgentLock));

router.put(
  '/ai-agent/lock/release',
  userAuthMiddleware,
  validate(aiAgentValidations.releaseAgentLock),
  asyncHandler(aiAgentsController.releaseAgentLock),
);

router.put(
  '/ai-agent/lock/refresh',
  userAuthMiddleware,
  validate(aiAgentValidations.sendAgentLockBeat),
  asyncHandler(aiAgentsController.sendAgentLockBeat),
);

router.get(
  '/ai-agent/:agentId/lock-status',
  userAuthMiddleware,
  validate(aiAgentValidations.getAgentLockStatus),
  asyncHandler(aiAgentsController.getAgentLockStatus),
);

// AGENT DEPLOYMENT

router.get(
  '/ai-agent/:agentId/deployments',
  userAuthMiddleware,
  validate(aiAgentValidations.getDeploymentsByAgentId),
  asyncHandler(aiAgentsController.getDeployments),
);
router.get(
  '/ai-agent/:agentId/deployments/latest',
  userAuthMiddleware,
  validate(aiAgentValidations.getLatestDeployment),
  asyncHandler(aiAgentsController.getLatestDeployment),
);

router.get(
  '/ai-agent/deployments/:deploymentId',
  userAuthMiddleware,
  validate(aiAgentValidations.getDeployment),
  asyncHandler(aiAgentsController.getDeploymentById),
);

router.post(
  '/ai-agent/deployments',
  [userAuthMiddleware, validate(aiAgentValidations.postDeployment)],
  asyncHandler(aiAgentsController.createDeployment),
);

// AGENT settings
router.get('/ai-agent/:agentId/settings', userAuthMiddleware, asyncHandler(aiAgentsController.getAgentSettings));
router.get('/ai-agent/:agentId/settings/:key', userAuthMiddleware, asyncHandler(aiAgentsController.getAgentSetting));
router.put(
  '/ai-agent/:agentId/settings',
  userAuthMiddleware,
  validate(aiAgentValidations.createAgentSetting),
  asyncHandler(aiAgentsController.createAgentSetting),
);

router.delete('/ai-agent/:agentId/settings/:key', userAuthMiddleware, asyncHandler(aiAgentsController.deleteAgentSetting));

// #region Agent Conversations

router.get('/chats', userAuthMiddleware, validate(aiAgentValidations.getTeamConversations), asyncHandler(aiAgentsController.getTeamConversations));
router.get('/chats/me', userAuthMiddleware, validate(aiAgentValidations.getMyConversations), asyncHandler(aiAgentsController.getMyConversations));

router.post(
  '/chats',
  userAuthMiddleware,
  validate(aiAgentValidations.createTeamConversation),
  asyncHandler(aiAgentsController.createTeamConversation),
);
router.put(
  '/chats/:conversationId',
  userAuthMiddleware,
  validate(aiAgentValidations.updateTeamConversation),
  asyncHandler(aiAgentsController.updateTeamConversation),
);
router.get(
  '/chats/:conversationId',
  userAuthMiddleware,
  validate(aiAgentValidations.getTeamConversationById),
  asyncHandler(aiAgentsController.getTeamConversationById),
);
router.delete(
  '/chats/:conversationId',
  userAuthMiddleware,
  validate(aiAgentValidations.deleteTeamConversation),
  asyncHandler(aiAgentsController.deleteTeamConversation),
);

// #endregion

export { router as aiAgentRouter };
