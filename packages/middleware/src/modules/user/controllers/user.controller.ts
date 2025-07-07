import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../types';
import ApiError from '../../../utils/apiError';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';
import { userSettingsService, userService } from '../services';
import { UserSetting } from '@prisma/client';

export const getUserInfo: ExpressHandler<
  {},
  {
    user: any;
  }
> = async (req, res) => {
  const userId = authExpressHelpers.getUserId(res);
  const teamId = authExpressHelpers.getTeamId(res);

  const tid = req.headers['x-affiliate-id'] as string | undefined;
  const refId = req.headers['x-referrer-id'] as string | undefined;

  const userInfo = await userService.getUserInfoById({ userId, teamId, referralHeaders: { tid, refId } });

  if (!userInfo) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  res.json({
    message: 'User info retrieved successfully',
    user: userInfo,
  });
};

export const getSettings: ExpressHandler<
  {},
  {
    settings: UserSetting[];
  }
> = async (req, res) => {
  const userId = authExpressHelpers.getUserId(res);
  const settings = await userSettingsService.getSettings(userId);
  return res.json({
    message: 'Settings retrieved successfully',
    settings,
  });
};

export const getSetting: ExpressHandlerWithParams<
  {
    settingKey: string;
  },
  {},
  {
    setting: UserSetting;
  }
> = async (req, res) => {
  const userId = authExpressHelpers.getUserId(res);
  const { settingKey } = req.params;
  const setting = await userSettingsService.getSetting(userId, settingKey);
  res.json({
    message: 'Setting retrieved successfully',
    setting,
  });
};

export const createSetting: ExpressHandler<
  {
    settingKey: string;
    settingValue: string;
  },
  {
    setting: UserSetting;
  }
> = async (req, res) => {
  const userId = authExpressHelpers.getUserId(res);
  const { settingKey, settingValue } = req.body;
  const newSetting = await userSettingsService.createSetting(userId, settingKey, settingValue);
  res.json({
    message: 'Setting updated successfully',
    setting: newSetting,
  });
};

export const deleteSetting: ExpressHandlerWithParams<
  {
    settingKey: string;
  },
  {},
  {}
> = async (req, res) => {
  const userId = authExpressHelpers.getUserId(res);
  const { settingKey } = req.params;
  const deletedSetting = await userSettingsService.deleteSetting(userId, settingKey);
  res.json({
    message: 'Setting deleted successfully',
  });
};
