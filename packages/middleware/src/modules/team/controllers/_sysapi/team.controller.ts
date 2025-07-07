// TEAM SETTINGS

import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../../types';
import { teamService, teamSettingsService } from '../../services';

export const getSettings: ExpressHandlerWithParams<
  {
    teamId: string;
  },
  {},
  {
    settings: any[];
  }
> = async (req, res) => {
  const teamId = req.params.teamId;
  const settings = await teamSettingsService.getSettings(teamId);
  return res.json({
    message: 'Settings retrieved successfully',
    settings,
  });
};

export const getSetting: ExpressHandlerWithParams<
  {
    settingKey: string;
    teamId: string;
  },
  {},
  {
    setting: any;
  }
> = async (req, res) => {
  const teamId = req.params.teamId;
  const { settingKey } = req.params;
  const setting = await teamSettingsService.getSetting(teamId, settingKey);
  res.json({
    message: 'Setting retrieved successfully',
    setting,
  });
};

export const getTeamInfo: ExpressHandler<
  {},
  {
    team: any;
  }
> = async (req, res) => {
  const teamId = req.params.teamId;
  const team = await teamService.getTeamDetailsM2M(teamId);

  res.status(httpStatus.OK).json({
    message: 'Team retrieved successfully',
    team,
  });
};

export const getTeamsM2M: ExpressHandlerWithParams<
  {},
  {},
  {
    teams: any[];
    total: number;
  }
> = async (req, res) => {
  const { page, limit, email } = req.query;
  const { teams, count } = await teamService.listTeamsM2M({
    pagination: {
      page,
      limit,
    },
    emailSearchTerm: email,
  });

  res.status(httpStatus.OK).json({
    message: 'Teams retrieved successfully',
    teams,
    total: count,
  });
};

export const createSettingM2M: ExpressHandlerWithParams<
  { teamId: string },
  {
    settingKey: string;
    settingValue: string;
  },
  {
    setting: any;
  }
> = async (req, res) => {
  const { settingKey, settingValue } = req.body;
  const { teamId } = req.params;
  const newSetting = await teamSettingsService.createSetting(teamId, settingKey, settingValue);
  res.json({
    message: 'Setting updated successfully',
    setting: newSetting,
  });
};

export const deleteSettingM2M: ExpressHandlerWithParams<
  {
    settingKey: string;
    teamId: string;
  },
  {},
  {}
> = async (req, res) => {
  const { settingKey, teamId } = req.params;
  const deletedSetting = await teamSettingsService.deleteSetting(teamId, settingKey);
  res.json({
    message: 'Setting deleted successfully',
  });
};
