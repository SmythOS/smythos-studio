import { Request } from 'express';
import { type VaultKeyObj } from '../../shared/types';
import { VaultSecret } from '../routes/router.utils';
import { type OperationResponse } from '../types';
import { generateKey } from '../utils/general.utils';
import Cache from './Cache.class';
import * as teamData from './team-data.service';
import { uid } from './utils.service';
import {
  checkIfVaultSecretExists,
  deleteSpecificVaultSecret,
  getSpecificVaultSecret,
  getUserToken,
  getVaultAllSecrets,
  getVaultSecretsCount,
  mapSecretsTeamSettingObj,
  markSecretAsInvalid,
  setMultipleSecrets,
  setVaultSecret,
} from './vault.service';

const cache = new Cache({ provider: 'memory' });

interface FilterParams {
  scope?: string[];
  excludeScope?: string[];
  team: string;
  owner?: string;
  fields?: string[];
  keyName?: string;
  metadata?: Record<string, any>;
  metadataFilter?: string;
}

type GetParams = FilterParams & {
  keyId?: string;
};

class SmythVault {
  private settingsKey: string = 'vault';

  constructor() {}

  public async get(
    {
      team,
      keyId,
      scope,
      excludeScope,
      owner,
      fields,
      keyName,
      metadata,
      metadataFilter,
    }: GetParams,
    req: Request,
  ): Promise<Record<string, any>> {
    if (keyId || keyName) {
      const idToken = getUserToken(req);
      let secret = await getSpecificVaultSecret({
        token: idToken,
        secretId: keyId,
        secretName: keyName,
        teamId: team,
      });

      //#region Claude retro compatibility
      // * If there are no Anthropic keys, but there are Claude keys, we will use them as Anthropic keys.
      if (!secret?.key && keyId === 'anthropic') {
        secret = await getSpecificVaultSecret({
          token: idToken,
          secretId: 'claude',
          teamId: team,
        });
      }
      //#endregion

      return secret;
    }
    const allKeys = await this.getKeys(req, team, metadataFilter);
    // when something goes wrong, allKeys is null
    if (!allKeys) return null;

    const filteredKeys: Record<string, any> = await this.filter(allKeys, {
      team,
      scope,
      excludeScope,
      owner,
      fields,
      keyName,
      metadata,
    });

    //#region Claude retro compatibility
    // * If there are no Anthropic keys, but there are Claude keys, we will use them as Anthropic keys.
    if (!filteredKeys?.anthropic && filteredKeys?.claude) {
      filteredKeys.anthropic = filteredKeys.claude;
      delete filteredKeys.claude;
      filteredKeys.anthropic.name = 'Anthropic';
    }

    //#endregion
    return filteredKeys || {};
    // }
  }

  public async exists(
    {
      keyId,
      team,
      keyName,
      excludeId,
    }: {
      keyId?: string;
      team: string;
      keyName?: string;
      excludeId?: string;
    },
    req: Request,
  ): Promise<boolean> {
    const idToken = getUserToken(req);
    const isSecretExists = await checkIfVaultSecretExists({
      token: idToken,
      teamId: team,
      secretId: keyId,
      secretName: keyName,
      excludeId,
    });
    return isSecretExists;
  }

  // TODO [Forhad]: check if we may combine this with 'get()' method
  public async getMultiple(
    {
      team,
      keyIds,
      scope,
      excludeScope,
      owner,
      fields,
      keyNames,
      req,
    }: GetParams & { req: Request; keyIds?: string[]; keyNames?: string[] },
    accessToken: string,
    idToken: string,
  ): Promise<Record<string, any>> {
    const allKeys = await this.getKeys(req, team);
    // when something goes wrong, allKeys is null
    if (!allKeys) return null;

    if (keyIds && keyIds.length > 0) {
      return keyIds.reduce(
        (acc, keyId) => {
          acc[keyId] = allKeys[keyId] || {};
          return acc;
        },
        {} as Record<string, any>,
      );
    } else if (keyNames && keyNames.length > 0) {
      return Object.entries(allKeys).reduce(
        (acc, [keyId, keyData]) => {
          if (keyNames.includes(keyData.name)) {
            acc[keyId] = keyData;
          }
          return acc;
        },
        {} as Record<string, any>,
      );
    } else {
      const filteredKeys = await this.filterMultiple(allKeys, {
        team,
        scope,
        excludeScope,
        owner,
        fields,
        keyNames,
      });
      return filteredKeys || {};
    }
  }

