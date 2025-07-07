import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as embodimentValidations from '../validations/embodiment.validation';
import { validate } from '../../../middlewares/validate.middleware';
import * as embodimentController from '../controllers/embodiment.controller';
import { userAuthMiddleware } from '../../auth/middlewares/auth.middleware';

const router = Router();

router.post(
  '/embodiments',
  [userAuthMiddleware, validate(embodimentValidations.postEmbodiment)],
  asyncHandler(embodimentController.createEmbodiment),
);

router.get(
  '/embodiments',
  [userAuthMiddleware],
  validate(embodimentValidations.getEmbodimentsByAgentId),
  asyncHandler(embodimentController.getEmbodiments),
);

router.get(
  '/embodiments/:embodimentId',
  [userAuthMiddleware, validate(embodimentValidations.getEmbodiment)],
  asyncHandler(embodimentController.getEmbodiment),
);

router.put(
  '/embodiments',
  [userAuthMiddleware, validate(embodimentValidations.updateEmbodiment)],
  asyncHandler(embodimentController.updateEmbodiment),
);

router.delete(
  '/embodiments/:embodimentId',
  [userAuthMiddleware, validate(embodimentValidations.deleteEmbodiment)],
  asyncHandler(embodimentController.deleteEmbodiment),
);

export { router as embodimentRouter };
