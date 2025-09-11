import express from 'express';
import { userSettingKeys } from '../../../../shared/userSettingKeys';
import * as userData from '../../../services/user-data.service';
import { getUserCurrentTeamId, getUserSettingsByKey } from '../../../utils/api.utils';
export const userSettingsRouter = express.Router();

// A special route to get the user's current team
userSettingsRouter.get(`/${userSettingKeys.USER_TEAM}`, async (req, res) => {
  const token = req.user.accessToken;
  try {
    const { userSelectedTeam } = await getUserCurrentTeamId(token);
    res.json({ userSelectedTeam });
  } catch (error) {
    console.error('Failed to fetch user team settings:', error?.message);
    res.status(500).json({ error: 'Failed to fetch user team settings' });
  }
});

userSettingsRouter.get('/:key', async (req, res) => {
  const key = req.params.key;
  const token = req.user.accessToken;
  try {
    const result = await getUserSettingsByKey(token, key);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

userSettingsRouter.put('/:key', async (req, res) => {
  const key = req.params.key;
  const value = req.body.value;
  const token = req.user.accessToken;
  const userSettings = await userData.putUserSettings(token, key, value);
  res.json(userSettings);
});
