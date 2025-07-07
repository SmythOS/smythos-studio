import { Router, raw } from 'express';
import asyncHandler from 'express-async-handler';
import { userAuthMiddleware } from '../../auth/middlewares/auth.middleware';
import * as quotaController from '../controllers/quota.controller';
import * as quotaValidations from '../validations/quota.validations';
import { validate } from '../../../middlewares/validate.middleware';

const router = Router();

router.get('/quota/usage/features', userAuthMiddleware, asyncHandler(quotaController.getFeaturesUsage));
router.get('/quota/usage', userAuthMiddleware, asyncHandler(quotaController.getTeamSubsUsage));

export { router as quotaRouter };