  public async set({
    keyId,
    data,
    req,
  }: {
    req: Request;
    keyId?: string;
    data: VaultKeyObj;
  }): Promise<OperationResponse> {
    if (!data?.owner || !data?.team || !data?.key) {
      return {
        success: false,
        error: this.getErrorMsg('set up'),
      };
    }

    if (!keyId) {
      keyId = this.generateKeyId();
    }

    data.name = data?.name || this.generateKeyName(data?.owner, data?.name, data?.scope);

    try {
      const idToken = getUserToken(req);
      await setVaultSecret({
        token: idToken,
        key: data.name,
        value: data.key,
        teamId: data.team,
        metadata: {
          ...data.keyMetadata,
          owner: data.owner,
          scope: JSON.stringify(data.scope || []),
        },
        secretId: data.name,
      });

      data.metadata = {
        isSynced: true,
      };
    } catch (error) {
      console.log('Error saving secret in hashicorp');
      return {
        success: false,
        error: this.getErrorMsg('set up'),
      };
    }

    const cacheKey = generateKey(this.settingsKey + data?.team, 'vault');
    cache.delete(cacheKey);

    return {
      success: true,
      data: keyId,
    };
  }

  // TODO [Forhad]: check if we may combine this with 'set()' method
  public async setMultiple({
    req,
    teamId,
    userEmail,
    keyEntries,
  }: {
    req: Request;
    teamId: string;
    userEmail: string;
    keyEntries: VaultKeyObj[];
  }): Promise<OperationResponse> {
    const _keyEntries = [];
    const vaultEntries: VaultSecret[] = [];
    // validate and set up missing fields
    for (const keyEntry of keyEntries) {
      if (!userEmail || !teamId || !keyEntry?.key) {
        return {
          success: false,
          error: this.getErrorMsg('set up'),
        };
      }

      if (!keyEntry?.id) {
        keyEntry.id = this.generateKeyId();
      }

      keyEntry.name =
        keyEntry?.name || this.generateKeyName(keyEntry?.owner, keyEntry?.name, keyEntry?.scope);

      _keyEntries.push({ ...keyEntry, team: teamId, owner: userEmail });

      vaultEntries.push({
        name: keyEntry.name,
        key: keyEntry.key,
        metadata: {
          ...keyEntry.metadata,
          owner: userEmail,
          scope: JSON.stringify(keyEntry.scope || []),
        },
        secretId: keyEntry.id,
      });
    }

    try {
      const idToken = getUserToken(req);
      await setMultipleSecrets({ token: idToken, teamId, secrets: vaultEntries });
    } catch (error) {
      console.log('Error saving multiple secrets in hashicorp');
      return {
        success: false,
        error: this.getErrorMsg('set up'),
      };
    }

    const cacheKey = generateKey(this.settingsKey + teamId, 'vault');
    cache.delete(cacheKey);

    const keyIds = _keyEntries.map((item) => item.key);

    return {
      success: true,
      data: keyIds,
    };
  }

