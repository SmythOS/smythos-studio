/**
 * Vault Helpers for Credentials
 * 
 * Utilities for storing and resolving sensitive credential fields in vault.
 * Based on the OAuth vault pattern from vault.ts
 */

import { VAULT_SCOPE_CREDENTIALS } from '@src/shared/constants/general';
import { Request } from 'express';
import Vault from '../../../services/SmythVault.class';

const vault = new Vault();

/**
 * Pattern to identify vault keys in credential values
 * Format: {{KEY(keyName)}}
 */
const VAULT_KEY_PATTERN = /{{KEY\((.*?)\)}}/;

/**
 * Checks if a value is a vault key reference
 */
export function isVaultKey(value: string): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(VAULT_KEY_PATTERN);
  return match ? match[1] : null;
}

/**
 * Checks if credentials object contains any vault key references
 */
export function hasVaultKeys(credentials: Record<string, any>): boolean {
  return Object.values(credentials).some((value) => {
    if (typeof value === 'string') {
      return isVaultKey(value) !== null;
    }
    return false;
  });
}

/**
 * Stores sensitive credential fields in vault
 * 
 * @param credentials - Credentials object with { key: { value, sensitive } } structure
 * @param credentialId - Unique identifier for the credential
 * @param req - Express request object
 * @returns Transformed credentials with vault key references for sensitive fields
 */
export async function storeSensitiveFieldsInVault(
  credentials: Record<string, { value: string; sensitive: boolean }>,
  credentialId: string,
  req: Request
): Promise<Record<string, string>> {
  const transformedCredentials: Record<string, string> = {};
  const storePromises: Array<Promise<any>> = [];

  for (const [fieldKey, fieldData] of Object.entries(credentials)) {
    const { value, sensitive } = fieldData;

    if (sensitive && value) {
      // Store sensitive field in vault
      const vaultKeyName = `${credentialId}_${fieldKey}`;
      const keyData = {
        team: req?._team?.id,
        owner: req?._user?.email,
        name: vaultKeyName,
        key: value,
        scope: [VAULT_SCOPE_CREDENTIALS],
      };

      const storePromise = vault.set({
        req,
        data: keyData,
        keyId: vaultKeyName,
      }).then((result) => {
        if (!result?.success) {
          console.error(`Failed to store sensitive field ${fieldKey} in vault:`, result?.error);
          throw new Error(`Failed to store sensitive field ${fieldKey} in vault: ${result?.error}`);
        }
        return result;
      });

      storePromises.push(storePromise);
      transformedCredentials[fieldKey] = `{{KEY(${vaultKeyName})}}`;
    } else {
      // Non-sensitive field - store as-is
      transformedCredentials[fieldKey] = value;
    }
  }

  try {
    await Promise.all(storePromises);
  } catch (error) {
    console.error('Failed to store sensitive fields in vault:', error);
    throw new Error('Failed to store sensitive fields in vault');
  }

  return transformedCredentials;
}

/**
 * Deletes vault keys associated with credential fields
 * 
 * @param credentials - Credentials object that may contain vault key references
 * @param teamId - Team ID
 * @param req - Express request object
 */
export async function deleteVaultKeysFromCredentials(
  credentials: Record<string, any>,
  teamId: string,
  req: Request
): Promise<void> {
  const vaultKeys: string[] = [];

  // Find all vault key references in credentials
  for (const value of Object.values(credentials)) {
    if (typeof value === 'string') {
      const keyName = isVaultKey(value);
      if (keyName) {
        vaultKeys.push(keyName);
      }
    }
  }

  if (vaultKeys.length === 0) {
    return;
  }

  console.log('[Credentials] Deleting vault keys:', vaultKeys);

  await Promise.all(
    vaultKeys.map(async (keyName) => {
      const result = await vault.delete(keyName, teamId, req);
      console.log(`[Credentials] Deleted vault key ${keyName}:`, result);
    })
  );
}

/**
 * Resolves vault key references in credentials to actual values
 * Used when editing credentials to show actual values to the user
 * 
 * @param credentials - Credentials object that may contain vault key references
 * @param req - Express request object
 * @returns Credentials with resolved values
 */
export async function resolveVaultKeys(
  credentials: Record<string, string>,
  req: Request
): Promise<Record<string, string>> {
  const resolvedCredentials: Record<string, string> = {};
  const resolvePromises: Array<Promise<void>> = [];

  for (const [fieldKey, fieldValue] of Object.entries(credentials)) {
    const keyName = isVaultKey(fieldValue);

    if (keyName) {
      // This is a vault key reference - resolve it
      const resolvePromise = (async () => {
        try {
          const teamId = req?._team?.id;
          const vaultValue = await vault.get({ team: teamId, keyName }, req);

          if (vaultValue && vaultValue.key) {
            resolvedCredentials[fieldKey] = vaultValue.key;
          } else {
            // If resolution fails, keep the placeholder
            resolvedCredentials[fieldKey] = '[VAULT KEY NOT FOUND]';
            console.warn(`[Credentials] Failed to resolve vault key ${keyName}`);
          }
        } catch (error) {
          console.error(`[Credentials] Error resolving vault key ${keyName}:`, error);
          resolvedCredentials[fieldKey] = '[VAULT KEY ERROR]';
        }
      })();

      resolvePromises.push(resolvePromise);
    } else {
      // Not a vault key - use as-is
      resolvedCredentials[fieldKey] = fieldValue;
    }
  }

  await Promise.all(resolvePromises);
  return resolvedCredentials;
}

/**
 * Sanitizes credentials by replacing sensitive fields with placeholders
 * Used when returning credentials to frontend (except when editing)
 * 
 * @param credentials - Credentials object
 * @returns Sanitized credentials with [REDACTED] for vault key references
 */
export function sanitizeCredentials(credentials: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [fieldKey, fieldValue] of Object.entries(credentials)) {
    if (isVaultKey(fieldValue)) {
      sanitized[fieldKey] = '[REDACTED]';
    } else {
      sanitized[fieldKey] = fieldValue;
    }
  }

  return sanitized;
}

