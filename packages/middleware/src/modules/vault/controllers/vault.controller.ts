import httpStatus from 'http-status';
import { ExpressHandler } from '../../../../types';
import * as vaultService from '../services/vault.service';

export const createVaultSecret: ExpressHandler<
  {
    teamId: string;
    secretId: string;
    key: string;
    value: string;
    metadata: string;
  },
  any
> = async (req, res) => {
  const { teamId, secretId, key, value, metadata } = req.body;

  try {
    const response = await vaultService.createSecret({
      teamId,
      secretId,
      key,
      value,
      metadata
    });
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to save secret for teamId: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to save secret.', message: error.message });
  }
};


export const getAllSecrets: ExpressHandler<
  {
    teamId: string;
    userJWTToken: string;
    isM2MAccess: boolean;
    metadataFilter: string;
  },
  any
> = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { metadataFilter } = req.query;
    const response = await vaultService.getAllSecrets(teamId, metadataFilter as string);
    return res.status(httpStatus.OK).json(response);

  } catch (error: any) {
    throw error;
  }
}

export const getSecretsCount: ExpressHandler<
  {
    teamId: string;
    userJWTToken: string;
  },
  any
> = async (req, res) => {
  const { teamId } = req.params;
  try {
    const response = await vaultService.getSecretsCount(
      teamId)
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to get secrets count: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to get secrets count', message: error.message });
  }
}

export const getSecretById: ExpressHandler<
  {
    teamId: string;
    secretId: string;
  },
  any
> = async (req, res) => {
  const { teamId, secretId } = req.params;
  try {
    const response = await vaultService.getSecretById(
      teamId, secretId)
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to get secrets count: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to get secrets count', message: error.message });
  }
}

export const checkSecretExistsById: ExpressHandler<
  {
    teamId: string;
    secretId: string;
  },
  any
> = async (req, res) => {
  const { teamId, secretId } = req.params;
  try {
    const response = await vaultService.checkSecretExistsById(
      teamId, secretId)
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to get secrets count: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to get secrets count', message: error.message });
  }
}

export const getSecretByName: ExpressHandler<
  {
    teamId: string;
    secretName: string;
  },
  any
> = async (req, res) => {
  const { teamId, secretName } = req.params;
  try {
    const response = await vaultService.getSecretByName(
      teamId, secretName)
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to get secrets count: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to get secrets count', message: error.message });
  }
}

export const checkSecretExistsByName: ExpressHandler<
  {
    teamId: string;
    secretName: string;
  },
  any
> = async (req, res) => {
  const { teamId, secretName } = req.params;
  const { excludeId } = req.query;
  try {
    const response = await vaultService.checkSecretExistsByName(
      teamId, secretName, excludeId as string)
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to get secrets count: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to get secrets count', message: error.message });
  }
}

export const deleteSecretById: ExpressHandler<
  {
    teamId: string;
    secretId: string;
  },
  any
> = async (req, res) => {
  const { teamId, secretId } = req.params;
  try {
    const response = await vaultService.deleteSecretById(
      teamId, secretId)
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to get secrets count: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to get secrets count', message: error.message });
  }
}

export const updateSecretMetadata: ExpressHandler<
  {
    teamId: string;
    secretId: string;
    metadata: any;
  },
  any
> = async (req, res) => {
  const { teamId, secretId } = req.params;
  const { metadata } = req.body;
  try {
    const response = await vaultService.updateSecretMetadata(
      {
        teamId,
        secretId,
        metadata
      })
    return res.status(httpStatus.OK).json(response);
  } catch (error: any) {
    console.error('Failed to get secrets count: ', teamId, error.message);
    res.status(error?.statusCode || 500).json({ error: 'Failed to get secrets count', message: error.message });
  }
}