  public async delete(keyId: string, team: string, req: Request): Promise<OperationResponse> {
    const idToken = getUserToken(req);
    const deleteSetting = await teamData.deleteTeamSettingsObj(req, this.settingsKey, keyId);

    try {
      await deleteSpecificVaultSecret({ token: idToken, secretId: keyId, teamId: team });

      //#region Claude retro compatibility
      // * If it's an Anthropic key, we try to clean the key with `claude` key. As with current implement we cannot check if the anthropic key exists or not.
      if (keyId === 'anthropic') {
        await deleteSpecificVaultSecret({ token: idToken, secretId: 'claude', teamId: team });
      }
      //#endregion
    } catch (error) {
      console.log('Error deleting token from hashicorp vault'); // #TODO: Remove this log after QA
      console.log(error); // #TODO: Remove this log after QA
    }

    if (!deleteSetting?.success) {
      return {
        success: false,
        error: this.getErrorMsg('delete'),
      };
    }

    const cacheKey = generateKey(this.settingsKey + team, 'vault');
    cache.delete(cacheKey);

    return {
      success: true,
      data: deleteSetting.data,
    };
  }

  // TODO [Forhad]: check if we may combine this with 'delete()' method
  public async deleteMultiple({
    req,
    team,
    entryIds,
  }: {
    req: Request;
    team: string;
    entryIds: string[];
  }): Promise<OperationResponse> {
    const deleteSetting = await teamData.deleteMultipleEntries({
      req,
      settingKey: this.settingsKey,
      entryIds,
    });

    for (const id of entryIds) {
      try {
        const idToken = getUserToken(req);
        await deleteSpecificVaultSecret({ token: idToken, secretId: id, teamId: team });
      } catch (error) {
        console.log('Error deleting token from hashicorp vault'); // #TODO: Remove this log after QA
        console.log(error); // #TODO: Remove this log after QA
      }
    }

    if (!deleteSetting?.success) {
      return {
        success: false,
        error: this.getErrorMsg('delete'),
      };
    }

    const cacheKey = generateKey(this.settingsKey + team, 'vault');
    cache.delete(cacheKey);

    return {
      success: true,
      data: deleteSetting.data,
    };
  }

  public async makeInvalid(keyId: string, team: string, req: Request): Promise<OperationResponse> {
    const allKeys = await this.getKeys(req, team);

    // when something goes wrong, allKeys is null
    if (!allKeys) {
      return {
        success: true,
        data: 'Something went wrong, making key invalid failed!',
      };
    }

    const keyObj = allKeys[keyId];
    const idToken = getUserToken(req);
    const saveKey = await teamData.saveTeamSettingsObj({
      req,
      settingKey: this.settingsKey,
      entryId: keyId,
      data: { ...keyObj, isInvalid: true },
    });

    try {
      await markSecretAsInvalid({ token: idToken, teamId: team, secretId: keyId });
    } catch (error) {
      console.log('Error marking secret as invalid in hashicorp vault'); // #TODO: Remove this log after QA
      console.log(error); // #TODO: Remove this log after QA
    }

    if (!saveKey?.success) {
      return {
        success: false,
        error: this.getErrorMsg('make invalid'),
      };
    }

    const cacheKey = generateKey(this.settingsKey + team, 'vault');
    cache.delete(cacheKey);

    return {
      success: true,
      data: saveKey.data,
    };
  }

  public async count(team: string, req: Request): Promise<number> {
    // const allKeys = await this.getKeys(req, team);

    const idToken = getUserToken(req);
    const allKeysCount = await getVaultSecretsCount({ token: idToken, teamId: team });
    return allKeysCount;

    // when something goes wrong, allKeys is null
    // if (!allKeys) return 0;

    // return Object.keys(allKeys)?.length || 0;
  }

