/**
 * Credentials Router
 *
 * Handles CRUD operations for team credentials (vector databases, etc.)
 * Credentials are stored in team settings with groups for organization
 *
 * Structure:
 * - group: Category (e.g., 'vector_database')
 * - settingKey: Unique credential ID
 * - settingValue: JSON string containing { provider, credentials, name }
 */

import axios from 'axios';
import express, { Request, Response } from 'express';
import config from '../../../config';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import { authHeaders } from '../../../utils/api.utils';
import {
  deleteVaultKeysFromCredentials,
  resolveVaultKeys,
  sanitizeCredentials,
  storeSensitiveFieldsInVault,
} from './vault-helpers';

export const credentialsRouter = express.Router();

const smythAPIBaseUrl = `${config.env.SMYTH_API_BASE_URL}/v1`;

/**
 * Get all credentials for a specific group
 * GET /api/credentials?group=vector_database
 */
credentialsRouter.get('/', includeTeamDetails, async (req: Request, res: Response) => {
  const group = req.query.group as string;

  if (!group) {
    return res.status(400).json({
      success: false,
      error: 'Group parameter is required',
    });
  }

  try {
    const response = await axios.get(`${smythAPIBaseUrl}/teams/settings`, {
      params: { group },
      ...(await authHeaders(req)),
    });

    // Debug: log the response structure
    console.log(
      'Middleware response for group',
      group,
      ':',
      JSON.stringify(response.data, null, 2),
    );

    // Parse the settings response - middleware returns array of settings
    const settingsArray = response.data?.data || response.data?.settings || [];

    // If it's an object instead of array, convert to array
    let settingsList: Array<{ settingKey: string; settingValue: string }> = [];
    if (Array.isArray(settingsArray)) {
      settingsList = settingsArray;
    } else if (typeof settingsArray === 'object') {
      // If it's an object, convert to array format
      settingsList = Object.entries(settingsArray).map(([key, value]: [string, any]) => ({
        settingKey: key,
        settingValue: typeof value === 'object' ? JSON.stringify(value) : value,
      }));
    }

    const credentials = settingsList
      .map((setting: { settingKey: string; settingValue: string }) => {
        try {
          const parsedValue =
            typeof setting.settingValue === 'string'
              ? JSON.parse(setting.settingValue)
              : setting.settingValue;

          // Sanitize credentials to hide vault key references
          const sanitizedCredentials = parsedValue.credentials
            ? sanitizeCredentials(parsedValue.credentials)
            : {};

          return {
            id: setting.settingKey,
            ...parsedValue,
            credentials: sanitizedCredentials,
          };
        } catch (error) {
          console.error(`Error parsing credential ${setting.settingKey}:`, error);
          return null;
        }
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: credentials,
    });
  } catch (error: any) {
    console.error('Error fetching credentials:', error?.message);
    console.error('Full error:', error?.response?.data);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || 'Failed to fetch credentials',
    });
  }
});

/**
 * Get a specific credential by ID
 * GET /api/credentials/:id?group=vector_database&resolveVaultKeys=true
 */
credentialsRouter.get('/:id', includeTeamDetails, async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = req.query.group as string;
  const shouldResolveVaultKeys = req.query.resolveVaultKeys === 'true';

  if (!group) {
    return res.status(400).json({
      success: false,
      error: 'Group parameter is required',
    });
  }

  try {
    const response = await axios.get(`${smythAPIBaseUrl}/teams/settings/${id}`, {
      params: { group },
      ...(await authHeaders(req)),
    });

    const settingValue = response.data?.setting?.settingValue;
    if (!settingValue) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
    }

    const credential = typeof settingValue === 'string' ? JSON.parse(settingValue) : settingValue;

    // Resolve vault keys if requested (for editing)
    let credentials = credential.credentials || {};
    if (shouldResolveVaultKeys) {
      credentials = await resolveVaultKeys(credentials, req);
    } else {
      credentials = sanitizeCredentials(credentials);
    }

    res.json({
      success: true,
      data: {
        id,
        ...credential,
        credentials,
      },
    });
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
    }

    console.error('Error fetching credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || 'Failed to fetch credential',
    });
  }
});

/**
 * Create a new credential
 * POST /api/credentials
 * Body: { group, name, provider, credentials: { fieldName: { value, sensitive }, ... } }
 */
