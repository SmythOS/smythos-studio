/**
 * Datasource Types
 */

export interface Datasource {
  namespaceId: string;
  // indexName: string;
  name: string;
  metadata: string;
  text?: string;
  vectorIds: string[];
  id: string;
  candidateId: string;
  candidateRole: string;
  datasourceSizeMb?: number;
  createdAt?: Date;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface CreateDatasourceRequest {
  datasourceLabel: string;
  file: File;
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateDatasourceResponse {
  datasource: Datasource;
}

export interface ListDatasourcesResponse {
  datasources: Datasource[];
}
