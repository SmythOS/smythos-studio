import express from 'express';
import * as teamData from '../../../services/team-data.service';
import { teamSettingKeys } from '../../../../shared/teamSettingKeys';
import { getTeamSettingsObj } from '../../../services/team-data.service';
import { uid } from '../../../services/utils.service';
import { getTeamSettingsByKey } from '../../../utils/api.utils';
export const teamSettingsRouter = express.Router();

teamSettingsRouter.get('/:key', async (req, res) => {
  const key = req.params.key;
  const token = req.user.accessToken;
  try {
    const result = await getTeamSettingsByKey(req, key);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team settings' });
  }
});

teamSettingsRouter.put('/:key', async (req, res) => {
  const key = req.params.key;
  const value = req.body.value;
  const entryId = key;

  const teamSettings = await teamData.saveTeamSettingsObj({ 
    req, 
    settingKey: key, 
    data: value, 
    entryId 
  });
  
  if (key === teamSettingKeys.COMPANY_LOGO) {
    // Trigger any necessary cache invalidation or updates
    res.json({ ...teamSettings, url: value.url });
  } else {
    res.json(teamSettings);
  }
});
