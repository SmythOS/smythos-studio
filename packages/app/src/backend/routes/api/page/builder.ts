import crypto, { randomUUID } from 'crypto';
import express from 'express';
import config from '../../../config';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import { getAgentSetting, updateOrInsertAgentSetting } from '../../../services/agent-data.service';
import * as teamData from '../../../services/team-data.service';
import * as userData from '../../../services/user-data.service';
import {
  authHeaders,
  forwardToSmythAPIMiddleware,
  forwardToSmythM2MAPIMiddleware,
  smythAPI,
  smythAPIReq,
} from '../../../utils/';
import { getIntegrations } from '../../router.utils/templates.utils';

import axios, { AxiosError, AxiosResponse } from 'axios';
import rateLimit from 'express-rate-limit';
import { jsonrepair } from 'jsonrepair';
import multer from 'multer';
import { RedisStore } from 'rate-limit-redis';
import {
  AGENT_AUTH_SETTINGS_KEY,
  AGENT_MOCK_DATA_SETTINGS_KEY,
  VAULT_SCOPE_AGENT_LLM,
  WEAVER_LIMIT_MESSAGE,
} from '../../../../shared/constants/general';
import {
  CUSTOM_LLM_SETTINGS_KEY,
  SAMPLE_BINARY_SOURCES,
  WEAVER_FREE_LIMIT,
} from '../../../constants';
import { cacheClient } from '../../../services/cache.service';
import LLMHelper from '../../../services/LLMHelper';
import { LLMService } from '../../../services/LLMHelper/LLMService.class';
import * as openai from '../../../services/openai-helper';
import { vault } from '../../../services/SmythVault.class';
import { getAgent } from '../../../services/user-data.service';
import { delay, uid } from '../../../services/utils.service';
import { Team } from '../../../types';
import { isSmythStaff } from '../../../utils';
import { isCustomLLMAllowed } from '../../../utils/customLLM';
import { customLLMHelper } from '../../router.helpers/customLLM.helper';
import { serverlessCodeHelper } from '../../router.helpers/serverlessCode.helper';
import { getKeyIdFromTemplateVar } from '../../router.helpers/vault.helper';
import { countVaultKeys, getVaultKeys, setVaultKey } from '../../router.utils';

const router = express.Router();

router.get('/domains', async (req, res) => {
  try {
    const result = await smythAPIReq.get('/domains?verified=true', await authHeaders(req));
    return res.json(result.data.domains);
  } catch (error) {
    // console.log('error', error?.message);
    return res.status(error?.response?.status || 500).json({ error: error?.message });
  }
});

router.post('/removeDomain', async (req, res) => {
  const { agentId, curDomain } = req.body;
  try {
    const domainResult = await userData
      .saveDomain(req, curDomain, null)
      .catch((error) => ({ error }));
    if (domainResult.error) {
      return res.status(400).json({ success: false, error: domainResult.error.message });
    }
    return res.json({ success: true });
  } catch (error) {
    console.log('error', error?.message);
    return res
      .status(error?.status || error?.response?.status || 500)
      .json({ error: error?.message });
  }
});

