import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as userController from '../controllers/user.controller';
import { validate } from '../../../middlewares/validate.middleware';
import * as userValidations from '../validations/user.validation';
import { userAuthMiddleware } from '../../auth/middlewares/auth.middleware';

const router = Router();

// settings

router.get('/me', userAuthMiddleware, asyncHandler(userController.getUserInfo));

router.get('/settings', userAuthMiddleware, asyncHandler(userController.getSettings));
router.get('/settings/:settingKey', userAuthMiddleware, validate(userValidations.getSetting), asyncHandler(userController.getSetting));
router.put('/settings', userAuthMiddleware, validate(userValidations.createSetting), asyncHandler(userController.createSetting));

router.delete('/settings/:settingKey', userAuthMiddleware, validate(userValidations.deleteSetting), asyncHandler(userController.deleteSetting));

export { router as userRouter };
