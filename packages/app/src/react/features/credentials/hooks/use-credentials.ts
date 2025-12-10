/**
 * Hook for managing credential connections
 *
 * Fetches and manages credential connections from the backend API.
 *
 * @module use-credentials
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { credentialsClient } from '../clients/credentials.client';
import type { CredentialConnection } from '../components/create-credentials.modal';

const INTERNAL_CREDENTIALS = {
  vector_db_creds: [
    {
      id: '__smythos_vectordb_cred__',
      name: 'SmythOS Pinecone',
      provider: 'Pinecone',
      credentials: {},
      createdAt: '2024-11-26T17:59:56.212Z',
      updatedAt: '2024-11-26T17:59:56.213Z',
      isReadOnly: true,
      isManaged: true,
    },
  ],
};

/**
 * Custom hook to fetch and manage credential connections
 *
 * @param group - Group filter (e.g., 'vector_database')
 * @returns Object containing credentials data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { credentials, isLoading, error, refetch } = useCredentials('vector_database');
 * ```
 */
export function useCredentials(group: string) {
  const [credentials, setCredentials] = useState<CredentialConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  /**
   * Fetch credentials from the API
   */
  const fetchCredentials = async () => {
    if (!group) {
      setCredentials([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const data = await credentialsClient.fetchCredentials(group);
      const internalCreds = INTERNAL_CREDENTIALS[group] || [];
      setCredentials([...internalCreds, ...data]);
    } catch (err: any) {
      console.error('Error fetching credentials:', err);
      setError(err.message || 'Failed to fetch credentials');
      setCredentials([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when group changes
  useEffect(() => {
    fetchCredentials();
  }, [group]);

  // Sort alphabetically by name
  const sortedCredentials = useMemo(() => {
    return [...credentials].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [credentials]);

  return {
    /** Array of credential connections */
    credentials: sortedCredentials,
    /** Whether credentials are currently loading */
    isLoading,
    /** Error message if fetch failed */
    error,
    /** Function to manually refetch credentials */
    refetch: fetchCredentials,
  };
}

/**
 * Get a single credential connection by ID
 *
 * @param id - The credential connection ID
 * @param group - The credential group
 * @returns Object with credential data, loading state, and error
 *
 * @example
 * ```tsx
 * const { credential, isLoading, error } = useCredentialById('cred-1', 'vector_database');
 * ```
 */
export function useCredentialById(
  id: string,
  group: string,
  options: { lazy?: boolean; resolveVaultKeys?: boolean } = {
    lazy: false,
    resolveVaultKeys: false,
  },
) {
  const [credential, setCredential] = useState<CredentialConnection | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(options.lazy ? false : true);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchCredential = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const data = await credentialsClient.fetchCredentialById(id, group, {
        resolveVaultKeys: options.resolveVaultKeys ?? false,
      });
      setCredential(data);
    } catch (err: any) {
      console.error('Error fetching credential:', err);
      setError(err.message || 'Failed to fetch credential');
      setCredential(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [id, group]);

  useEffect(() => {
    if (!id || !group) {
      setCredential(undefined);
      setIsLoading(false);
      return;
    }

    if (!options.lazy) {
      fetchCredential();
    }
  }, [id, group, options.lazy, fetchCredential]);

  // const fireFetch = useCallback(() => {
  //   fetchCredential();
  // }, [fetchCredential]);

  const getData = useCallback(async () => {
    if (options.lazy && !credential && !error && !isLoading) {
      await fetchCredential();
    }
    return credential;
  }, [options.lazy, fetchCredential, credential, error, isLoading]);

  return {
    // credential,
    isLoading,
    error,
    getData,
  };
}

/**
 * Get credentials by provider from a list
 *
 * @param credentials - Array of credentials
 * @param provider - The provider ID (e.g., 'piencone')
 * @returns Filtered array of credentials for that provider
 *
 * @example
 * ```tsx
 * const pineconeCredentials = useCredentialsByProvider(allCredentials, 'piencone');
 * ```
 */
export function useCredentialsByProvider(
  credentials: CredentialConnection[],
  provider: string,
): CredentialConnection[] {
  return useMemo(() => {
    return credentials.filter((cred) => cred.provider === provider);
  }, [credentials, provider]);
}
