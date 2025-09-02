import { Router } from 'express';
import asyncHandler from 'express-async-handler';

import { validate } from '../../../middlewares/validate.middleware';
import { authMiddlewareFactory, userAuthMiddleware } from '../../auth/middlewares/auth.middleware';
import * as domainController from '../controllers/domain-registeration.controller';
import * as domainValidations from '../validations/domain-registeration.validation';

const router = Router();

router.post('/domain', userAuthMiddleware, validate(domainValidations.postDomain), asyncHandler(domainController.postDomain));

router.put('/domain', userAuthMiddleware, validate(domainValidations.putUpdateDomain), asyncHandler(domainController.putUpdateDomain));
router.get('/domains', userAuthMiddleware, asyncHandler(domainController.getDomains));

router.post(
  '/domain/query',
  authMiddlewareFactory({
    allowM2M: true,
  }),
  validate(domainValidations.queryDomain),
  asyncHandler(domainController.queryDomain),
);
router.post('/domain/delete', userAuthMiddleware, validate(domainValidations.deleteDomain), asyncHandler(domainController.deleteDomain));

export { router as domainRouter };
