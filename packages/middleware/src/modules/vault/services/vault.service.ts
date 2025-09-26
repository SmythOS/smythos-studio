import { ConnectorService, SRE } from '@smythos/sre';
import fs from 'fs';
import path from 'path';
import { config } from '../../../../config/config';
import { vaultMessages } from '../constants/vault.constants';

prepareSREConfigFiles();
process.env.SMYTH_PATH = config.variables.SRE_STORAGE_PATH; // needed for SRE initialization
SRE.init({
  Vault: {
    Connector: 'JSONFileVault',
  },
});

export function formatSecretData(secret, secretId) {
  let key = '';
  let value = '';
  for (const k in secret.data.data) {
    // since we only store single key in a path, so it will run only 1 time and fetch the key
    key = k;
    value = secret.data.data[k];
  }
  const metadata = {
    version: secret.data.metadata.version,
    created_time: secret.data.metadata.created_time,
    ...secret.data.metadata.custom_metadata,
  };

  return {
    id: secretId,
    key,
    value,
    metadata,
  };
}

export async function createSecret({ teamId, secretId, key, value, metadata }) {
  try {
    // create secret in JSON vault
    const vaultConnector = await getVaultConnector();
    let filePath = vaultConnector.vaultFile;

    const currentData = fs.readFileSync(filePath, 'utf8');
    const newData = JSON.parse(currentData || '{}');
    if (!newData[teamId]) {
      newData[teamId] = {};
    }
    newData[teamId][secretId] = value;
    fs.writeFileSync(filePath, JSON.stringify(newData));

    // Create metadata in JSON vault
    const metadataPath = getMetadataPath(filePath);
    const updatedMetadata = await setSecretMetadata(teamId, secretId, metadataPath, metadata);

    return {
      success: vaultMessages.SUCCESS_CREATE_SECRET,
      secret: {
        id: secretId,
        key,
        value,
        metadata: updatedMetadata,
      },
    };
  } catch (error: any) {
    console.error(error.message);
    throw error;
  }
}

export async function updateSecretMetadata({ teamId, secretId, metadata }) {
  try {
    const vaultConnector = await getVaultConnector();
    const secretFilePath = vaultConnector.vaultFile;
    const metadataFilePath = getMetadataPath(secretFilePath);

    const updatedMetadata = await setSecretMetadata(teamId, secretId, metadataFilePath, metadata);
    const secretData = await getSecretById(teamId, secretId);
    return {
      success: vaultMessages.SUCCESS_UPDATE_SECRET_METADATA,
      secret: {
        id: secretId,
        key: secretId,
        value: secretData.secret.value,
        metadata: updatedMetadata,
      },
    };
  } catch (error: any) {
    console.error(error.message);
    throw error;
  }
}

export async function getAllSecrets(teamId: string, metadataFilter: string = '') {
  try {
    const vaultConnector = await getVaultConnector();
    const allSecrets = await vaultConnector.team(teamId).listKeys();
    let secretsResponse = await Promise.all(allSecrets.map(secret => getSecret(teamId, secret)));
    let secrets = secretsResponse?.filter(secret => secret !== null);
    if (metadataFilter) {
      secrets = filterSecrets(secretsResponse, metadataFilter);
    }

    return { success: vaultMessages.SUCCESS_GET_ALL_SECRETS, secrets };
  } catch (error: any) {
    return { success: vaultMessages.SUCCESS_GET_ALL_SECRETS, secrets: [] };
  }
}

async function getSecretMetadata(teamId: string, secretId: string, metadataFilePath: string) {
  const metadataData = fs.readFileSync(metadataFilePath, 'utf8');
  const metadataNewData = JSON.parse(metadataData);
  return metadataNewData[teamId]?.[secretId] || {};
}

export async function getSecretById(teamId: string, secretId: string) {
  const secret = await getSecret(teamId, secretId);
  if (secret) {
    return {
      success: vaultMessages.SUCCESS_GET_SECRET_BY_ID,
      secret,
    };
  }
  return {
    error: vaultMessages.ERROR_SECRET_NOT_FOUND,
    secret: null,
  };
}

export async function checkSecretExistsById(teamId: string, secretId: string) {
  try {
    const existingSecret = await getSecret(teamId, secretId);
    return existingSecret ? true : false;
  } catch (error: any) {
    return false;
  }
}

export async function getSecretByName(teamId: string, secretName: string) {
  try {
    const secretData = await getSecretById(teamId, secretName);
    if (secretData.secret) {
      return {
        success: vaultMessages.SUCCESS_GET_SECRET_BY_NAME,
        secret: secretData.secret,
      };
    }
    return {
      error: vaultMessages.ERROR_SECRET_NOT_FOUND,
      secret: null,
    };
  } catch (error: any) {
    console.error(error.message);
    throw error;
  }
}

