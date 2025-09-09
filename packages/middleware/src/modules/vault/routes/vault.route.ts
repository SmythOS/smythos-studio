import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { validate } from '../../../middlewares/validate.middleware';
import { userAuthMiddleware } from '../../auth/middlewares/auth.middleware';
import * as vaultController from '../controllers/vault.controller';
import * as vaultValidations from '../validations/vault.validation';

const router = Router();

router.post('/secret',
  userAuthMiddleware,
  validate(vaultValidations.createVaultSecret),
  asyncHandler(vaultController.createVaultSecret),
);

router.get('/:teamId/secrets',
  userAuthMiddleware,
  asyncHandler(vaultController.getAllSecrets),
);

router.get(
  '/:teamId/count/secrets',
  userAuthMiddleware,
  asyncHandler(vaultController.getSecretsCount),
);

router.get('/:teamId/secrets/:secretId',
  userAuthMiddleware,
  asyncHandler(vaultController.getSecretById),
);

router.get('/:teamId/secrets/:secretId/exists',
  userAuthMiddleware,
  asyncHandler(vaultController.checkSecretExistsById),
);

router.get('/:teamId/secrets/name/:secretName',
  userAuthMiddleware,
  asyncHandler(vaultController.getSecretByName),
);

router.get('/:teamId/secrets/name/:secretName/exists',
  userAuthMiddleware,
  asyncHandler(vaultController.checkSecretExistsByName),
);

router.delete('/:teamId/secrets/:secretId',
  userAuthMiddleware,
  asyncHandler(vaultController.deleteSecretById),
);

router.put('/:teamId/secrets/:secretId/metadata',
  userAuthMiddleware,
  validate(vaultValidations.updateSecretMetadata),
  asyncHandler(vaultController.updateSecretMetadata),
);

export { router as vaultRouter };
