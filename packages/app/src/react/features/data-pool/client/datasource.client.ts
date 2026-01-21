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
import { extractErrorMessage } from './datapool.client';

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
        throw errorData;
      }

      const result: CreateDatasourceResponse = await response.json();
      return result.datasource;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      if (error.status === 403) {
        throw new Error('You don\'t have permission to create a new datasource');
      }
      throw new Error(extractErrorMessage(error, 'Failed to create datasource'));
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
      if (error.status === 403) {
        throw new Error('You don\'t have permission to delete this datasource');
      }
      throw new Error('Failed to delete datasource');
    }
  },
};
