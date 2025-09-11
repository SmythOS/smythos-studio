import httpStatus from 'http-status';
import { ExpressHandlerWithParams } from '../../../../../types';
import { userService, userSettingsService } from '../../services';

import { UserSetting } from '@prisma/client';
import ApiError from '../../../../utils/apiError';

export const getSettings: ExpressHandlerWithParams<
  { userId: number },
  {},
  {
    settings: UserSetting[];
  }
> = async (req, res) => {
  const { userId } = req.params;
  const settings = await userSettingsService.getSettings(userId);
  return res.json({
    message: 'Settings retrieved successfully',
    settings,
  });
};

export const getSetting: ExpressHandlerWithParams<
  {
    settingKey: string;
    userId: number;
  },
  {},
  {
    setting: UserSetting;
  }
> = async (req, res) => {
  const { settingKey, userId } = req.params;
  const setting = await userSettingsService.getSetting(userId, settingKey);
  res.json({
    message: 'Setting retrieved successfully',
    setting,
  });
};

export const createSetting: ExpressHandlerWithParams<
  { userId: number },
  {
    settingKey: string;
    settingValue: string;
  },
  {
    setting: UserSetting;
  }
> = async (req, res) => {
  const { settingKey, settingValue } = req.body;
  const { userId } = req.params;
  const newSetting = await userSettingsService.createSetting(userId, settingKey, settingValue);
  res.json({
    message: 'Setting updated successfully',
    setting: newSetting,
  });
};

export const deleteSetting: ExpressHandlerWithParams<
  {
    settingKey: string;
    userId: number;
  },
  {},
  {}
> = async (req, res) => {
  const { settingKey } = req.params;
  const { userId } = req.params;
  const deletedSetting = await userSettingsService.deleteSetting(userId, settingKey);
  res.json({
    message: 'Setting deleted successfully',
  });
};

export const getUser: ExpressHandlerWithParams<
  { userId: number },
  {},
  {
    user: any;
  }
> = async (req, res) => {
  const { userId } = req.params;
  if (typeof userId !== 'number') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID must be a number');
  }
  const user = await userService.getUserInfoByIdM2M({ userId });
  res.json({
    message: 'User retrieved successfully',
    user,
  });
};
