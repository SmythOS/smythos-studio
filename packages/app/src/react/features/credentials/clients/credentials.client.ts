/**
 * Credentials Service
 *
 * Handles API calls for credential management
 */

import type { CredentialConnection } from '../components/create-credentials.modal';

/**
 * Credential field with sensitivity metadata
 */
export interface CredentialFieldValue {
  value: string;
  sensitive: boolean;
}

/**
 * Credentials with metadata for vault storage
 */
export type CredentialsWithMetadata = Record<string, CredentialFieldValue>;

export const credentialsClient = {
  /**
   * Fetch all credentials for a specific group
   */
  fetchCredentials: async (group: string): Promise<CredentialConnection[]> => {
    try {
      const response = await fetch(`/api/app/credentials?group=${encodeURIComponent(group)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch credentials:', response.statusText);
        throw new Error('Failed to fetch credentials');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw new Error(error.message || 'Failed to fetch credentials');
    }
  },

  /**
   * Fetch a single credential by ID
   */
  fetchCredentialById: async (id: string, group: string): Promise<CredentialConnection> => {
    try {
      const response = await fetch(
        `/api/app/credentials/${encodeURIComponent(id)}?group=${encodeURIComponent(group)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        console.error('Failed to fetch credential:', response.statusText);
        throw new Error('Failed to fetch credential');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching credential:', error);
      throw new Error(error.message || 'Failed to fetch credential');
    }
  },

  /**
   * Fetch a credential by ID with resolved vault keys (for editing)
   */
  fetchCredentialForEdit: async (id: string, group: string): Promise<CredentialConnection> => {
    try {
      const response = await fetch(
        `/api/app/credentials/${encodeURIComponent(id)}?group=${encodeURIComponent(group)}&resolveVaultKeys=true`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        console.error('Failed to fetch credential for edit:', response.statusText);
        throw new Error('Failed to fetch credential for edit');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching credential for edit:', error);
      throw new Error(error.message || 'Failed to fetch credential for edit');
    }
  },

  /**
   * Create a new credential
   */
  createCredential: async (data: {
    group: string;
    name: string;
    provider: string;
    credentials: CredentialsWithMetadata;
  }): Promise<CredentialConnection> => {
    try {
      const response = await fetch('/api/app/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create credential:', errorData);
        throw new Error(errorData.error || 'Failed to create credential');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error creating credential:', error);
      throw new Error(error.message || 'Failed to create credential');
    }
  },

  /**
   * Update an existing credential
   */
  updateCredential: async (
    id: string,
    data: {
      group: string;
      name: string;
      provider: string;
      credentials: CredentialsWithMetadata;
    },
  ): Promise<CredentialConnection> => {
    try {
      const response = await fetch(`/api/app/credentials/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to update credential:', errorData);
        throw new Error(errorData.error || 'Failed to update credential');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating credential:', error);
      throw new Error(error.message || 'Failed to update credential');
    }
  },

  /**
   * Delete a credential
   */
  deleteCredential: async (id: string, group: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/app/credentials/${encodeURIComponent(id)}?group=${encodeURIComponent(group)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to delete credential:', errorData);
        throw new Error(errorData.error || 'Failed to delete credential');
      }
    } catch (error) {
      console.error('Error deleting credential:', error);
      throw new Error(error.message || 'Failed to delete credential');
    }
  },
};
