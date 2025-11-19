/**
 * Data Pool Types
 */

import type { CredentialConnection } from '../../credentials/components/create-credentials.modal';

/**
 * Namespace entity from the API
 */
export interface Namespace {
  namespaceId: string;
  label: string;
  credentialId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Namespace with resolved credential info
 */
export interface NamespaceWithProvider extends Namespace {
  provider?: string;
  providerName?: string;
  credential?: CredentialConnection;
}

/**
 * API Response for listing namespaces
 */
export interface ListNamespacesResponse {
  namespaces: Namespace[];
  total: number;
}

/**
 * API Response for creating a namespace
 */
export interface CreateNamespaceResponse {
  namespace: Namespace;
}

/**
 * Embedding model from API
 */
export interface EmbeddingModel {
  provider: string;
  model: string;
  label: string;
}

/**
 * Request payload for creating a namespace
 */
export interface CreateNamespaceRequest {
  label: string;
  credentialId: string;
  embeddings?: {
    modelId: string;
    dimensions?: number;
  };
}

/**
 * Default pagination limit for namespace list
 */
export const DEFAULT_PAGINATION_LIMIT = 10;

/**
 * Re-export datasource types
 */
export type {
  Datasource,
  CreateDatasourceRequest,
  CreateDatasourceResponse,
  ListDatasourcesResponse,
} from './datasource.types';