  private async filter(
    allKeys: Record<string, any>,
    { team, scope = [], excludeScope, owner, fields = [], keyName, metadata }: FilterParams,
  ) {
    const filteredKeys = {};

    for (const key in allKeys) {
      const keyObj = allKeys[key];

      const hasTeamPermission = keyObj.team === team;

      const isValidScope =
        !scope?.length ||
        (scope?.includes('ALL_NON_GLOBAL_KEYS') && !keyObj?.scope?.includes('global')) ||
        scope?.some((item) => keyObj?.scope?.includes(item));

      const isValidExcludedScope =
        !excludeScope?.length || excludeScope?.every((item) => !keyObj?.scope?.includes(item));

      const hasOwnerPermission = !owner || keyObj.owner === owner;

      const matchKeyName = !keyName || keyObj.name.toLowerCase() === keyName.toLowerCase();

      const isMetadataMatch =
        !metadata ||
        Object.entries(metadata).every(([metaKey, metaValue]) => {
          return keyObj.metadata && keyObj.metadata[metaKey] === metaValue;
        });

      let condition =
        hasTeamPermission &&
        isValidScope &&
        isValidExcludedScope &&
        hasOwnerPermission &&
        matchKeyName &&
        isMetadataMatch;

      if (condition) {
        if (fields?.length) {
          const newKeyObj = {};

          for (const field of fields) {
            newKeyObj[field] = keyObj[field];
          }
          filteredKeys[key] = newKeyObj;
        } else {
          filteredKeys[key] = keyObj;
        }
      }
    }

    return filteredKeys;
  }

  private async filterMultiple(
    allKeys: Record<string, any>,
    {
      team,
      scope = [],
      excludeScope = [],
      owner,
      fields = [],
      keyNames = [],
      metadata,
    }: FilterParams & { keyNames?: string[] },
  ): Promise<Record<string, any>> {
    const filteredKeys: Record<string, any> = {};

    for (const key in allKeys) {
      const keyObj = allKeys[key];

      const hasTeamPermission = keyObj.team === team;

      const isValidScope =
        !scope.length ||
        (scope.includes('ALL_NON_GLOBAL_KEYS') && !keyObj?.scope?.includes('global')) ||
        scope.some((item) => keyObj?.scope?.includes(item));

      const isValidExcludedScope =
        !excludeScope.length || excludeScope.every((item) => !keyObj?.scope?.includes(item));

      const hasOwnerPermission = !owner || keyObj.owner === owner;

      const matchKeyName = !keyNames.length || keyNames.includes(keyObj.name);

      const isMetadataMatch =
        !metadata ||
        Object.entries(metadata).every(([metaKey, metaValue]) => {
          return keyObj.metadata && keyObj.metadata[metaKey] === metaValue;
        });

      const condition =
        hasTeamPermission &&
        isValidScope &&
        isValidExcludedScope &&
        hasOwnerPermission &&
        matchKeyName &&
        isMetadataMatch;

      if (condition) {
        if (fields.length) {
          const newKeyObj: Record<string, any> = {};

          for (const field of fields) {
            if (field in keyObj) {
              newKeyObj[field] = keyObj[field];
            }
          }
          filteredKeys[key] = newKeyObj;
        } else {
          filteredKeys[key] = keyObj;
        }
      }
    }

    return filteredKeys;
  }

  private generateKeyId(): string {
    return uid().toLowerCase();
  }

  private generateKeyName(owner: string, keyName?: string, scope?: string[]): string {
    if (keyName) {
      return keyName;
    } else {
      const scopeStr = scope.length ? scope.join(', ') : 'Key';
      return `${scopeStr} - ${owner}`;
    }
  }

  private getErrorMsg(operation = 'set up') {
    let msg = `Oops! We encountered an issue while trying to ${operation} key(s) in the vault. Please try again or contact support for assistance.`;

    return msg;
  }

  private async getKeys(
    req: Request,
    team: string,
    metadataFilter?: string,
  ): Promise<Record<string, any>> {
    const cacheKey = generateKey(this.settingsKey + team, 'vault');
    const idToken = getUserToken(req);
    let cacheResult = await cache.get(cacheKey, 60 * 60); // extend ttl by 1 hour every time we get the keys

    let settings = cacheResult?.data || {}; // removed cache for now
    // let settings = {};
    if (settings && !Object.keys(settings)?.length) {
      const secretsResponse = await getVaultAllSecrets({
        token: idToken,
        teamId: team,
        metadataFilter,
      });
      settings = mapSecretsTeamSettingObj(secretsResponse?.secrets || [], team);

      if (!settings) return null;
      cache.set(cacheKey, settings, 60 * 60); // 1 hour ttl
    }

    return settings;
  }
}

export const vault = new SmythVault();

export default SmythVault;
