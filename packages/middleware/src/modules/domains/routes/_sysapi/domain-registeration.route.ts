import { Router } from 'express';
import asyncHandler from 'express-async-handler';

import * as domainController from '../../controllers/_sysapi/domain-registeration.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import * as domainValidations from '../../validations/domain-registeration.validation';

const router = Router();

router.post('/domain/query', validate(domainValidations.queryDomain), asyncHandler(domainController.queryDomain));

router.get('/domains', validate(domainValidations.getDomainsM2M), asyncHandler(domainController.getDomains));

export { router as _domainRouter };
