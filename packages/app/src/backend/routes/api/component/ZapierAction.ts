import express, { Request, Response } from 'express';

import * as userData from '../../../services/user-data.service';
import { APIResponse } from '../../../types';

import { vault } from '../../../services/SmythVault.class';
import { includeTeamDetails } from '../../../middlewares/auth.mw';

const ZAPIER_ACTIONS_SETTINGS_KEY = 'ZapierActions';
const scope = ['ZapierAction'];

const router = express.Router();

router.get('/', includeTeamDetails, async (req: Request, res: Response<APIResponse>) => {
  const team = req?._team?.id;

  const allKeys = await vault.get(
    {
      team,
      scope,
    },
    req,
  ).catch((err) => {
    console.log('Error getting Zapier NLA Actions!', err);
    return null;
  });

  // when something goes wrong, allKeys is null
  if (!allKeys) {
    return res.status(400).json({ success: false, error: 'Error getting Zapier NLA Actions!' });
  }

  if (!Object.keys(allKeys)?.length) {
    // Prevent error message from showing up in the console initially
    return res.send({ success: true, data: [] });
  }

  let actions = [];

  for (const keyId in allKeys) {
    const keyObj = allKeys[keyId];
    const keyName = keyObj?.name;
    const key = keyObj?.key;
    let isInvalidKey = false;

    const actionsRes = await userData.getZapierActions(key);

    if (actionsRes?.status === 401) {
      // Make the API key invalidated
      isInvalidKey = true;
      vault.makeInvalid(keyId, team, req);
    }

    const _actions = actionsRes?.data?.map((action) => ({ ...action, keyName, isInvalidKey }));

    if (_actions?.length) {
      actions = [...actions, ..._actions];
    }
  }

  /*
   * N:B - Right now using the actions data directly from the API response
   * But in the future, we might need to store the actions in the user/team settings and sync them with the API response
   * So, we will keep the sync code commented for now
   */

  /* const actionsObj = actions?.length
        ? actions?.reduce((acc, action) => {
              acc[action?.id] = action;
              return acc;
          }, {})
        : {}; */

  //const settings = await userData.getUserSettings(req?.user?.accessToken, ZAPIER_ACTIONS_SETTINGS_KEY);
  /* const settingsObj = settings?.length
        ? settings?.reduce((acc, setting) => {
              acc[setting?.id] = setting;
              return acc;
          }, {})
        : {}; */

  let data = [];

  for (const action of actions) {
    //if (!settingsObj?.[action?.id]) {
    data.push({
      id: action?.id,
      name: action?.name,
      params: action?.params,
      apiKeyName: action?.keyName,
      enabled: !action?.isInvalidKey,
    });
    //}
  }

  /* for (const setting of settings) {
        let enabled = true;

        if (actionsObj?.[setting?.id]) {
            setting.name = actionsObj?.[setting?.id]?.name;
        }
        if (!actionsObj?.[setting?.id]) {
            enabled = false;
        }

        data.push({ ...setting, enabled });
    } */

  res.send({ success: true, data });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const deleteRes = await userData.deleteUserSettings(
    req?.user?.accessToken,
    ZAPIER_ACTIONS_SETTINGS_KEY,
    id,
  );

  if (!deleteRes?.success) {
    return res.status(400).json({ success: false, error: deleteRes?.error });
  }
  res.send({
    success: true,
    data: {
      id,
      message: 'Plugin deleted successfully!',
    },
  });
});

export default router;