router.post('/updateDomain', async (req, res) => {
  const { agentId, curDomain, domain } = req.body;
  try {
    const token = req.user.accessToken;
    if (curDomain == domain) return res.json({ success: true });

    const defaultDomain = config.env.PROD_AGENT_DOMAIN;
    // if curDomain is a subdomain of the default domain, then it is not stored in the database, so no need to free it
    if (curDomain && !curDomain.endsWith(defaultDomain)) {
      //free the current domain
      const domainResult = await userData
        .saveDomain(req, curDomain, null)
        .catch((error) => ({ error }));
      if (domainResult.error) {
        return res.status(400).json({ success: false, error: domainResult.error.message });
      }
    }

    if (domain && !domain.endsWith(defaultDomain)) {
      //then set the new domain
      const domainResult = await userData
        .saveDomain(req, domain, agentId)
        .catch((error) => ({ error }));
      if (domainResult.error) {
        return res.status(400).json({ success: false, error: domainResult.error.message });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.log('error', error?.message);
    return res
      .status(error?.status || error?.response?.status || 500)
      .json({ error: error?.message });
  }
});

router.post('/ai-agent/deployments*', forwardToSmythAPIMiddleware());
router.get('/ai-agent/deployments/:deploymentId', forwardToSmythAPIMiddleware());
router.get('/ai-agent/:agentId/deployments*', forwardToSmythAPIMiddleware());

/*
  some endpoints are duplicated in /page/vault.ts, the concept is we require it to handle page specific ACLs
*/
router.get('/keys', includeTeamDetails, async (req, res) => {
  const allKeys = await getVaultKeys(req);

  // when something goes wrong, allKeys is null
  if (!allKeys) {
    return res.status(400).json({ success: false, error: 'Error getting keys!' });
  }

  res.send({ success: true, data: allKeys });
});

router.put('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const result = await setVaultKey(req, keyId);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

router.post('/keys', includeTeamDetails, async (req, res) => {
  const result = await setVaultKey(req);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

router.delete('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const team = req?._team?.id;

  const result = await vault.delete(keyId, team, req);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

router.get('/keys/prefix/:keyName/exists', includeTeamDetails, async (req, res) => {
  const { keyName } = req.params;
  const team = req?._team?.id;

  const keys = await vault.get({ team }, req);
  const keyNames = Object.values(keys).filter((keyEntry: { name: string }) =>
    keyEntry.name?.startsWith(keyName),
  );

  /*
    We need to determine the highest index to avoid conflicts with removed keys.
    For example, if we have two keys: key_1 and key_2, and key_1 is removed, the next key should use index 3.
  */
  const keyIndices = keyNames.map((keyEntry: { name: string }) => {
    const index = parseInt(keyEntry.name?.split('_').pop() || '0');
    if (!isNaN(index)) {
      return index;
    }
    return 0;
  });
  const highestIndex = keyIndices.length > 0 ? Math.max(...keyIndices) : 0;

  return res.send({
    success: true,
    data: {
      exists: keyNames?.length > 0,
      highestIndex,
    },
  });
});

router.get('/:agentId/keys/agent-llm', includeTeamDetails, async (req, res) => {
  const keys = await vault.get(
    {
      team: req?._team?.id,
      metadata: { agentId: req.params.agentId },
      scope: [VAULT_SCOPE_AGENT_LLM],
    },
    req,
  );
  return res.send({ success: true, data: keys });
});

/**
 * Route to create a new agent LLM key in the vault
 * Generates a key with 'sk-' prefix and uses it for both key value and name
 */
router.post('/:agentId/keys/agent-llm', includeTeamDetails, async (req, res) => {
  try {
    // Generate unique key with sk- prefix
    const generatedKey = `sk-${randomUUID()}`;

    const team = req?._team?.id;
    const email = req?._user?.email;

    const keyName = req.body.keyName || `llm-${generatedKey.slice(-4)}`;

    if (!team || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required team or user information',
      });
    }

    // Prepare vault key data
    const keyData = {
      team,
      owner: email,
      name: keyName,
      key: generatedKey,
      scope: [VAULT_SCOPE_AGENT_LLM],
      keyMetadata: {
        agentId: req.params.agentId,
      },
    };

    // Save key to vault
    const result = await vault.set({
      req,
      data: keyData,
      keyId: generatedKey,
    });

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        error: result?.error || 'Failed to create agent LLM key',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        keyId: result.data,
        key: generatedKey,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error creating agent LLM key',
    });
  }
});

/**
 * Route to delete an agent LLM key from the vault
 * @route DELETE /api/page/builder/agent-llm/:keyId
 * @param {string} keyId - The ID of the key to delete
 */
router.delete('/:agentId/keys/agent-llm/:keyId', includeTeamDetails, async (req, res) => {
  try {
    const { keyId } = req.params;
    const team = req?._team?.id;
    const email = req?._user?.email;

    // Validate required parameters
    if (!keyId || !team || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
    }

    // Delete the key
    const result = await vault.delete(keyId, team, req);

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        error: result?.error || 'Failed to delete agent LLM key',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Key deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error deleting agent LLM key',
    });
  }
});

router.get('/me', includeTeamDetails, async (req, res) => {
  const team = req?._team?.id;
  const email = req?._user?.email || '';

  const countKeys = await countVaultKeys(team, req);

  return res.send({ success: true, data: { email, countTeamVaultKeys: countKeys } });
});

router.get('/agent-auth/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const token = req.user.accessToken;

  try {
    const authData = await getAgentSetting(token, agentId, AGENT_AUTH_SETTINGS_KEY, req);
    return res.send({ success: true, data: authData });
  } catch (error) {
    return res
      .status(error?.response?.status || 500)
      .send({ success: false, error: error?.response?.data || 'Error getting agent auth data' });
  }
});

router.put('/agent-auth/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const authData = req.body as { [key: string]: any };
  const token = req.user.accessToken;
  try {
    const agent = await updateOrInsertAgentSetting({
      accessToken: token,
      agentId,
      settingKey: AGENT_AUTH_SETTINGS_KEY,
      data: { ...authData },
      req,
    });
    return res.send({ success: true, data: agent });
  } catch (error) {
    return res
      .status(error?.response?.status || 500)
      .send({ success: false, error: 'Error saving agent auth data' });
  }
});

const componentsMWHandler = forwardToSmythM2MAPIMiddleware();

router.get('/app-config/components', componentsMWHandler);
router.get('/app-config/collections', componentsMWHandler);

router.get('/app-config/collections/:id/components', componentsMWHandler);

// TODO: move to ee
router.get('/integrations', async (req, res) => {
  try {
    const integrations = await getIntegrations();
    return res.json({ success: true, data: integrations });
  } catch (error) {
    console.error('Error loading integrations:', error?.message);
    return res.status(500).json({
      success: false,
      error: 'Error loading integrations',
    });
  }
});

