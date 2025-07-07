import { Router, raw } from 'express';
import asyncHandler from 'express-async-handler';
import * as subsController from '../controllers/subscription.controller';
import { userAuthMiddleware } from '../../auth/middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import * as subsValidations from '../validations/subscription.validation';
import { billingSessionsRateLimit, checkoutSessionsRateLimit } from '../middlewares/rate-limiters.mw';

const router = Router();

router.get('/subscriptions/me', userAuthMiddleware, asyncHandler(subsController.getTeamsSubs));

export { router as subscriptionRouter };
