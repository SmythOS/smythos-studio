import { Router } from 'express';
import asyncHandler from 'express-async-handler';

import * as embodimentController from '../../controllers/_sysapi/embodiment.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import * as embodimentValidations from '../../validations/embodiment.validation';

const router = Router();

router.get('/embodiments', validate(embodimentValidations.getEmbodimentsByAgentId), asyncHandler(embodimentController.getEmbodimentsByAgentId));

export { router as _embodimentRouter };