router.post('/app-config/components', (req, res) => {
  return componentsMWHandler(req, res);
});
router.put('/app-config/components/:id', (req, res) => {
  return componentsMWHandler(req, res);
});

router.get('/data/cryptoHashes', async (req, res) => {
  const data = crypto.getHashes();
  res.send({ success: true, data });
});

router.post('/data/generate-component-title', async (req, res) => {
  const { prompt } = req.body;
  let _prompt = prompt;
  try {
    const data = await openai.chatRequest(_prompt, {
      model: 'gpt-4o-mini',
      max_tokens: 10,
      messages: [
        {
          role: 'system',
          content: `You are an LLM Component Title generator.
                    The user will send you the text used as a prompt for the LLM Component, and you should return a relevant title of maximum 4 words that describes the component.
                    The title should not contain the word "component" since it's implied.
                    VERY IMPORTANT: The title should never exceed 4 words and don't include variables like {{var_name}}.`,
        },
      ],
    });

    // If data is a string, remove the double quotes at the start and end
    const cleanedData = typeof data === 'string' ? data.replace(/^"|"$/g, '') : data;

    return res.status(200).send({ success: true, data: cleanedData });
  } catch (error) {
    // If there is an error just return the empty string
    return res.status(500).send({ success: false, data: '' });
  }
});

const generateFormDataRateLim = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5,
  keyGenerator: (req) => {
    return req._user?.id;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  requestPropertyName: '_generateFormDataRateLimit',
  handler: (req, res, next, options) => {
    // Custom response when rate limit is exceeded

    res.write(
      JSON.stringify({
        content: 'Sorry, you exceeded your daily limit.',
        // content: `Sorry, you exceeded your daily limit.\n\n [Subscribe to unlock all SmythOS features.](/plans) `,
      }) + '¨',
    );
    res.end();
  },
});

router.post('/data/generate-form-data', generateFormDataRateLim, async (req, res) => {
  const { agentId, componentId } = req.body;

  try {
    const response = await smythAPIReq
      .get(`/ai-agent/${agentId}`, await authHeaders(req))
      .catch((error) => {
        // console.error('Error getting agent data:', error?.message);
        throw error;
      });

    const agentData = response?.data?.agent?.data;
    const comp = agentData?.components?.find((c: any) => c.id === componentId);
    const connectedCompsDesc = agentData?.connections
      ?.filter((conn: any) => conn.sourceId === componentId)
      .map((conn: any) => agentData?.components?.find((c: any) => c.id === conn.targetId))
      .map(
        (c: any, index: number) =>
          `Connected Comp ${index + 1}: name: ${c.displayName}, description: ${c.description}`,
      )
      .join('\n');

    if (!comp) {
      return res.status(400).send({ success: false, error: 'Component not found' });
    }

    const endpointDesc =
      comp.name === 'APIEndpoint'
        ? `name: ${comp.displayName}, path: ${comp.data.path}, description: ${
            comp.description + ' ' + comp.data?.description
          }`
        : '';

    const inputsDescriptionString = comp?.inputs ? JSON.stringify(comp?.inputs) : '';

    const prompt = `Generate a JSON object to automatically fill in the form with the following inputs description: ${inputsDescriptionString}. Your JSON fields should follow this type: [input.name]: <<your_auto_generated_value>>
    Connected components:
    ${connectedCompsDesc}.
    Component description:
    ${endpointDesc}.`;

    const generatedData = await openai.chatRequest(prompt, {
      model: 'gpt-4o-mini',
      // max_tokens: 10,

      messages: [
        {
          role: 'system',
          content: `You are an experienced QA tester for web apps. Your goal is to create relevant data sets that will be used to automate web forms.
                    The user will send you the text used as a prompt with the inputs description for an Agent component, and some relevent data to help you generate the data. You should return a JSON object to automatically fill in the form with the given inputs description for an Agent component. The agent component will then use these inputs to pass to another components. Your JSON fields should follow this type: [input.name]: <<your_auto_generated_value>>
                    Try to guess that is the component that will use these inputs. Your generated values should be relevant and also realistic not just dummy data.
                    For any binary type like: "Binary", "Image", "Audio", "Video", just return an empty string as the value.
                    Make sure your JSON object output is valid as the user will use JSON.parse to parse it, so your response should only be a valid json without any other text.
                    Example input description: '[{"name":"name","type":"String","color":"#F35063","optional":false,"defaultVal":"a new name","__input_type":"Text","index":0,"default":false}]'
                    Example of your output: '{name: "John Doe"}'
                    `,
        },
      ],
    });

    console.log('generated data before parsing', generatedData);
    const generatedDataJson = JSON.parse(jsonrepair(generatedData));
    console.log('generated data after parsing', generatedDataJson);

    const binaryInputs = comp?.inputs?.filter((input: any) =>
      ['Image', 'Binary', 'Audio', 'Video'].includes(input.type),
    );

    for (const input of binaryInputs) {
      const key = input.name;
      const value =
        SAMPLE_BINARY_SOURCES[input.type][
          Math.floor(Math.random() * SAMPLE_BINARY_SOURCES[input.type].length)
        ];
      generatedDataJson[key] = value;
    }

    return res.status(200).send({ success: true, data: generatedDataJson });
  } catch (error) {
    console.error('Error generating form data:', error?.response?.data || error);
    return res.status(500).send({ success: false, error: 'Error generating form data' });
  }
});

