import express, { Request, Response } from 'express';

import * as userData from '../../../services/user-data.service';
import { APIResponse } from '../../../types/';
import { uid } from '../../../services/utils.service';

import { generateKey } from '../../../utils';

const router = express.Router();

const SETTINGS_KEY = 'GPTPlugins';

// * This ID generation logic should be unchanged
// * as IDs generated with same logic for this file data - src/builder-ui/data/no-auth-gpt-plugins.json
// * 'no-auth-gpt-plugins.json' generation script will be found here - https://drive.google.com/file/d/1a6oJzPdkKbGtXsO7739SA4VkFEiNaCIa/view?usp=sharing
const generateGPTPluginId = (name: string, specUrl: string): string => {
  return generateKey(name + specUrl, 'gpt-plugin');
};

router.post('/', async (req: Request, res: Response<APIResponse>) => {
  let { data = null } = req.body;

  const manifestUrl = data?.resourceKey;

  if (manifestUrl) {
    const manifestRes = await userData.getManifestInfo(manifestUrl);

    if (!manifestRes?.success) {
      return res.status(400).json({ success: false, error: manifestRes?.error });
    }

    const manifestData = manifestRes?.data;

    data = {
      ...manifestData,
      id: generateGPTPluginId(manifestData?.name, manifestData?.specUrl),
    };
  }

  if (!data?.id) {
    data.id = generateGPTPluginId(data?.name, data?.specUrl);
  }

  if (!data?.name || !data?.specUrl) {
    return res.status(400).json({ success: false, error: `Plugin not found!` });
  }

  const settingsRes = await userData.saveUserSettings(req?.user?.accessToken, SETTINGS_KEY, data);

  if (!settingsRes?.success) {
    return res.status(400).json({ success: false, error: settingsRes?.error });
  }

  res.send({
    success: true,
    data,
  });
});

router.get('/', async (req: Request, res: Response<APIResponse>) => {
  const data = await userData.getUserSettings(req?.user?.accessToken, SETTINGS_KEY);

  res.send({ success: true, data });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const deleteRes = await userData.deleteUserSettings(req?.user?.accessToken, SETTINGS_KEY, id);

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