export async function checkSecretExistsByName(teamId: string, secretName: string, excludeId = null) {
  try {
    const existingSecretResponse = await getSecretByName(teamId, secretName);
    return existingSecretResponse.secret && existingSecretResponse.secret.id !== excludeId ? true : false;
  } catch (error: any) {
    return false;
  }
}

export async function deleteSecretById(teamId: string, secretId: string) {
  const vaultConnector = await getVaultConnector();
  const secretFilePath = vaultConnector.vaultFile;
  const metadataFilePath = getMetadataPath(secretFilePath);

  const currentData = fs.readFileSync(secretFilePath, 'utf8');
  const newData = JSON.parse(currentData);
  delete newData[teamId][secretId];
  fs.writeFileSync(secretFilePath, JSON.stringify(newData));

  await deleteSecretMetadata(teamId, secretId, metadataFilePath);
  return { success: vaultMessages.SUCCESS_DELETE_SECRET };
}

async function deleteSecretMetadata(teamId: string, secretId: string, metadataFilePath: string) {
  try {
    const metadataData = fs.readFileSync(metadataFilePath, 'utf8');
    const metadataNewData = JSON.parse(metadataData);
    delete metadataNewData[teamId][secretId];
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadataNewData));
    return;
  } catch (error: any) {
    console.error(error.message);
    throw error;
  }
}

async function setSecretMetadata(teamId: string, secretId: string, metadataFilePath: string, metadata) {
  try {
    const updatedMetadata = {
      created_time: new Date().toISOString(),
      version: 1,
      ...metadata,
    };

    const metadataData = fs.readFileSync(metadataFilePath, 'utf8');
    const metadataNewData = JSON.parse(metadataData || '{}');
    if (!metadataNewData[teamId]) {
      metadataNewData[teamId] = {};
    }
    metadataNewData[teamId][secretId] = updatedMetadata;
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadataNewData));

    return updatedMetadata;
  } catch (error: any) {
    console.error(error.message);
    throw error;
  }
}

export async function getSecretsCount(teamId: string) {
  try {
    const vaultConnector = await getVaultConnector();
    const allSecrets = await vaultConnector.team(teamId).listKeys();
    return { success: vaultMessages.SUCCESS_GET_ALL_SECRETS_COUNT, count: allSecrets.length };
  } catch (error: any) {
    console.error(error.message);
    throw error;
  }
}

async function getSecret(teamId: string, secretId: string) {
  try {
    const vaultConnector = await getVaultConnector();
    const secret = await vaultConnector.team(teamId).get(secretId);
    const metadataFilePath = getMetadataPath(vaultConnector.vaultFile);
    const metadata = await getSecretMetadata(teamId, secretId, metadataFilePath);
    return {
      id: secretId,
      key: secretId,
      value: secret,
      metadata,
    };
  } catch (error) {
    console.error(`Error getting secret ${secretId} for team ${teamId}`);
    return null;
  }
}

function filterSecrets(secrets, metadataFilter = '{}') {
  let filterObj = {};
  try {
    let metadatafilterObj = JSON.parse(metadataFilter);
    filterObj = { ...filterObj, ...metadatafilterObj };
  } catch (error) {}
  return secrets.filter(secret => {
    for (const key in filterObj) {
      if (secret.metadata[key] !== filterObj[key]) {
        return false;
      }
    }
    return true;
  });
}

function getMetadataPath(filePath: string) {
  const basePath = path.dirname(filePath);
  const metadataFilePath = path.join(basePath, 'vault-metadata.json');
  if (!fs.existsSync(metadataFilePath)) {
    fs.writeFileSync(metadataFilePath, '{}');
  }
  return metadataFilePath;
}

async function getVaultConnector() {
  const vaultConnector = ConnectorService.getVaultConnector();
  // let filePath = vaultConnector.vaultFile;
  // if (!filePath) {
  //   throw new Error('Vault file path is not set');
  // }

  return vaultConnector;
}

function prepareSREConfigFiles() {
  // setup base dir for SRE
  const srePath = config.variables.SRE_STORAGE_PATH;
  if (!fs.existsSync(srePath)) {
    fs.mkdirSync(srePath, { recursive: true });
  }

  //  setup base vault content
  const baseVaultContent = {
    development: {
      echo: '',
      openai: '$env(OPENAI_API_KEY)',
      anthropic: '',
      googleai: '',
      groq: '',
      togetherai: '',
      xai: '',
      deepseek: '',
      tavily: '',
      scrapfly: '',
    },
  };

  const vaultFilePath = path.join(config.variables.SRE_STORAGE_PATH, '.sre', 'vault.json');
  const dir = path.dirname(vaultFilePath);
  fs.mkdirSync(dir, { recursive: true });

  // Write the file
  if (!fs.existsSync(vaultFilePath)) {
    fs.writeFileSync(vaultFilePath, JSON.stringify(baseVaultContent, null, 2));
  }
}