router.post('/ai-agent/:agentId/skill-call', async (req, res) => {
  const { componentId, payload, version } = req.body;
  const agentId = req.params.agentId;
  if (!agentId || !componentId || !payload) {
    return res.status(400).send({ success: false, error: 'Missing required fields' });
  }

  let agentData: any;
  // if (version == 'latest') {
  //   let deploymentResponse: AxiosResponse;
  //   try {
  //     deploymentResponse = await smythAPI.get(
  //       `/ai-agent/${agentId}/deployments/latest`,
  //       await authHeaders(req),
  //     );
  //   } catch (e) {
  //     return res.status(e.response.status).send({
  //       success: false,
  //       error: e.response.data || 'Failed to get latest deployment',
  //     });
  //   }
  //   const latestDeployment = deploymentResponse.data?.deployment;
  //   if (!latestDeployment) {
  //     return res.status(400).send({ success: false, error: 'Agent deployment not found' });
  //   }
  //   if (!latestDeployment.aiAgentData) {
  //     return res.status(400).send({ success: false, error: 'Agent deployment not found' });
  //   }
  //   agentData = latestDeployment.aiAgentData;
  // } else if (version == 'dev') {
  let agentResponse: AxiosResponse;
  try {
    agentResponse = await smythAPI.get(`/ai-agent/${agentId}`, await authHeaders(req));
  } catch (e) {
    return res.status(e.response.status).send({
      success: false,
      error: e.response.data || 'Failed to get agent data',
    });
  }
  agentData = agentResponse?.data?.agent?.data;
  // }

  if (!agentData) {
    return res.status(400).send({ success: false, error: 'Agent data not found' });
  }

  const component = (agentData as any).components.find((c) => c.id === componentId);

  if (!component) {
    // throw new ApiError(httpStatus.NOT_FOUND, 'Component not found');
    return res.status(400).send({ success: false, error: 'Component not found' });
  }

  const headers = {
    'x-hash-id': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    'X-MONITOR-ID': req.headers['x-monitor-id'],
  };

  const result = await fetchAgentSkill({
    values: payload || {},
    endpoint: component.data.endpoint!,
    method: component?.data.method ? component.data.method.toUpperCase() : 'POST',
    agentId,
    headers,
  });

  return res.status(200).send({ success: true, response: result });
});

async function fetchAgentSkill({
  values,
  endpoint,
  method,
  agentId,
  headers,
}: {
  values: any;
  endpoint: string;
  method: string;
  agentId: string;
  headers?: { [key: string]: string | string[] };
}) {
  const _method = method.toUpperCase();

  const RUNTIME_AGENT_URL = config.env.API_SERVER;

  const request: {
    body: string | null;
    headers: { [key: string]: string };
  } = { body: null, headers: {} };

  request.body = JSON.stringify(values);

  request.headers = {
    ...(headers || {}),
    ...(_method === 'POST' && { 'Content-Type': 'application/json' }),
    // 'X-DEBUG-SKIP': 'true',
    // ...(version !== 'dev' && { 'X-AGENT-VERSION': version }), // if version is dev, don't send it
    'X-AGENT-ID': agentId,
    'x-smyth-debug': 'true',
    'X-DEBUG-read': '',
  };

  try {
    if (_method === 'GET') {
      const _params = new URLSearchParams(values);
      const res = await axios.get(`${RUNTIME_AGENT_URL}/api/${endpoint}?${_params.toString()}`, {
        headers: request.headers,
      });
      return res.data;
    } else if (_method === 'POST') {
      const res = await axios.post(`${RUNTIME_AGENT_URL}/api/${endpoint}`, request.body, {
        headers: request.headers,
      });
      return res.data;
    }
  } catch (error) {
    const axiosErr = error as AxiosError;

    return axiosErr.response?.data || axiosErr.message;
  }
}

router.get('/llm-models', includeTeamDetails, async (req, res) => {
  try {
    res.locals.LLMModels = await LLMHelper.getUserLLMModels(req);
    res.status(200).json({ success: true, LLMModels: res.locals.LLMModels });
  } catch (error) {
    console.error('Error refreshing LLM models:', error?.message);
    res.status(500).json({ success: false, error: 'Error refreshing LLM models' });
  }
});

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

