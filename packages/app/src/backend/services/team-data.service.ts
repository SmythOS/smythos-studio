import axios from 'axios';
import { Request } from 'express';
import { teamSettingKeys } from '../../shared/teamSettingKeys';
import config from '../config';
import { APIResponse } from '../types/';
import { authHeaders, headersWithToken, smythAPIReq } from '../utils';

const smythAPIBaseUrl = `${config.env.SMYTH_API_BASE_URL}/v1`;

export async function getTeamSettingsObj(req: Request, key: string): Promise<Record<string, any>> {
  try {
    const res = await axios.get(`${smythAPIBaseUrl}/teams/settings/${key}`, await authHeaders(req));

    const settings = JSON.parse(res?.data?.setting?.settingValue || '{}');

    return settings || {};
  } catch (error) {
    /*
            Need to return empty array if there are 404 errors
            Because the teams settings might not found for the first time
        */
    if (error?.response?.status === 404) {
      return {};
    } else {
      console.error('Error in getTeamSettingsObj', error?.message);
      return null;
    }
  }
}

type SaveTeamSettings = {
  req: Request;
  settingKey: string;
  entryId?: string;
  data: any;
  format?: string;
};

/**
 * Saves team settings in a Record<string, any> structure.
 * The settings are stored as key-value pairs where:
 * - Key is a string identifier (entryId)
 * - Value is an object or other data types
 *
 * @example
 * {
 *   "setting1": { id: "1", value: "foo" },
 *   "setting2": { id: "2", value: "bar" }
 * }
 *
 * @param req - Express request object containing auth info
 * @param settingKey - Key under which to store the settings
 * @param entryId - Unique identifier for a specific setting entry stored under the settingKey. Used as a key in the settings object to store/retrieve individual entries.
 * @param data - Raw settings data to save
 * @returns Promise<APIResponse> - Response indicating success/failure
 */
export async function saveTeamSettingsObj({
  req,
  settingKey,
  entryId,
  data,
}: SaveTeamSettings): Promise<APIResponse> {
  try {
    let settings = await getTeamSettingsObj(req, settingKey);

    // when something goes wrong, settings is null
    if (!settings) {
      return { success: false, error: `Something went wrong, saving failed!` };
    }

    settings[entryId] = data;

    const res = await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey,
        settingValue: JSON.stringify(
          settingKey !== teamSettingKeys.BILLING_LIMIT ? settings : data,
        ),
      },
      await authHeaders(req),
    );

    return { success: true, data: res.data };
  } catch (error) {
    console.error('Error in saveTeamSettingsObj', error?.message);
    return { success: false, error: `Something went wrong, saving failed!` };
  }
}

/**
 * Saves raw team settings data directly without any transformation.
 * Unlike saveTeamSettingsObj which handles structured data, this function saves the data as-is.
 *
 * @param req - Express request object containing auth info
 * @param settingKey - Key under which to store the settings
 * @param data - Raw settings data to save
 * @returns Promise<APIResponse> - Response indicating success/failure
 */
export async function saveTeamSettings({
  req,
  settingKey,
  data,
}: SaveTeamSettings): Promise<APIResponse> {
  try {
    const res = await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey,
        settingValue: typeof data === 'object' ? JSON.stringify(data) : data,
      },
      await authHeaders(req),
    );

    return { success: true, data: res.data };
  } catch (error) {
    console.error('Error in saveTeamSettings', error?.message);
    return { success: false, error: `Something went wrong, saving failed!` };
  }
}

type SaveMultipleTeamSettings = {
  req: Request;
  settingKey: string;
  entries: Record<string, any>[]; // { key: string, value: any }[]
};

export async function saveMultipleEntries({
  req,
  settingKey,
  entries,
}: SaveMultipleTeamSettings): Promise<APIResponse> {
  try {
    let settings = await getTeamSettingsObj(req, settingKey);

    // when something goes wrong, settings is null
    if (!settings) {
      return { success: false, error: `Something went wrong, saving failed!` };
    }

    for (const entry of entries) {
      const id = entry.id;
      delete entry.id;
      settings[id] = entry;
    }

    const res = await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey,
        settingValue: JSON.stringify(settings),
      },
      await authHeaders(req),
    );

    return { success: true, data: res.data };
  } catch (error) {
    console.error('Error in SaveMultipleTeamSettings', error?.message);

    throw new Error(`Something went wrong, saving multiple entries failed!`);
  }
}

export async function deleteTeamSettingsObj(
  req: Request,
  key: string,
  entryId: string,
): Promise<APIResponse> {
  try {
    const settings = await getTeamSettingsObj(req, key);

    // when something goes wrong, settings is null
    if (!settings) {
      return { success: false, error: `Something went wrong, deleting failed!` };
    }

    delete settings?.[entryId];

    const res = await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey: key,
        settingValue: JSON.stringify(settings),
      },
      await authHeaders(req),
    );

    return { success: true, data: res.data };
  } catch (error) {
    console.error('Error in deleteTeamSettingsObj', error?.message);
    return { success: false, error: `Something went wrong, deleting failed!` };
  }
}

export async function deleteMultipleEntries({
  req,
  settingKey,
  entryIds,
}: {
  req: Request;
  settingKey: string;
  entryIds: string[];
}): Promise<APIResponse> {
  try {
    const settings = await getTeamSettingsObj(req, settingKey);

    // when something goes wrong, settings is null
    if (!settings) {
      return { success: false, error: `Something went wrong, deleting failed!` };
    }

    for (const id of entryIds) {
      delete settings[id];
    }

    const res = await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey,
        settingValue: JSON.stringify(settings),
      },
      await authHeaders(req),
    );

    return { success: true, data: res.data };
  } catch (error) {
    console.error('Error in deleteMultipleEntries', error?.message);
    return { success: false, error: `Something went wrong, deleting failed!` };
  }
}

export async function getAllTeamsSecrets(skip: number, limit: number, token: string) {
  try {
    const res = await smythAPIReq.get(
      `/teams/settings/vault-sync/all?skip=${skip}&limit=${limit}`,
      headersWithToken(token),
    );

    return res?.data?.settings || [];
  } catch (error) {
    // console.log('Error in getAllTeamsSecrets', error?.message);
    return null;
  }
}
