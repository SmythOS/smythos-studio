/**
 * Data Pool API Client
 *
 * Handles API calls for data pool/namespace management
 */

import type {
  CreateNamespaceRequest,
  CreateNamespaceResponse,
  EmbeddingModel,
  ListNamespacesResponse,
  Namespace,
} from '../types';

/**
 * Extract error message from nested error structure
 */
export const extractErrorMessage = (error: unknown, defaultMessage: string): string => {
  console.log('error', error);
  // Type guard to check if error is an object
  let extractedMessage = defaultMessage;

  if (typeof error === 'object' && error !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorObj = error as Record<string, any>;

    if (typeof error === 'string') {
      extractedMessage = error;
    } else if (typeof errorObj.error === 'string') {
      extractedMessage = errorObj.error;
    } else if (
      typeof errorObj.error === 'object' &&
      errorObj.error !== null &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (errorObj.error as Record<string, any>).error === 'string'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extractedMessage = (errorObj.error as Record<string, any>).error;
    } else if (typeof errorObj.message === 'string') {
      extractedMessage = errorObj.message;
    }

    if (extractedMessage.includes('Please provide an API key')) {
      extractedMessage = extractedMessage.replace(
        'via credentials or GOOGLE_AI_API_KEY environment variable',
        'via the Vault page',
      );
    }
  }

  // Handle string error

  return extractedMessage;
};

export const dataPoolClient = {
  /**
   * Fetch all namespaces
   */
  listNamespaces: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ListNamespacesResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const url = `/api/page/datapool/namespaces${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorData;
      }

      const result = await response.json();
      // sort by createdAt
      result.namespaces.sort((a: Namespace, b: Namespace) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(extractErrorMessage(error, 'Failed to create namespace'));
    }
  },

  /**
   * Create a new namespace
   */
  createNamespace: async (data: CreateNamespaceRequest): Promise<Namespace> => {
    try {
      const response = await fetch('/api/page/datapool/namespaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error('Failed to create namespace. Server returned an invalid response.');
        }

        const errorMessage = extractErrorMessage(errorData, 'Failed to create namespace');
        throw new Error(errorMessage);
      }

      const result: CreateNamespaceResponse = await response.json();
      return result.namespace;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      if (error.status === 403) {
        throw new Error('You don\'t have permission to create a new data space');
      }
      throw new Error(extractErrorMessage(error, 'Failed to create namespace'));
    }
  },

  /**
   * Fetch all available embedding models
   */
  listEmbeddingModels: async (): Promise<EmbeddingModel[]> => {
    try {
      const response = await fetch('/api/page/datapool/embeddings/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorData;
      }

      const result = await response.json();
      return result.models || [];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(extractErrorMessage(error, 'Failed to fetch embedding models'));
    }
  },

  /**
   * Delete a namespace
   */
  deleteNamespace: async (label: string): Promise<void> => {
    try {
      const response = await fetch(`/api/page/datapool/namespaces/${encodeURIComponent(label)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = extractErrorMessage(errorData, 'Failed to delete namespace');
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      if (error.status === 403) {
        throw new Error('You don\'t have permission to delete this data space');
      }
      throw new Error('Failed to delete namespace');
    }
  },
};
