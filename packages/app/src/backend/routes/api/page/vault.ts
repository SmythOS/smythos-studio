import express from 'express';
import {
  CUSTOM_LLM_SETTINGS_KEY,
  CUSTOM_MODELS_CACHE_KEY,
  DEFAULT_SMYTH_LLM_PROVIDERS_SETTINGS,
  SMYTH_LLM_PROVIDERS_SETTINGS_KEY,
} from '../../../constants';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import { cacheClient } from '../../../services/cache.service';
import { LLMService } from '../../../services/LLMHelper/LLMService.class';
import Vault from '../../../services/SmythVault.class';
import {
  deleteTeamSettingsObj,
  getTeamSettingsObj,
  saveTeamSettingsObj,
} from '../../../services/team-data.service';
import { Team } from '../../../types';
import { isSmythStaff } from '../../../utils';
import { isCustomLLMAllowed } from '../../../utils/customLLM';
import { customLLMHelper } from '../../router.helpers/customLLM.helper';
import { getVaultKeys, setVaultKey } from '../../router.utils';

const router = express.Router();

const vault = new Vault();

/*
  some endpoints are duplicated in /page/builder.ts, the concept is we require it to handle page specific ACLs
*/

router.get('/keys', includeTeamDetails, async (req, res) => {
  const allKeys = await getVaultKeys(req);

  // when something goes wrong, allKeys is null
  if (!allKeys) {
    return res.status(400).json({ success: false, error: 'Error getting keys!' });
  }

  res.send({ success: true, data: allKeys, teamId: req?._team?.id });
});

router.post('/keys', includeTeamDetails, async (req, res) => {
  const result = await setVaultKey(req);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

router.put('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const result = await setVaultKey(req, keyId);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

router.get('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const team = req?._team?.id;

  const keyObj = await vault.get({ team, keyId }, req);

  // when something goes wrong, allKeys is null
  if (!keyObj) {
    return res.status(400).json({ success: false, error: 'Error getting key with ID.' });
  }

  res.send({ success: true, data: { [keyId]: keyObj } });
});

router.get('/keys/:keyId/exists', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const team = req?._team?.id;

  const isKeyExists = await vault.exists({ team, keyId }, req);

  res.send({ success: true, data: isKeyExists });
});

router.get('/keys/name/:keyName', includeTeamDetails, async (req, res) => {
  const { keyName } = req.params;

  const team = req?._team?.id;

  const isKeyExists = await vault.get({ team, keyName }, req);

  res.send({ success: true, data: { data: isKeyExists } });
});

router.get('/keys/name/:keyName/exists', includeTeamDetails, async (req, res) => {
  const { keyName } = req.params;
  const { excludeId } = req.query;
  const team = req?._team?.id;

  const isKeyExists = await vault.exists({ team, keyName, excludeId: excludeId as string }, req);

  res.send({ success: true, data: isKeyExists });
});

router.delete('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const team = req?._team?.id;

  const result = await vault.delete(keyId, team, req);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: { keyId } });
});

async function getRecommendedModels(req) {
  let recommendedModels = (await getTeamSettingsObj(req, SMYTH_LLM_PROVIDERS_SETTINGS_KEY)) || {};

  const hasBuiltinModels =
    req._team.subscription.plan?.properties?.flags?.hasBuiltinModels ||
    isSmythStaff(req._user) ||
    false;

  // if (hasBuiltinModels) {
  recommendedModels = {
    ...DEFAULT_SMYTH_LLM_PROVIDERS_SETTINGS,
    ...recommendedModels,
  };
  // }

  return recommendedModels;
}

router.get('/recommended-models', includeTeamDetails, async (req, res) => {
  const recommendedModels = await getRecommendedModels(req);
  res.send({ success: true, data: recommendedModels });
});

