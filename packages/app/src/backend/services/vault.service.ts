import { Request } from 'express';
import config from '../config';
import { VaultSecret } from '../routes/router.utils';
import { includeAxiosAuth, smythVaultAPI } from '../utils';

export async function setVaultSecret({ token, teamId, key, value, metadata, secretId }) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    const createdSecretResponse = await smythVaultAPI.post(
      `/vault/secret`,
      {
        teamId,
        secretId,
        key,
        value,
        metadata,
      },
      includeAxiosAuth(token),
    );

    return createdSecretResponse?.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getVaultAllSecrets({ token, teamId, metadataFilter = '' }) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    const allSecretsResponse = await smythVaultAPI.get(
      `/vault/${teamId}/secrets${metadataFilter ? `?metadataFilter=${metadataFilter}` : ''}`,
      includeAxiosAuth(token),
    );

    return allSecretsResponse.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getSpecificVaultSecret({
  token,
  teamId,
  secretId,
  secretName = null,
}): Promise<Record<string, any>> {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    if (secretId) {
      const secretResponse = await smythVaultAPI.get(
        `/vault/${teamId}/secrets/${secretId}`,
        includeAxiosAuth(token),
      );
      return secretResponse.data?.secret
        ? formatSecretData(secretResponse.data?.secret, teamId)
        : {};
    } else if (secretName) {
      const secretResponse = await smythVaultAPI.get(
        `/vault/${teamId}/secrets/name/${secretName}`,
        includeAxiosAuth(token),
      );
      return secretResponse.data?.secret
        ? formatSecretData(secretResponse.data?.secret, teamId)
        : {};
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteSpecificVaultSecret({ token, teamId, secretId }) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    const deleteSecretResponse = await smythVaultAPI.delete(
      `/vault/${teamId}/secrets/${secretId}`,
      includeAxiosAuth(token),
    );
    return deleteSecretResponse.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function markSecretAsInvalid({ token, teamId, secretId }) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    const secretData = await getSpecificVaultSecret({ token, teamId, secretId });
    const updatedMetadata = {
      ...(secretData?.metadata || {}),
      isInvalid: true,
    };
    const secretResponse = await smythVaultAPI.put(
      `/vault/${teamId}/secrets/${secretId}/metadata`,
      {
        metadata: updatedMetadata,
      },
      includeAxiosAuth(token),
    );
    return secretResponse.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getVaultSecretsCount({ token, teamId }) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    const secretsCountResponse = await smythVaultAPI.get(
      `/vault/${teamId}/count/secrets`,
      includeAxiosAuth(token),
    );

    return secretsCountResponse?.data?.count || 0;
  } catch (error) {
    throw new Error(error.message);
  }
}

export function formatSecretData(secret, team) {
  return {
    key: secret.value,
    name: secret.key,
    owner: secret.metadata?.owner,
    scope: JSON.parse(secret.metadata?.scope || '[]'),
    team,
    metadata: secret.metadata || {},
  };
}

export function mapSecretsTeamSettingObj(secrets, team) {
  const formattedSecrets = {};
  for (const secret of secrets) {
    if (secret?.id) {
      formattedSecrets[`${secret.id}`] = formatSecretData(secret, team);
    }
  }
  return formattedSecrets;
}

export async function setMultipleSecrets({
  token,
  teamId,
  secrets,
}: {
  token: string;
  teamId: string;
  secrets: VaultSecret[];
}) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    const promises = [];
    for (const secret of secrets) {
      promises.push(
        setVaultSecret({
          token,
          teamId,
          key: secret.name,
          value: secret.key,
          secretId: secret.secretId,
          metadata: secret.metadata,
        }),
      );
    }
    const setMultipleSecretsData = await Promise.all(promises);
    return setMultipleSecretsData;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteMultipleSecrets({
  token,
  teamId,
  secretIds,
}: {
  token: string;
  teamId: string;
  secretIds: string[];
}) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    const promises = [];
    for (const secretId of secretIds) {
      promises.push(deleteSpecificVaultSecret({ token, teamId, secretId }));
    }
    const deleteSecretsPromise = await Promise.all(promises);
    return deleteSecretsPromise;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function checkIfVaultSecretExists({
  token,
  teamId,
  secretId = null,
  secretName = null,
  excludeId = null,
}) {
  if (!token) {
    throw new Error('Missing Id Token');
  }
  try {
    if (secretId) {
      const secretResponse = await smythVaultAPI.get(
        `/vault/${teamId}/secrets/${secretId}/exists`,
        includeAxiosAuth(token),
      );
      return secretResponse.data;
    } else if (secretName) {
      const secretResponse = await smythVaultAPI.get(
        `/vault/${teamId}/secrets/name/${secretName}/exists?excludeId=${excludeId}`,
        includeAxiosAuth(token),
      );
      return secretResponse.data;
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

export function getUserToken(req: Request) {
  if (config.env.SMYTH_VAULT_API_BASE_URL.includes('localhost')) {
    return req?.user?.accessToken;
  }
  return req?.session?.idToken;
}
