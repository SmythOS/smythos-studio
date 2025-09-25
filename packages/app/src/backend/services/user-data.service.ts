import axios from 'axios';
import { Request } from 'express';
import config from '../config';
import { APIResponse } from '../types/';
import { authHeaders, headersWithToken, includeAxiosAuth, smythAPIReq } from '../utils/';
import { getAgentShortDescription } from '../utils/agent.utils';

const AGENTS_RUNTIME_ENDPOINT_PREFIX = '/api';
const DB_CRUD_ENDPOINT_PREFIX = config.env.SMYTH_API_BASE_URL;
//const PLUGINS_DIR = `${DATA_DIR}/plugins`;

//* ENDPOINTS

export async function saveAgent({ req, id, name, lockId, data, userName, teamId }) {
  if (!name) throw new Error('Missing name');

  const _data = {
    id,
    name,
    data,
    lockId,
    description: '',
  };

  // Generate short description if not provided
  if (!data.shortDescription) {
    data.shortDescription = await getAgentShortDescription(data, userName);
  }

  data.teamId = teamId;

  // Set the agent description (db) for backward compatibility
  _data.description = data.shortDescription;

  try {
    const beforeCreateAgentTimestamp = Date.now();
    const response = await smythAPIReq.post('/ai-agent', _data, await authHeaders(req));

    const afterCreateAgentTimestamp = Date.now();
    console.log(
      `Agent MW API call agent creation took ${afterCreateAgentTimestamp - beforeCreateAgentTimestamp}ms`,
    );

    return {
      success: true,
      ...response.data.agent,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteAgent(req: Request, id) {
  if (!id) throw new Error('Missing id');

  try {
    const response = await smythAPIReq.delete(`/ai-agent/${id}`, await authHeaders(req));

    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export const requestAccess = async (req: Request, agentId, email) => {
  if (!agentId) throw new Error('Missing agentId');

  const response = await smythAPIReq.post(
    `/ai-agents/request-access`,
    {
      agentId,
      email,
    },
    await authHeaders(req),
  );
  return response.data;
};

export const lockAgent = async (req: Request, id) => {
  if (!id) throw new Error('Missing id');

  const response = await smythAPIReq.put(
    `/ai-agent/lock`,
    {
      agentId: id,
    },
    await authHeaders(req),
  );
  return response.data;
};

export const unlockAgent = async (req: Request, id, lockId: string) => {
  if (!id) throw new Error('Missing id');

  const response = await smythAPIReq.put(
    `/ai-agent/lock/release`,
    {
      agentId: id,
      lockId,
    },
    await authHeaders(req),
  );

  return response.data;
};

export const getAgentLockStatus = async (req: Request, id) => {
  if (!id) throw new Error('Missing id');

  const response = await smythAPIReq.get(`/ai-agent/${id}/lock-status`, await authHeaders(req));
  return response.data;
};

export const refreshAgentLock = async (req: Request, id, lockId: string) => {
  if (!id) throw new Error('Missing id');

  const response = await smythAPIReq.put(
    `/ai-agent/lock/refresh`,
    {
      agentId: id,
      lockId,
    },
    await authHeaders(req),
  );

  return response.data;
};

//

export async function saveEndpoint(req: Request, agentId, componentId, domain, endpoint) {
  if (!agentId || !domain || !endpoint) {
    throw new Error('Missing params');
  }

  //TODO : check domain ownership and configuration

  const endpointPath = `${AGENTS_RUNTIME_ENDPOINT_PREFIX}/${endpoint}`;
  const method = 'POST';

  console.log('path', endpointPath);

  const response = await smythAPIReq.post(
    `/domain/endpoint`,
    {
      path: endpointPath,
      agentId,
      data: {
        componentId,
        method,
      },
      domainName: domain,
    },
    await authHeaders(req),
  );

  return response.data;
}

export async function deleteEndpoint(
  req: Request,
  agentId,
  componentId,
  domain,
  endpoint,
  force = false,
) {
  if (!domain || !endpoint || !agentId || !componentId) {
    throw new Error('Missing params');
  }
  //TODO : check domain ownership and configuration

  const endpointPath = `${AGENTS_RUNTIME_ENDPOINT_PREFIX}/${endpoint}`;
  const method = 'POST';

  try {
    const response = await smythAPIReq.post(
      `/domain/endpoint/delete`,
      {
        path: endpointPath,
        method,
        domainName: domain,
      },
      await authHeaders(req),
    );

    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getEndpoint(req: Request, domain, endpoint) {
  //! ADDING PREFIX TO ENDPOINT
  const endpointPath = `${AGENTS_RUNTIME_ENDPOINT_PREFIX}/${endpoint}`;
  try {
    const response = await smythAPIReq.post(
      `/domain/endpoint/query`,
      {
        domainName: domain,
        path: endpointPath,
        method: 'POST',
      },
      await authHeaders(req),
    );

    return response.data;
  } catch (error) {
    console.log(error.stack);
    throw new Error(error.message);
  }
}

export async function getAgent(req: Request, id, returnFullResponse = false) {
  try {
    const response = await smythAPIReq.get(`/ai-agent/${id}`, await authHeaders(req));

    //if the agent has deployments but no custom domain assigned, assume that the agent is using the default domain
    const deploymentResult = await smythAPIReq.get(
      `/ai-agent/${id}/deployments`,
      await authHeaders(req),
    );
    if (
      Array.isArray(deploymentResult?.data?.deployments) &&
      deploymentResult?.data.deployments.length > 0
    ) {
      if (
        Array.isArray(response?.data?.agent?.domain) &&
        response?.data?.agent?.domain.length == 0
      ) {
        response?.data?.agent?.domain.push({ name: `${id}.${config.env.PROD_AGENT_DOMAIN}` });
      }
    }

    return response.data;
  } catch (error) {
    if (returnFullResponse) {
      throw new Error(JSON.stringify({ message: error.message, data: error.response.data }));
    } else throw new Error(error.message);
  }
}

export async function getAgentDebugSession(req: Request, id) {
  try {
    const response = await smythAPIReq.get(`/ai-agent/${id}/debugSession`, await authHeaders(req));
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getDeployedAgent(req: Request, id) {
  try {
    const response = await smythAPIReq.get(`/ai-agent/${id}`, await authHeaders(req));
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getAgents(
  request: Request,
  includeSettings = false,
  page = '1',
  limit = '10',
  search?,
  sortField?,
  order?,
) {
  const url = includeSettings
    ? `/ai-agents?includeSettings=true&contributors=true&agentActivity=true&page=${page}&limit=${limit}&search=${encodeURIComponent(
        search,
      )}&sortField=${sortField}&order=${order}`
    : `/ai-agents`;
  try {
    const response = await smythAPIReq.get(url, await authHeaders(request));
    return response.data;
  } catch (error) {
    console.log(error.message);
    throw new Error(error.message);
  }
}

export async function getDomains(req: Request) {
  try {
    const response = await smythAPIReq.get('/domains?verified=true', await authHeaders(req));
    return response.data.domains;
  } catch (error) {
    console.log(error.message);
    throw new Error(error.message);
  }
}
export async function saveDomain(req: Request, domain: string, agentId: string | null) {
  try {
    const response: any = await smythAPIReq.put(
      '/domain',
      {
        name: domain,
        data: {
          aiAgentId: agentId,
        },
      },
      await authHeaders(req),
    );
    return response.data;
  } catch (error) {
    console.log(error.message);
    throw new Error(error.message);
  }
}

export async function getAgentSettings(req: Request, id: string, key?: string) {
  try {
    // Not appending key to the URL, because it throws an error when the key is not found
    const response = await smythAPIReq.get(`/ai-agent/${id}/settings`, await authHeaders(req));
    return key
      ? response.data?.settings?.find((setting) => setting.key === key)?.value
      : response.data?.settings;
  } catch (error) {
    throw new Error(error.message);
  }
}

type ManifestData = {
  name: string;
  desc: string;
  descForModel: string;
  logoUrl: string;
  manifestUrl: string;
  specUrl: string;
};

type GPTPluginInfo = ManifestData & {
  id: string;
};

// ! DEPRECATED [GPTPlugin]: will be removed
export async function getManifestInfo(url: string): Promise<APIResponse> {
  try {
    const res = await axios.get(url);
    const manifestInfo = res?.data;

    if (manifestInfo?.auth?.type !== 'none') {
      return {
        success: false,
        error: `Currently, we offer support for plugins without authentication.`,
      };
    }

    const data: ManifestData = {
      name: manifestInfo?.name_for_human,
      desc: manifestInfo?.description_for_human,
      descForModel: manifestInfo?.description_for_model,
      logoUrl: manifestInfo?.logo_url,
      manifestUrl: url,
      specUrl: manifestInfo?.api?.url,
    };

    return { success: true, data };
  } catch (error) {
    return { success: false, error: `Reading manifest file failed for - ${url}` };
  }
}

export async function savePlugin(accessToken: string, data: GPTPluginInfo) {
  try {
    const plugins = await getPlugins(accessToken);

    plugins.push(data);

    const res = await smythAPIReq.put(
      `/user/settings`,
      {
        settingKey: 'GPTPlugins',
        settingValue: JSON.stringify(plugins),
      },
      headersWithToken(accessToken),
    );

    return { status: res.status, data: res.data?.data };
  } catch (error) {
    return error;
  }
}

export async function getPlugins(accessToken: string) {
  try {
    const res = await smythAPIReq.get(`/user/settings/GPTPlugins`, headersWithToken(accessToken));

    const plugins = JSON.parse(res?.data?.setting?.settingValue);

    return plugins || [];
  } catch {
    // Need to return empty array if there are any errors
    return [];
  }
}

export async function deletePlugin(accessToken: string, id: string) {
  try {
    const plugins = await getPlugins(accessToken);

    const filtered = plugins.filter((plugin) => plugin.id !== id);

    const res = await smythAPIReq.put(
      `/user/settings`,
      {
        settingKey: 'GPTPlugins',
        settingValue: JSON.stringify(filtered),
      },
      includeAxiosAuth(accessToken),
    );

    return { status: res.status, data: res.data };
  } catch (error) {
    return error;
  }
}

export async function getUserSettings<T = any>(
  accessToken: string,
  key: string,
): Promise<T | Array<any>> {
  try {
    const res = await smythAPIReq.get(`/user/settings/${key}`, headersWithToken(accessToken));

    const settings = JSON.parse(res?.data?.setting?.settingValue || '[]');

    return settings || [];
  } catch {
    /*
            Need to return empty array if there are any errors
            Because the user settings might not found for the first time
        */
    return [];
  }
}

export async function saveUserSettings(
  accessToken: string,
  key: string,
  data: any,
  operation: 'insert' | 'insertOrUpdate' | 'overwrite' = 'insert',
): Promise<APIResponse> {
  try {
    let settings = [];

    if (operation === 'insert') {
      settings = await getUserSettings(accessToken, key);

      // check if the setting already exists
      for (const setting of settings) {
        if (!data?.id) continue;
        const hasSameId = setting?.id === data?.id;
        const hasSameIdAndVersion = hasSameId && setting?.version === data?.version;

        if (!setting?.version) {
          if (hasSameId) {
            return { success: false, error: `"${data?.name || data?.id}" already exists!` };
          }
        } else {
          if (hasSameIdAndVersion) {
            return { success: false, error: `"${data?.name} - ${data?.version}" already exists!` };
          }
        }
      }

      settings.push(data);
    } else if (operation === 'insertOrUpdate') {
      settings = await getUserSettings(accessToken, key);
      const updatedSettings = [];
      let shouldUpdate = false;

      for (let setting of settings) {
        if (setting?.id === data?.id) {
          shouldUpdate = true;
          setting = { ...setting, ...data };
        }
        updatedSettings.push(setting);
      }

      if (!shouldUpdate) {
        updatedSettings.push(data);
      }

      settings = updatedSettings;
    } else if (operation === 'overwrite') {
      settings = data;
    }

    // TODO: use the putUserSettings function instead of this
    const res = await smythAPIReq.put(
      `/user/settings`,
      {
        settingKey: key,
        settingValue: JSON.stringify(settings),
      },
      headersWithToken(accessToken),
    );

    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: `Something went wrong, saving failed!` };
  }
}

export async function putUserSettings<T = any>(
  accessToken: string,
  key: string,
  settings: T,
): Promise<APIResponse> {
  try {
    const res = await smythAPIReq.put(
      `/user/settings`,
      {
        settingKey: key,
        settingValue: JSON.stringify(settings),
      },
      headersWithToken(accessToken),
    );

    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: `Something went wrong, saving failed!` };
  }
}

export async function deleteUserSettings(
  accessToken: string,
  key: string,
  id: string,
): Promise<APIResponse> {
  try {
    const settings = await getUserSettings(accessToken, key);

    const filteredSettings = settings.filter(
      (setting: Record<string, unknown>) => setting.id !== id,
    );

    const res = await smythAPIReq.put(
      `/user/settings`,
      {
        settingKey: key,
        settingValue: JSON.stringify(filteredSettings),
      },
      headersWithToken(accessToken),
    );

    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: `Something went wrong, deleting failed!` };
  }
}

export async function getAgentPluginInfo(req: Request, agentId: string): Promise<APIResponse> {
  try {
    const result = await getDeployedAgent(req, agentId);

    const agent = result?.agent;

    const data = {
      id: agentId,
      name: agent?.name,
      desc: agent?.data?.description,
      descForModel: agent?.data?.description,
      version: agent?.data?.version,
      agentId: agentId,
    };

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error?.message };
  }
}

export async function getZapierActions(apiKey: string): Promise<APIResponse & { status?: number }> {
  try {
    if (!apiKey) return { success: false, error: 'Zapier (AI Actions) API key is required!' };

    const url = `https://nla.zapier.com/api/v1/exposed?api_key=${apiKey}`;

    const result = await axios.get(url);

    let data = [];

    for (const action of result?.data?.results) {
      data.push({
        id: action?.id,
        name: action?.description,
        params: action?.params,
      });
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      status: error?.response?.status || 500,
      error: 'Zapier Actions not found!',
    };
  }
}

export async function getTeamSubs(req: Request) {
  const res = await smythAPIReq.get('/subscriptions/me?includeObject=true', await authHeaders(req));
  return res.data?.teamsSubs;
}