router.put('/recommended-models/:providerId', includeTeamDetails, async (req, res) => {
  const { providerId } = req.params;
  const { enabled } = req.body;

  const result = await saveTeamSettingsObj({
    req,
    entryId: providerId,
    data: { enabled: Boolean(enabled) },
    settingKey: SMYTH_LLM_PROVIDERS_SETTINGS_KEY,
  });

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

export default router;

// #region Custom LLM
const customLLMAccessMw = async (req: any, res: any, next: any) => {
  //* should be called after `includeTeamDetails` middleware to get the team details
  const teamDetails: Team = req._team;
  const userEmail: string = req?._user?.email || '';
  const flags: any = teamDetails?.subscription?.plan?.properties?.flags;

  if (
    !(
      teamDetails?.subscription?.properties?.customModelsEnabled ||
      flags?.['hasBuiltinModels'] ||
      flags?.['customModelsEnabled']
    ) &&
    !isSmythStaff(req?._user) &&
    !isCustomLLMAllowed(userEmail)
  ) {
    return res
      .status(403)
      .json({ success: false, error: 'Custom LLM models are not enabled for this team or user' });
  }

  return next();
};

// Create a middleware or helper function
const handleCustomLLMSave = async (req, res) => {
  const accessToken = req?.user?.accessToken;
  const teamId = req?._team?.id;
  const userEmail = req?._user?.email;
  const id = req.params?.id; // This will be undefined for POST requests

  try {
    const saveCustomLLM = await customLLMHelper.saveCustomLLM(req, {
      accessToken,
      teamId,
      userEmail,
      idToken: req?.session?.idToken,
      id,
      ...req.body,
    });

    // delete the custom LLM model cache
    await cacheClient.del(`${CUSTOM_MODELS_CACHE_KEY}:${teamId}`).catch((error) => {
      console.warn('Error deleting custom LLM model cache:', error);
    });

    res.status(200).json({ success: true, data: saveCustomLLM.data });
  } catch (error) {
    console.error('Error saving custom LLM model:', error);
    res.status(500).json({ success: false, error: 'Error saving custom LLM model.' });
  }
};

const customLLMRouteMiddlewares = [includeTeamDetails, customLLMAccessMw];

router.post('/custom-llm/', customLLMRouteMiddlewares, handleCustomLLMSave);
router.put('/custom-llm/:id', customLLMRouteMiddlewares, handleCustomLLMSave);

router.get('/custom-llm', includeTeamDetails, async (req, res) => {
  try {
    const llmProvider = new LLMService();
    const allCustomModels = await llmProvider.getCustomModels(req);
    res.status(200).json({ success: true, data: allCustomModels });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error getting custom LLM models.' });
  }
});

router.get('/custom-llm/:id', includeTeamDetails, async (req, res) => {
  try {
    const entryId = req.params.id;

    const modelInfo = await customLLMHelper.getCustomLLMByEntryId(req, entryId);

    res.status(200).json({ success: true, data: modelInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error getting custom LLM models.' });
  }
});

router.get('/custom-llm/with-credentials/:provider/:name', includeTeamDetails, async (req, res) => {
  try {
    const provider = req.params.provider;
    const name = req.params.name;
    const accessToken = req?.user?.accessToken;

    const customLLM = await customLLMHelper.getCustomLLMWithCredentials({
      accessToken,
      idToken: req?.session?.idToken,
      teamId: req?._team?.id,
      provider,
      name,
      req,
    });

    res.status(200).json({ success: true, data: customLLM.data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error getting custom LLM models.' });
  }
});

router.delete('/custom-llm/:provider/:id', customLLMRouteMiddlewares, async (req, res) => {
  try {
    const accessToken = req?.user?.accessToken;
    const idToken = req?.session?.idToken;
    const teamId = req?._team?.id;
    const provider = req.params.provider;
    const id = req.params.id;

    // It's not necessary to await for deleting the custom LLM model
    customLLMHelper.deleteCustomLLM({
      req,
      accessToken,
      idToken,
      teamId,
      id,
      provider,
    });

    const deleteModel = await deleteTeamSettingsObj(req, CUSTOM_LLM_SETTINGS_KEY, id);

    // delete the custom LLM model cache
    await cacheClient.del(`${CUSTOM_MODELS_CACHE_KEY}:${teamId}`).catch((error) => {
      console.warn('Error deleting custom LLM model cache:', error);
    });

    res.status(200).json({ success: true, data: deleteModel.data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error deleting custom LLM model.' });
  }
});
// #endregion