credentialsRouter.post('/', includeTeamDetails, async (req: Request, res: Response) => {
  const { group, name, provider, credentials } = req.body;

  // Validation
  if (!group || !name || !provider || !credentials) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: group, name, provider, credentials',
    });
  }

  try {
    // Generate unique ID for the credential
    const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store sensitive fields in vault and get transformed credentials
    const transformedCredentials = await storeSensitiveFieldsInVault(
      credentials,
      credentialId,
      req,
    );

    // Prepare credential data
    const credentialData = {
      name,
      provider,
      credentials: transformedCredentials,
      group,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to team settings
    await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey: credentialId,
        settingValue: JSON.stringify(credentialData),
        group,
      },
      await authHeaders(req),
    );

    // Return sanitized credentials (with [REDACTED] for sensitive fields)
    const sanitizedCredentials = sanitizeCredentials(transformedCredentials);

    res.status(201).json({
      success: true,
      data: {
        id: credentialId,
        name,
        provider,
        credentials: sanitizedCredentials,
        group,
        createdAt: credentialData.createdAt,
        updatedAt: credentialData.updatedAt,
      },
      message: 'Credential created successfully',
    });
  } catch (error: any) {
    console.error('Error creating credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || 'Failed to create credential',
    });
  }
});

/**
 * Update an existing credential
 * PUT /api/credentials/:id
 * Body: { group, name, provider, credentials: { fieldName: { value, sensitive }, ... } }
 */
credentialsRouter.put('/:id', includeTeamDetails, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { group, name, provider, credentials } = req.body;

  // Validation
  if (!group || !name || !provider || !credentials) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: group, name, provider, credentials',
    });
  }

  try {
    // Fetch existing credential to preserve createdAt
    let createdAt: string | undefined;
    try {
      const existing = await axios.get(`${smythAPIBaseUrl}/teams/settings/${id}`, {
        params: { group },
        ...(await authHeaders(req)),
      });
      const existingData = JSON.parse(existing.data?.setting?.settingValue || '{}');
      createdAt = existingData.createdAt;
    } catch (error) {
      // If not found, we'll create it as a new credential
      createdAt = new Date().toISOString();
    }

    // Store sensitive fields in vault and get transformed credentials
    const transformedCredentials = await storeSensitiveFieldsInVault(credentials, id, req);

    // Prepare updated credential data
    const credentialData = {
      name,
      provider,
      credentials: transformedCredentials,
      group,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update team settings
    await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey: id,
        settingValue: JSON.stringify(credentialData),
        group,
      },
      await authHeaders(req),
    );

    // Return sanitized credentials (with [REDACTED] for sensitive fields)
    const sanitizedCredentials = sanitizeCredentials(transformedCredentials);

    res.json({
      success: true,
      data: {
        id,
        name,
        provider,
        credentials: sanitizedCredentials,
        group,
        createdAt: credentialData.createdAt,
        updatedAt: credentialData.updatedAt,
      },
      message: 'Credential updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || 'Failed to update credential',
    });
  }
});

/**
 * Delete a credential
 * DELETE /api/credentials/:id?group=vector_database
 */
credentialsRouter.delete('/:id', includeTeamDetails, async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = req.query.group as string;

  if (!group) {
    return res.status(400).json({
      success: false,
      error: 'Group parameter is required',
    });
  }

  try {
    // Fetch existing credential to clean up vault keys
    try {
      const existing = await axios.get(`${smythAPIBaseUrl}/teams/settings/${id}`, {
        params: { group },
        ...(await authHeaders(req)),
      });

      const existingData = JSON.parse(existing.data?.setting?.settingValue || '{}');

      // Delete associated vault keys
      if (existingData.credentials) {
        await deleteVaultKeysFromCredentials(existingData.credentials, req?._team?.id, req);
      }
    } catch (error) {
      console.warn('[Credentials] Could not fetch credential for vault cleanup:', error);
      // Continue with deletion even if vault cleanup fails
    }

    // Delete the credential from team settings
    await axios.delete(`${smythAPIBaseUrl}/teams/settings/${id}`, {
      params: { group },
      ...(await authHeaders(req)),
    });

    res.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || 'Failed to delete credential',
    });
  }
});
