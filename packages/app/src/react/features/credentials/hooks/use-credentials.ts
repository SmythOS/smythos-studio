/**
 * Hook for managing credential connections
 * 
 * Currently returns hardcoded data for demonstration.
 * In production, this would fetch from an API endpoint.
 * 
 * @module use-credentials
 */

import { useMemo } from 'react';
import type { CredentialConnection } from '../components/create-credentials.modal';

/**
 * Hardcoded credential connections for demonstration
 * In production, this would be fetched from an API
 */
const MOCK_CREDENTIALS: CredentialConnection[] = [
  {
    id: 'cred-1',
    name: 'Production Pinecone',
    provider: 'piencone',
    group: 'vector_database',
    credentials: {
      api_key: '••••••••••••••••',
      index_name: 'production-index',
    },
    isActive: true,
  },
  {
    id: 'cred-2',
    name: 'Development Pinecone',
    provider: 'piencone',
    group: 'vector_database',
    credentials: {
      api_key: '••••••••••••••••',
      index_name: 'dev-index',
    },
    isActive: true,
  },
  {
    id: 'cred-3',
    name: 'Staging Vector DB',
    provider: 'piencone',
    group: 'vector_database',
    credentials: {
      api_key: '••••••••••••••••',
      index_name: 'staging-index',
    },
    isActive: false,
  },
];

/**
 * Custom hook to fetch and manage credential connections
 * 
 * @param group - Optional group filter (e.g., 'vector_database')
 * @returns Object containing credentials data and loading state
 * 
 * @example
 * ```tsx
 * const { credentials, isLoading } = useCredentials('vector_database');
 * ```
 */
export function useCredentials(group?: string) {
  // Simulate loading state
  const isLoading = false;

  // Filter by group if provided
  const credentials = useMemo(() => {
    if (!group) {
      return MOCK_CREDENTIALS;
    }
    return MOCK_CREDENTIALS.filter((cred) => cred.group === group);
  }, [group]);

  // Sort alphabetically by name
  const sortedCredentials = useMemo(() => {
    return [...credentials].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [credentials]);

  return {
    /** Array of credential connections */
    credentials: sortedCredentials,
    /** Whether credentials are currently loading */
    isLoading,
    /** Error if fetch failed (currently always undefined for mock data) */
    error: undefined,
  };
}

/**
 * Get a single credential connection by ID
 * 
 * @param id - The credential connection ID
 * @returns The credential connection or undefined if not found
 * 
 * @example
 * ```tsx
 * const credential = useCredentialById('cred-1');
 * ```
 */
export function useCredentialById(id: string): CredentialConnection | undefined {
  return useMemo(() => {
    return MOCK_CREDENTIALS.find((cred) => cred.id === id);
  }, [id]);
}

/**
 * Get credentials by provider
 * 
 * @param provider - The provider ID (e.g., 'piencone')
 * @returns Array of credentials for that provider
 * 
 * @example
 * ```tsx
 * const pineconeCredentials = useCredentialsByProvider('piencone');
 * ```
 */
export function useCredentialsByProvider(provider: string): CredentialConnection[] {
  return useMemo(() => {
    return MOCK_CREDENTIALS.filter((cred) => cred.provider === provider);
  }, [provider]);
}

