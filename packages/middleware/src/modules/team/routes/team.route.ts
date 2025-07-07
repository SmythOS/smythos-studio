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
router.put('/teams/:teamId/name', userAuthMiddleware, asyncHandler(teamController.renameTeam)); //* team manager check inside service layer

// router.post('/teams/me/leave', userAuthMiddleware, asyncHandler(teamController.leaveTeam));

// router.delete('/teams', userAuthMiddleware, asyncHandler(teamController.deleteTeam));

router.get('/teams/members', userAuthMiddleware, asyncHandler(teamController.getMembers));
router.delete('/teams/members/:memberId', userAuthMiddleware, validate(teamsValidations.deleteMember), asyncHandler(teamController.deleteMember));

// sub-team operations
router.post('/teams/subteams', userAuthMiddleware, asyncHandler(teamController.createSubteam));
router.delete('/teams/subteams/:subteamId', userAuthMiddleware, asyncHandler(teamController.deleteSubteam));

router.put(
  '/teams/:subteamId/members/assign/:memberId',
  [userAuthMiddleware, validate(teamsValidations.assignMemberToSubteam)],
  asyncHandler(teamController.assignMemberToSubteam),
);
router.put(
  '/teams/:subteamId/members/reassign/:memberId',
  [userAuthMiddleware, validate(teamsValidations.assignMemberToSubteam)],
  asyncHandler(teamController.reAssignMemberToSubteam),
);
router.delete(
  '/teams/:subteamId/members/unassign/:memberId',
  [userAuthMiddleware, validate(teamsValidations.unassignMemberFromSubteam)],
  asyncHandler(teamController.unassignMemberFromSubteam),
);

router.put(
  '/teams/members/:memberId/role',
  userAuthMiddleware,
  validate(teamsValidations.updateMemberRole),
  asyncHandler(teamController.updateMemberRole),
);

router.get('/teams/roles/me', userAuthMiddleware, asyncHandler(teamController.getMyRoles));

router.get('/teams/roles', [userAuthMiddleware, requireTeamManager], asyncHandler(teamController.getTeamRoles));

router.get('/teams/roles/:roleId', userAuthMiddleware, asyncHandler(teamController.getTeamRole));

router.delete('/teams/roles/:roleId', [userAuthMiddleware, requireTeamManager], asyncHandler(teamController.deleteTeamRole));

router.post(
  '/teams/roles',
  [userAuthMiddleware, requireTeamManager],
  validate(teamsValidations.postTeamRole),
  asyncHandler(teamController.createTeamRole),
);

router.put(
  '/teams/roles',
  [userAuthMiddleware, requireTeamManager],
  validate(teamsValidations.putTeamRole),
  asyncHandler(teamController.updateTeamRole),
);

// team invitations
router.post('/teams/invitations', [userAuthMiddleware], validate(teamsValidations.postTeamInvitation), asyncHandler(teamController.createTeamInvite));
router.post(
  '/teams/invitations/with-subteam',
  [userAuthMiddleware],
  validate(teamsValidations.postTeamWithSubteamInvitation),
  asyncHandler(teamController.createTeamWithSubteamInvite),
);
router.post(
  '/teams/share-agent',
  [userAuthMiddleware],
  validate(teamsValidations.postTeamShareAgentInvitation),
  asyncHandler(teamController.createTeamShareAgentInvite),
);

router.get('/teams/invitations', [userAuthMiddleware], asyncHandler(teamController.listTeamInvites));

router.delete(
  '/teams/invitations/:invitationId',
  [userAuthMiddleware],
  validate(teamsValidations.deleteTeamInvitation),
  asyncHandler(teamController.deleteTeamInvite),
);

// accept team invitation
router.post(
  '/teams/invitations/:invitationId/accept',
  authMiddlewareFactory({
    requireTeam: false,
  }),
  validate(teamsValidations.acceptTeamInvitation),
  asyncHandler(teamController.acceptTeamInvite),
);

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
