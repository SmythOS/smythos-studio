import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as userM2MController from '../../controllers/_sysapi/user.controller.m2m';
import { validate } from '../../../../middlewares/validate.middleware';
import * as userValidations from '../../validations/user.validation';
import {} from '../../../auth/middlewares/auth.middleware';

const router = Router();

router.get('/user/:userId', validate(userValidations.getUserM2M), asyncHandler(userM2MController.getUser));
router.get('/user/:userId/settings', validate(userValidations.getSettingsM2M), asyncHandler(userM2MController.getSettings));
router.get(
  '/user/:userId/settings/:settingKey',

  validate(userValidations.getSettingM2M),
  asyncHandler(userM2MController.getSetting),
);
router.put('/user/:userId/settings', validate(userValidations.createSettingM2M), asyncHandler(userM2MController.createSetting));

router.delete(
  '/user/:userId/settings/:settingKey',

  validate(userValidations.deleteSettingM2M),
  asyncHandler(userM2MController.deleteSetting),
);

export { router as _userRouter };
