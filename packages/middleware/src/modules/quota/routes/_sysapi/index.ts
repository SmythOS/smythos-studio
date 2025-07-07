import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as quotaM2MController from '../../controllers/_sysapi';
import { validate } from '../../../../middlewares/validate.middleware';
import * as quotaValidations from '../../validations/quota.validations';

const router = Router();

router.get(
  '/quota/agent/:agentId/tasks/subscription',
  validate(quotaValidations.getAgentTasksUsageByIdM2M),
  asyncHandler(quotaM2MController.getAgentTasksUsageByIdM2M),
);
router.get(
  '/quota/agent/:agentId/tasks/monthly',
  validate(quotaValidations.getAgentTasksUsageWithinM2M),
  asyncHandler(quotaM2MController.getAgentTasksUsageWithinM2M),
);

router.get(
  '/quota/team/:teamId/tasks/subscription',
  validate(quotaValidations.getTeamTasksUsageByIdM2M),
  asyncHandler(quotaM2MController.getTeamTasksUsageByIdM2M),
);
router.get(
  '/quota/team/:teamId/tasks/monthly',
  validate(quotaValidations.getTeamTasksUsageWithinM2M),
  asyncHandler(quotaM2MController.getTeamTasksUsageWithinM2M),
);

router.put(
  '/quota/agent/:agentId/tasks',
  validate(quotaValidations.consumeTeamTasksByAgentIdM2M),
  asyncHandler(quotaM2MController.consumeTeamTasksByAgentIdM2M),
);

router.post(
  '/quota/team/:teamId/agent/:agentId/track-usage',
  validate(quotaValidations.trackLLMTokensAndApiRequestsUsage),
  asyncHandler(quotaM2MController.trackLLMTokensAndApiRequestsUsage),
);

router.get(
  '/quota/team/:teamId/current-cycle/usage',
  validate(quotaValidations.getTotalUsageForBillingCycleM2M),
  asyncHandler(quotaM2MController.getTotalUsageForBillingCycle),
);
export { router as _quotaRouter };
