import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as teamController from '../controllers/team.controller';
import { validate } from '../../../middlewares/validate.middleware';
import * as teamsValidations from '../validations/team.validation';
import { authMiddlewareFactory, userAuthMiddleware } from '../../auth/middlewares/auth.middleware';
import { requireTeamManager } from '../middlewares/teams.middleware';

const router = Router();

// TODO: move the `requireTeamManager` middleware check into the service layer

router.get('/teams/me', userAuthMiddleware, asyncHandler(teamController.getTeamInfo));

router.get('/teams/members', userAuthMiddleware, asyncHandler(teamController.getMembers));

router.put(
  '/teams/members/:memberId/role',
  userAuthMiddleware,
  validate(teamsValidations.updateMemberRole),
  asyncHandler(teamController.updateMemberRole),
);

router.get('/teams/roles/me', userAuthMiddleware, asyncHandler(teamController.getMyRoles));

router.get('/teams/roles', [userAuthMiddleware, requireTeamManager], asyncHandler(teamController.getTeamRoles));

router.get('/teams/settings', [userAuthMiddleware], asyncHandler(teamController.getSettings));
router.get('/teams/settings/:settingKey', [userAuthMiddleware], validate(teamsValidations.getSetting), asyncHandler(teamController.getSetting));
router.put('/teams/settings', [userAuthMiddleware], validate(teamsValidations.createSetting), asyncHandler(teamController.createSetting));

router.delete(
  '/teams/settings/:settingKey',
  [userAuthMiddleware],
  validate(teamsValidations.deleteSetting),
  asyncHandler(teamController.deleteSetting),
);

router.get('/teams/me/all/:id', userAuthMiddleware, asyncHandler(teamController.getAllTeams));
export { router as teamRouter };
