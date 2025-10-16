import { authHeaders, headersWithToken, smythAPIReq } from '../utils/';

export async function getAgentSetting<T = any>(
  accessToken: string,
  agentId: string,
  settingKey: string,
  req?: any,
): Promise<T | Record<string, string>> {
  try {
    const headers = req ? await authHeaders(req) : headersWithToken(accessToken);

    const res = await smythAPIReq.get(`/ai-agent/${agentId}/settings/${settingKey}`, headers);

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
  req: any;
}): Promise<any> {
  try {
    let setting = (await getAgentSetting(accessToken, agentId, settingKey, req)) || {};

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
  req?: any,
): Promise<any> {
  try {
    const headers = req ? await authHeaders(req) : headersWithToken(accessToken);

    const res = await smythAPIReq.delete(`/ai-agent/${agentId}/settings/${settingKey}`, headers);
    return res.data;
  } catch (error) {
    throw error;
  }
}
