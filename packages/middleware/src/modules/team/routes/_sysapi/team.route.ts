import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as teamM2MController from '../../controllers/_sysapi/team.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import * as teamsValidations from '../../validations/team.validation';

const router = Router();

router.get('/teams/:teamId', validate(teamsValidations.getTeamInfoM2M), asyncHandler(teamM2MController.getTeamInfo));

router.get('/teams', validate(teamsValidations.getTeamsM2M), asyncHandler(teamM2MController.getTeamsM2M));

router.get('/teams/:teamId/settings', validate(teamsValidations.getSettingsM2M), asyncHandler(teamM2MController.getSettings));
router.get('/teams/:teamId/settings/:settingKey', validate(teamsValidations.getSettingM2M), asyncHandler(teamM2MController.getSetting));

router.put('/teams/:teamId/settings', validate(teamsValidations.createSettingM2M), asyncHandler(teamM2MController.createSettingM2M));

router.delete(
  '/teams/:teamId/settings/:settingKey',

  validate(teamsValidations.deleteSettingM2M),
  asyncHandler(teamM2MController.deleteSettingM2M),
);

export { router as _teamRouter };