// ! TODO: Removed if not needed anymore as we manage custom LLM models from the vault page
// #region Custom LLM
router.put('/custom-llm', includeTeamDetails, customLLMAccessMw, async (req, res) => {
  const accessToken = req?.user?.accessToken;
  const teamId = req?._team?.id;
  const userEmail = req?._user?.email;

  try {
    const saveCustomLLM = await customLLMHelper.saveCustomLLM(req, {
      accessToken,
      teamId,
      userEmail,
      idToken: req?.session?.idToken,
      ...req.body,
    });

    // delete the custom LLM model cache
    await cacheClient.del(config.cache.getCustomModelsCacheKey(teamId)).catch((error) => {
      console.warn('Error deleting custom LLM model cache:', error?.message);
    });

    res.status(200).json({ success: true, data: saveCustomLLM.data });
  } catch (error) {
    console.error('Error saving custom LLM model:', error?.message);

    res.status(500).json({ success: false, error: 'Error saving custom LLM model.' });
  }
});

router.get('/custom-llm', includeTeamDetails, async (req, res) => {
  try {
    const llmProvider = new LLMService();
    const allCustomModels = await llmProvider.getCustomModels(req);
    res.status(200).json({ success: true, data: allCustomModels });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error getting custom LLM models.' });
  }
});

