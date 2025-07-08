import exp from 'constants';
import { APIResponse } from '../types/general.types';
import { smythAPIReq, includeAxiosAuth, headersWithToken, authHeaders } from '../utils/';

export async function getAgentSetting<T = any>(
  accessToken: string,
  agentId: string,
  settingKey: string,
): Promise<T | Record<string, string>> {
  try {
    const res = await smythAPIReq.get(
      `/ai-agent/${agentId}/settings/${settingKey}`,
      headersWithToken(accessToken),
    );

    const settings = JSON.parse(res?.data?.setting?.value || '{}');

    return settings || {};
  } catch {
    /*
        Need to return empty array if there are any errors
        Because the user settings might not found for the first time
    */
    return {};
  }
}

export async function updateOrInsertAgentSetting({
  accessToken,
  agentId,
  settingKey,
  data,
  req,
}: {
  accessToken: string;
  agentId: string;
  settingKey: string;
  data: {
    [key: string]: any;
  };
  req:any;
}): Promise<any> {
  try {
    let setting = (await getAgentSetting(accessToken, agentId, settingKey)) || {};

    const res = await smythAPIReq.put(
      `/ai-agent/${agentId}/settings`,
      {
        key: settingKey,
        value: JSON.stringify({ ...setting, ...data }),
      },
      await authHeaders(req),
    );

    return res.data;
  } catch (error) {
    throw error;
  }
}

export async function deleteAgentSetting(
  accessToken: string,
  agentId: string,
  settingKey: string,
): Promise<any> {
  try {
    const res = await smythAPIReq.delete(
      `/ai-agent/${agentId}/settings/${settingKey}`,
      headersWithToken(accessToken),
    );
    return res.data;
  } catch (error) {
    throw error;
  }
}
