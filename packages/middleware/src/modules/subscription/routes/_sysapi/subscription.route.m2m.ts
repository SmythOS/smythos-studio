import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { validate } from '../../../../middlewares/validate.middleware';
import * as subsValidations from '../../validations/subscription.validation';
import * as subsController from '../../controllers/_sysapi/subscription.controller.m2m';

const router = Router();

router.get('/subscriptions/teams/:teamId', validate(subsValidations.getTeamSubs), asyncHandler(subsController.getTeamSubs));

export { router as _subscriptionRouter };