router.get('/custom-llm/:name', includeTeamDetails, async (req, res) => {
  try {
    const llmName = req.params.name;
    const accessToken = req?.user?.accessToken;

    const modelInfo = await customLLMHelper.getCustomLLMByName(req, llmName);

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

router.delete(
  '/custom-llm/:provider/:id',
  includeTeamDetails,
  customLLMAccessMw,
  async (req, res) => {
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

      const deleteModel = await teamData.deleteTeamSettingsObj(req, CUSTOM_LLM_SETTINGS_KEY, id);

      // delete the custom LLM model cache
      await cacheClient.del(config.cache.getCustomModelsCacheKey(teamId)).catch((error) => {
        console.warn('Error deleting custom LLM model cache:', error?.message);
      });

      res.status(200).json({ success: true, data: deleteModel.data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error deleting custom LLM model.' });
    }
  },
);
// #endregion

router.post('/distributions*', forwardToSmythAPIMiddleware());
router.get('/distributions*', forwardToSmythAPIMiddleware());
router.delete('/distributions*', forwardToSmythAPIMiddleware());
router.put('/distributions*', forwardToSmythAPIMiddleware());

router.post('/serverless-code/get-deployment-status', includeTeamDetails, async (req, res) => {
  const { agentId, componentId, awsConfigs } = req.body;
  if (!agentId || !componentId) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  let awsAccessKeyId = config.env.AWS_LAMBDA_ACCESS_KEY_ID;
  let awsSecretAccessKey = config.env.AWS_LAMBDA_SECRET_ACCESS_KEY;
  let awsRegion = config.env.AWS_LAMBDA_REGION;

  if (req?._team?.id && awsConfigs && awsConfigs.accessKeyId && awsConfigs.secretAccessKey) {
    const [accessKeyId, secretAccessKey] = await Promise.all([
      await vault.get(
        { team: req?._team?.id, keyName: getKeyIdFromTemplateVar(awsConfigs.accessKeyId) },
        req,
      ),
      await vault.get(
        { team: req?._team?.id, keyName: getKeyIdFromTemplateVar(awsConfigs.secretAccessKey) },
        req,
      ),
    ]);
    awsAccessKeyId = accessKeyId.key;
    awsSecretAccessKey = secretAccessKey.key;
    awsRegion = awsConfigs.region;
  }

  const functionData = await serverlessCodeHelper.getDeployedFunction(componentId, agentId, {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
  });
  res.status(200).json({ success: true, data: functionData });
});

//weaver actions
const actionHandler = {
  refresh: async (req, res) => {
    const agentId = req.params.agentId;
    const agent = await getAgent(req, agentId);
    const agentData = agent?.agent?.data;
    if (!agentData) {
      return res.status(400).json({ success: false, error: 'Agent data not found' });
    }
    const conversationId = agentId;
    const response = await axios({
      method: 'post',
      url: `${config.env.SMYTH_AGENT_BUILDER_BASE_URL}/api/chat/refresh`,
      data: { conversationId, agentId },
    });
    if (response.status == 200) {
      res.json({ success: true });
    }
  },

  feedback: async (req, res) => {
    const agentId = req.params.agentId;
    const { vote_data, vote_ids, upvote, downvote, reasons, comment } = req.body;

    const agent = await getAgent(req, agentId);
    const agentData = agent?.agent?.data;
    if (!agentData) {
      return res.status(400).json({ success: false, error: 'Agent data not found' });
    }
    const conversationId = agentId;
    const response = await axios({
      method: 'post',
      url: `${config.env.SMYTH_AGENT_BUILDER_BASE_URL}/api/chat/feedback`,
      data: {
        conversationId,
        feedback: { vote_data, vote_ids, upvote, downvote, reasons, comment },
      },
    });
    if (response.status == 200) {
      res.json({ success: true });
    }
  },

  stop: async (req, res) => {
    const agentId = req.params.agentId;
    const conversationId = agentId;

    res.write(JSON.stringify({ content: 'Stopping Weaver...', _type: 'status' }) + '¨');

    let agent;

    try {
      agent = await getAgent(req, agentId);
    } catch (error) {
      res.write(JSON.stringify({ content: 'Failed to get agent data', _type: 'error' }) + '¨');
      res.end();
      return;
    }

    const apiResponse = await axios({
      method: 'post',
      url: `${config.env.SMYTH_AGENT_BUILDER_BASE_URL}/api/chat/stop`,
      data: { conversationId, agentId },
    });

    await delay(100);
    res.write(JSON.stringify({ content: 'Interrupted', _type: 'status' }) + '¨');
    await delay(200);
    res.write(
      JSON.stringify({
        content: 'Interrupted by the user',
        message_id: 'msg_' + Math.random().toString(36).substring(2, 15),
      }) + '¨',
    );
    await delay(200);
    res.end();

    //res.send({ success: true });
  },
};
router.post('/chat/:agentId/:action', async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const action = req.params.action;

    const handler = actionHandler[action];
    if (handler) {
      return handler(req, res);
    }

    res.status(400).json({ success: false, error: 'Invalid action.' });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Error refreshing chat.' });
  }
});

// #region Billing Usage Limits
interface BillingData {
  usageData: {
    usage: number;
    [key: string]: any;
  };
  limitData: {
    limitValue?: number;
    isLimitEnabled?: boolean;
    [key: string]: any;
  };
}

const FREE_USERS_FREE_CREDITS = 5; // in USD

// TODO: Implement caching for the billing data
async function getBillingData(req, teamId: string): Promise<BillingData> {
  try {
    const [usageDataRes, limitDataRes] = await Promise.allSettled([
      smythAPIReq.get(`/quota/current-cycle/usage`, await authHeaders(req)),
      teamData.getTeamSettingsObj(req, 'billingLimit'),
    ]);

    const billingData = {
      usageData: usageDataRes.status === 'fulfilled' ? { ...(usageDataRes.value.data || {}) } : {},
      limitData: limitDataRes.status === 'fulfilled' ? limitDataRes.value : {},
    };

    return billingData;
  } catch (error) {
    console.warn('Error in refreshUsageCache:', error?.message);
    throw error;
  }
}

async function checkUsageLimits(req) {
  try {
    const teamInfo = req._team || {};

    // Construct plan info object with subscription flags, properties and plan status
    const planInfo = {
      flags: { ...(teamInfo?.subscription?.plan?.properties?.flags || {}) },
      properties: { ...(teamInfo?.subscription?.properties || {}) },
      isDefaultPlan: teamInfo?.subscription?.plan?.isDefaultPlan,
    };

    const isFreeUser = planInfo?.isDefaultPlan;
    const hasBuiltInModels = planInfo?.flags?.hasBuiltinModels;
    const isPaidSubscriber = hasBuiltInModels; // Right now if the user has built-in models enabled we consider them as paid subscribers

    // We apply the limit check only if the user is a free user or has built-in models enabled
    if (isFreeUser || isPaidSubscriber) {
      let errorMessage = isFreeUser
        ? 'Weaver requires credits and your free credits are exhausted.'
        : 'Weaver requires credits and your usage cap has been reached.';

      // We only provide 5 USD free credits for free users if they don't have the freeCredits property set
      const freeCredits =
        planInfo?.properties?.freeCredits ?? (isFreeUser ? FREE_USERS_FREE_CREDITS : 0);

      // If the the parentId is null then we are in the root team
      const parentTeamId = teamInfo?.parentId || teamInfo?.id;

      const { usageData, limitData } = await getBillingData(req, parentTeamId);

      const maxLimit = isPaidSubscriber
        ? limitData?.isLimitEnabled
          ? (limitData?.limitValue ?? Infinity)
          : Infinity
        : freeCredits;

      const usage = usageData?.usage || 0;
      let limitReached = usage >= maxLimit;

      if (limitReached) {
        return {
          message: errorMessage,
          isLimitReached: true,
        };
      }
    }

    return {
      message: '',
      isLimitReached: false,
    };
  } catch (error) {
    console.error('Error checking usage limits:', error?.message || error);

    // If something goes wrong, we consider the limit reached and return a generic error message
    return {
      isLimitReached: true,
      message:
        'Something went wrong while checking your usage limits. Please try again later or contact support.',
    };
  }
}
// #endregion Billing Usage Limits

function getRateLimiterKey(req) {
  return req._user?.id;
}

const rateLimitStore = config.flags.useRedis
  ? new RedisStore({
      // The call function is present in the Redis client but not in types
      sendCommand: (...args: string[]) => cacheClient.call(...args),
      prefix: WEAVER_FREE_LIMIT.countKeyPrefix,
      //@ts-ignore
      windowMs: WEAVER_FREE_LIMIT.windowMs,
    })
  : undefined;

const weaverRateLimiter = rateLimit({
  windowMs: WEAVER_FREE_LIMIT.windowMs,
  max: WEAVER_FREE_LIMIT.max,
  // max: (req) => {
  //   const abTest = req.query.abTest;
  //   const rateLimit = 3;
  //   const hasSubscription = req._team?.subscription?.plan?.name !== 'SmythOS Free';
  //   return hasSubscription ? Infinity : rateLimit;
  // },
  store: rateLimitStore,
  skip: async (req, res) => {
    const key = getRateLimiterKey(req);
    const redisKey = `${WEAVER_FREE_LIMIT.countKeyPrefix}${key}`;
    const currentLimitStr = await cacheClient.get(redisKey);
    const currentLimit = currentLimitStr ? parseInt(currentLimitStr) : 0;

    // #region If the current limit is 0, set the startedAtKey
    if (currentLimit === 0) {
      const startedAtKey = `${WEAVER_FREE_LIMIT.startedAtKeyPrefix}${key}`;

      // Intentionally omit await to avoid blocking the request
      cacheClient.set(
        startedAtKey,
        new Date().toISOString(),
        'EX', // in seconds
        (WEAVER_FREE_LIMIT.windowMs / 1000).toString(),
      );
    }
    // #endregion

    // Do not count Linter requests
    if (req.body && req.body?.message?.startsWith('Lint:Weaver')) {
      return true; // Skip rate limiting for this request
    }

    // #region If a user (free or paid) runs out of credits, they won't be able to use Weaver.
    const { isLimitReached, message } = await checkUsageLimits(req);

    // If usage limit is reached, terminate the request immediately
    if (isLimitReached) {
      res.write(
        JSON.stringify({
          content: message || WEAVER_LIMIT_MESSAGE,
          _type: 'error',
          teamId: req?._team?.id,
        }) + '¨',
      );
      res.end();

      // Return true to skip normal rate limiting since we've already handled the response
      return true;
    }
    // #endregion

    // #region Paid users have no daily limit. They can use Weaver as long as they have credits.
    const isPaidUser =
      req._team?.subscription?.plan?.name === 'Early Adopters' ||
      req._team?.subscription?.plan?.properties?.flags?.hasBuiltinModels; // hasBuiltinModels=true indicates paid user

    if (isPaidUser) {
      return true;
    }
    // #endregion

    // #region Free users can make up to 5 requests per day, but only if they have enough credits.
    const isFreeUser = req._team?.subscription?.plan?.isDefaultPlan;
    if (isFreeUser && currentLimit >= WEAVER_FREE_LIMIT.max) {
      req._usageLimitMessage = `You've reached your daily limit of ${WEAVER_FREE_LIMIT.max} requests. Please upgrade to continue.`;
      return false;
    }
    // #endregion

    // Continue with normal rate limiting
    return false;
  },
  keyGenerator: (req) => {
    return getRateLimiterKey(req);
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // Custom response when rate limit is exceeded
    res.write(
      JSON.stringify({
        content: req?._usageLimitMessage || WEAVER_LIMIT_MESSAGE,
        _type: 'error',
        teamId: req?._team?.id,
      }) + '¨',
    );
    res.end();
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  '/chat/:agentId',
  [includeTeamDetails, upload.array('attachments'), weaverRateLimiter],
  async (req, res) => {
    const { message, selection, attachmentUrl } = req.body;

    const agentId = req.params.agentId;

    const id = 'status_' + uid();

    res.write(
      JSON.stringify({ content: 'Reading your request...', id: 'main', _type: 'status' }) + '¨',
    );
    await delay(100);
    let agent;

    try {
      agent = await getAgent(req, agentId);
    } catch (error) {
      res.write(JSON.stringify({ content: 'Failed to get agent data', _type: 'error' }) + '¨');
      res.end();
      return;
    }

    const agentData = agent?.agent?.data;
    agentData.name = agent?.agent?.name;
    const conversationId = agentId;

    try {
      res.write(JSON.stringify({ content: 'On it...', id: 'main', _type: 'status' }) + '¨');

      // Initialize FormData to pass through to the chat backend
      const formData = new FormData();

      // Attach message text and metadata from the request body
      formData.append('message', message || '');
      formData.append('agentData', JSON.stringify(agentData) || '{}');
      formData.append('selection', selection || '[]');
      formData.append('conversationId', conversationId || '');
      formData.append('subscription', JSON.stringify(req._team?.subscription) || '{}');

      // If attachments were provided, forward them without saving
      // HOTFIX, removing the isSmythStaff check for now - enabling it for all users
      // const isSmythStaff = ejsHelper.isSmythStaff(req._user);
      // if (isSmythStaff) {
      let attachedments = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          const blob = new Blob([file.buffer], { type: file.mimetype });
          formData.append('attachments', blob, file.originalname);
          attachedments.push({ name: file.originalname, type: file.mimetype });
        });
      }
      if (attachedments.length === 0 && attachmentUrl) {
        try {
          //download the file from the url
          const response = await axios.get(attachmentUrl, { responseType: 'arraybuffer' });
          const type = response.headers['content-type'];
          const name = attachmentUrl.split('/').pop();
          const blob = new Blob([response.data], { type: type });
          formData.append('attachments', blob, name);
          attachedments.push({ name: name, type: type });
        } catch (error) {
          console.warn('Error downloading attachment from URL:', attachmentUrl);
        }
      }
      // }

      // Make a streaming request to the API
      const apiResponse = await axios({
        method: 'post',
        url: `${config.env.SMYTH_AGENT_BUILDER_BASE_URL}/api/chat`,
        data: formData, //{ message, agentData, selection, conversationId },
        responseType: 'stream',
      });

      // Handle the API response
      apiResponse.data.on('data', (chunk) => {
        const decodedChunk = chunk.toString('utf-8');
        //console.log('chunk', typeof decodedChunk, decodedChunk);
        res.write(chunk);
      });

      apiResponse.data.on('end', () => {
        //console.log('end');
        res.write(JSON.stringify({ content: null, id: 'main', _type: 'status' }) + '¨');
        res.write('{"done":true}');
        res.end(); // End the response when the API stream is complete
      });

      apiResponse.data.on('error', (error) => {
        //console.error('Stream error:', error?.message);
        res.write(JSON.stringify({ content: 'Stream error occurred', _type: 'error' }) + '¨');
        res.end();
      });
    } catch (error) {
      res.write(
        JSON.stringify({
          content: 'An Error occurred while processing your request',
          _type: 'error',
        }) + '¨',
      );
      res.end();
    }
  },
);

// #region[mock_data]
router.get('/mock-data/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const token = req.user.accessToken;

  try {
    const mockData = await getAgentSetting(token, agentId, AGENT_MOCK_DATA_SETTINGS_KEY, req);
    return res.send({ success: true, data: mockData });
  } catch (error) {
    return res
      .status(error?.response?.status || 500)
      .send({ success: false, error: error?.response?.data || 'Error getting agent mock data' });
  }
});

