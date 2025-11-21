/**
 * Data Pool Context
 *
 * Provides shared state for the Data Pool feature
 */

import { createContext, FC, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useCredentials } from '../../credentials/hooks/use-credentials';
import type { CredentialConnection } from '../../credentials/components/create-credentials.modal';
import type { Namespace, NamespaceWithProvider } from '../types';

interface DataPoolContextValue {
  // Credentials
  credentials: CredentialConnection[];
  credentialsLoading: boolean;
  credentialsError: string | undefined;
  refetchCredentials: () => void;

  // Helper to get credential by ID
  getCredentialById: (id: string) => CredentialConnection | undefined;

  // Helper to get provider name
  getProviderName: (credentialId: string) => string;

  // Helper to enrich namespace with provider info
  enrichNamespaceWithProvider: (namespace: Namespace) => NamespaceWithProvider;
}

const DataPoolContext = createContext<DataPoolContextValue | undefined>(undefined);

interface DataPoolProviderProps {
  children: ReactNode;
}

export const DataPoolProvider: FC<DataPoolProviderProps> = ({ children }) => {
  // Fetch vector database credentials
  const {
    credentials,
    isLoading: credentialsLoading,
    error: credentialsError,
    refetch: refetchCredentials,
  } = useCredentials('vector_db_creds');

  /**
   * Get credential by ID
   */
  const getCredentialById = (id: string): CredentialConnection | undefined => {
    return credentials.find((cred) => cred.id === id);
  };

  /**
   * Get provider name for a credential ID
   */
  const getProviderName = (credentialId: string): string => {
    const credential = getCredentialById(credentialId);
    if (!credential) return 'Unknown';

    // Map provider IDs to display names
    const providerNames: Record<string, string> = {
      piencone: 'Pinecone',
      'pinecone-1': 'Pinecone',
      milvus: 'Milvus',
      qdrant: 'Qdrant',
      pgvector: 'PGVector',
      weaviate: 'Weaviate',
      chroma: 'Chroma',
    };

    return providerNames[credential.provider] || credential.provider;
  };

  /**
   * Enrich namespace with provider information
   */
  const enrichNamespaceWithProvider = (namespace: Namespace): NamespaceWithProvider => {
    const credential = getCredentialById(namespace.credentialId);
    return {
      ...namespace,
      credential,
      provider: credential?.provider,
      providerName: getProviderName(namespace.credentialId),
    };
  };

  const value: DataPoolContextValue = {
    credentials,
    credentialsLoading,
    credentialsError,
    refetchCredentials,
    getCredentialById,
    getProviderName,
    enrichNamespaceWithProvider,
  };

  return <DataPoolContext.Provider value={value}>{children}</DataPoolContext.Provider>;
};

/**
 * Hook to use Data Pool context
 */
export const useDataPoolContext = (): DataPoolContextValue => {
  const context = useContext(DataPoolContext);
  if (!context) {
    throw new Error('useDataPoolContext must be used within DataPoolProvider');
  }
  return context;
};

