/**
 * Credentials Service
 *
 * Business logic layer for credentials management.
 * Handles CRUD operations for team credentials (OAuth, vector databases, etc.)
 *
 * @module
 */

import axios from 'axios';
import type { Request } from 'express';
import type {
  CreateCredentialInput,
  CredentialConnection,
  DeleteCredentialInput,
  DeleteCredentialResult,
  UpdateCredentialInput,
} from '../../../../shared/types/credentials.types';
import config from '../../../config';
import { authHeaders } from '../../../utils/api.utils';
import { CredentialDependenciesChecker } from './dependencies';
import {
  deleteVaultKeysFromCredentials,
  resolveVaultKeys,
  sanitizeCredentials,
  storeSensitiveFieldsInVault,
} from './vault-helpers';

const smythAPIBaseUrl = `${config.env.SMYTH_API_BASE_URL}/v1`;

// --- Internal Types ---

interface CredentialData {
  name: string;
  provider: string;
  credentials: Record<string, any>;
  group: string;
  createdAt?: string;
  updatedAt?: string;
}

// --- Service Class ---

export class CredentialsService {
  /**
   * Fetch all credentials for a specific group
   */
  static async getCredentialsByGroup(group: string, req: Request): Promise<CredentialConnection[]> {
    const response = await axios.get(`${smythAPIBaseUrl}/teams/settings`, {
      params: { group },
      ...(await authHeaders(req)),
    });

    const settingsArray = response.data?.data || response.data?.settings || [];

    // Normalize to array format
    let settingsList: Array<{ settingKey: string; settingValue: string }> = [];
    if (Array.isArray(settingsArray)) {
      settingsList = settingsArray;
    } else if (typeof settingsArray === 'object') {
      settingsList = Object.entries(settingsArray).map(([key, value]: [string, any]) => ({
        settingKey: key,
        settingValue: typeof value === 'object' ? JSON.stringify(value) : value,
      }));
    }

    // Parse and sanitize credentials
    const credentials = settingsList
      .map((setting): CredentialConnection | null => {
        try {
          const parsedValue =
            typeof setting.settingValue === 'string'
              ? JSON.parse(setting.settingValue)
              : setting.settingValue;

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

    return credentials;
  }

  /**
   * Fetch a single credential by ID
   */
  static async getCredentialById(
    id: string,
    group: string,
    req: Request,
    options: { resolveVaultKeys?: boolean } = {},
  ): Promise<CredentialConnection> {
    const { resolveVaultKeys: shouldResolveVaultKeys = false } = options;

    const response = await axios.get(`${smythAPIBaseUrl}/teams/settings/${id}`, {
      params: { group },
      ...(await authHeaders(req)),
    });

    const settingValue = response.data?.setting?.settingValue;
    if (!settingValue) {
      throw new Error('Credential not found');
    }

    const credential = typeof settingValue === 'string' ? JSON.parse(settingValue) : settingValue;

    // Resolve vault keys if requested (for editing)
    let credentials = credential.credentials || {};
    if (shouldResolveVaultKeys) {
      credentials = await resolveVaultKeys(credentials, req);
    } else {
      credentials = sanitizeCredentials(credentials);
    }

    return {
      id,
      ...credential,
      credentials,
    };
  }

  /**
   * Create a new credential
   */
  static async createCredential(
    input: CreateCredentialInput,
    req: Request,
  ): Promise<CredentialConnection> {
    const { group, name, provider, credentials } = input;

    // Generate unique ID
    const credentialId = `${group}@cred_${Math.random().toString(36).substring(2, 9)}`;

    // Store sensitive fields in vault
    const transformedCredentials = await storeSensitiveFieldsInVault(
      credentials,
      credentialId,
      req,
    );

    // Prepare credential data
    const credentialData: CredentialData = {
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

    // Return sanitized version
    const sanitizedCredentials = sanitizeCredentials(transformedCredentials);

    return {
      id: credentialId,
      name,
      provider,
      credentials: sanitizedCredentials,
      group,
      createdAt: credentialData.createdAt,
      updatedAt: credentialData.updatedAt,
    };
  }

  /**
   * Update an existing credential
   */
  static async updateCredential(
    credentialId: string,
    group: string,
    updatedFields: UpdateCredentialInput,
    req: Request,
  ): Promise<CredentialConnection> {
    // Fetch existing credential to preserve createdAt
    let createdAt: string;
    let existingData: any;
    try {
      const existing = await axios.get(`${smythAPIBaseUrl}/teams/settings/${credentialId}`, {
        params: { group },
        ...(await authHeaders(req)),
      });
      existingData = JSON.parse(existing.data?.setting?.settingValue || '{}');
      createdAt = existingData.createdAt || new Date().toISOString();
    } catch (error) {
      createdAt = new Date().toISOString();
    }

    // Store sensitive fields in vault
    const transformedCredentials = updatedFields.credentials
      ? await storeSensitiveFieldsInVault(updatedFields.credentials, credentialId, req)
      : undefined;

    // Prepare updated credential data

    const credentialData: CredentialData = {
      ...existingData,
      // name: existingData.name,
      ...(updatedFields.name ? { name: updatedFields.name } : {}),
      ...(transformedCredentials ? { credentials: transformedCredentials } : {}),
      createdAt,
      updatedAt: new Date().toISOString(),
      ...(updatedFields.customProperties
        ? { customProperties: updatedFields.customProperties }
        : {}),
    };

    // Update team settings
    await axios.put(
      `${smythAPIBaseUrl}/teams/settings`,
      {
        settingKey: credentialId,
        settingValue: JSON.stringify(credentialData),
        group,
      },
      await authHeaders(req),
    );

    // Return sanitized version
    const sanitizedCredentials = sanitizeCredentials(
      transformedCredentials || existingData.credentials,
    );

    return {
      id: credentialId,
      name: existingData.name,
      provider: existingData.provider,
      credentials: sanitizedCredentials,
      group: existingData.group,
      createdAt: credentialData.createdAt,
      updatedAt: credentialData.updatedAt,
      // customProperties: existingData.customProperties || {},
    };
  }

  /**
   * Delete a credential
   */
  static async deleteCredential(
    input: DeleteCredentialInput,
    req: Request,
  ): Promise<DeleteCredentialResult> {
    const { id, group, consentedWarnings = false } = input;

    // Fetch existing credential to clean up vault keys
    const existing = await axios.get(`${smythAPIBaseUrl}/teams/settings/${id}`, {
      params: { group },
      ...(await authHeaders(req)),
    });

    const existingData = JSON.parse(existing.data?.setting?.settingValue || '{}');
    if (!existingData.credentials) {
      throw new Error('Credential not found');
    }

    // Check dependencies
    const dependenciesChecker = new CredentialDependenciesChecker(req, id, group);
    const dependenciesResult = await dependenciesChecker.checkDependencies();

    if (dependenciesResult.errors.length > 0) {
      throw new Error(dependenciesResult.errors.join('\n'));
    }

    if (!consentedWarnings && dependenciesResult.warnings.length > 0) {
      return {
        success: false,
        warnings: dependenciesResult.warnings,
      };
    }

    // Delete associated vault keys
    await deleteVaultKeysFromCredentials(existingData.credentials, req?._team?.id, req).catch(
      (error) => {
        console.warn('[Credentials] Could not delete vault keys:', error);
      },
    );

    // Delete the credential from team settings
    await axios.delete(`${smythAPIBaseUrl}/teams/settings/${id}`, {
      params: { group },
      ...(await authHeaders(req)),
    });

    return {
      success: true,
      message: 'Credential deleted successfully',
    };
  }
}