router.get('/mock-data/:agentId/:componentId', async (req, res) => {
  const agentId = req.params.agentId;
  const componentId = req.params.componentId;
  const token = req.user.accessToken;

  try {
    const mockData = await getAgentSetting(token, agentId, AGENT_MOCK_DATA_SETTINGS_KEY, req);
    const componentMockData = mockData?.data?.[componentId];
    return res.send({ success: true, data: componentMockData });
  } catch (error) {
    return res
      .status(error?.response?.status || 500)
      .send({ success: false, error: error?.response?.data || 'Error getting agent mock data' });
  }
});

router.put('/mock-data/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const mockData = req.body as { [key: string]: any };
  const token = req.user.accessToken;
  try {
    const agent = await updateOrInsertAgentSetting({
      accessToken: token,
      agentId,
      settingKey: AGENT_MOCK_DATA_SETTINGS_KEY,
      data: { ...mockData },
      req,
    });
    return res.send({ success: true, data: agent });
  } catch (error) {
    return res
      .status(error?.response?.status || 500)
      .send({ success: false, error: 'Error saving agent auth data' });
  }
});
// #endregion[mock_data]

/**
 * Check if teamId and nextReqTime combination exists in Redis
 * @route POST /api/page/builder/check-limit-reached
 */
router.post('/check-limit-reached', async (req, res) => {
  try {
    const { teamId, nextReqTime } = req.body;

    if (!teamId || !nextReqTime) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields: teamId and nextReqTime' });
    }

    const key = `limit_reached:${teamId}:${nextReqTime}`;
    const exists = await cacheClient.exists(key);

    return res.status(200).json({ success: true, exists: exists === 1 });
  } catch (error) {
    console.error('Error checking limit reached data:', error?.message);
    return res.status(500).json({ success: false, error: 'Error checking limit reached data' });
  }
});

/**
 * Store teamId and nextReqTime combination in Redis with 1-day expiration
 * @route POST /api/page/builder/store-limit-reached
 */
router.post('/store-limit-reached', async (req, res) => {
  try {
    const { teamId, nextReqTime } = req.body;

    if (!teamId || !nextReqTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: teamId and nextReqTime',
      });
    }

    const key = `limit_reached:${teamId}:${nextReqTime}`;
    const value = JSON.stringify({ teamId, nextReqTime, timestamp: Date.now() });

    // Store with 1-day expiration (86400 seconds)
    const success = await cacheClient.setex(key, 86400, value);

    if (success === 'OK') {
      return res.status(200).json({
        success: true,
        message: 'Limit reached data stored successfully',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to store limit reached data',
      });
    }
  } catch (error) {
    console.error('Error storing limit reached data:', error?.message);
    return res.status(500).json({
      success: false,
      error: 'Error storing limit reached data',
    });
  }
});

export default router;
