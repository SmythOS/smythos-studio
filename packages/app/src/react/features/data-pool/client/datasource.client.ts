/**
 * Datasource API Client
 *
 * Handles all datasource-related API calls
 */

import type {
  CreateDatasourceRequest,
  CreateDatasourceResponse,
  Datasource,
  ListDatasourcesResponse,
} from '../types/datasource.types';

/**
 * Helper to extract error messages from various error structures
 */
const extractErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (typeof error === 'object' && error !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorObj = error as Record<string, any>;

    if (
      typeof errorObj.error === 'object' &&
      errorObj.error !== null &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (errorObj.error as Record<string, any>).error === 'string'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (errorObj.error as Record<string, any>).error;
    }

    if (typeof errorObj.error === 'string') {
      return errorObj.error;
    }

    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
};

export const datasourceClient = {
  /**
   * List all datasources for a namespace
   */
  listDatasources: async (namespaceLabel: string): Promise<Datasource[]> => {
    try {
      const response = await fetch(
        `/api/page/datapool/namespaces/${encodeURIComponent(namespaceLabel)}/datasources`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = extractErrorMessage(errorData, 'Failed to fetch datasources');
        throw new Error(errorMessage);
      }

      const result: ListDatasourcesResponse = await response.json();
      return result.datasources || [];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch datasources');
    }
  },

  /**
   * Create a new datasource
   */
  createDatasource: async (
    namespaceLabel: string,
    request: CreateDatasourceRequest,
  ): Promise<Datasource> => {
    try {
      const formData = new FormData();
      formData.append('datasourceLabel', request.datasourceLabel);
      formData.append('file', request.file);
      
      if (request.chunkSize !== undefined) {
        formData.append('chunkSize', String(request.chunkSize));
      }
      if (request.chunkOverlap !== undefined) {
        formData.append('chunkOverlap', String(request.chunkOverlap));
      }
      if (request.metadata !== undefined) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      const response = await fetch(
        `/api/page/datapool/namespaces/${encodeURIComponent(namespaceLabel)}/datasources`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = extractErrorMessage(errorData, 'Failed to create datasource');
        throw new Error(errorMessage);
      }

      const result: CreateDatasourceResponse = await response.json();
      return result.datasource;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create datasource');
    }
  },

  /**
   * Delete a datasource
   */
  deleteDatasource: async (namespaceLabel: string, datasourceId: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/page/datapool/namespaces/${encodeURIComponent(namespaceLabel)}/datasources/${encodeURIComponent(datasourceId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = extractErrorMessage(errorData, 'Failed to delete datasource');
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete datasource');
    }
  },
};

