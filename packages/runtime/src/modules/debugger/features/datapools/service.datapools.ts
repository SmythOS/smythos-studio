import { Doc } from '@smythos/sdk';
import {
  AccessCandidate,
  ConnectorService,
  DataSourceCompError,
  DataSourceComponent,
  EmbeddingsFactory,
  NsRecord,
  TDataSourceCompErrorCodes,
  VectorDBConnector,
} from '@smythos/sre';
import { unlink } from 'fs/promises';

const baseDataSourceComponent = new DataSourceComponent();

export const createNamespace = async ({
  label,
  credentialId,
  embeddings,
  teamId,
}: {
  label: string;
  credentialId: string;
  embeddings: any;
  teamId: string;
}) => {
  // const { label, credentialId} = req.body;
  const candidate = AccessCandidate.team(teamId);
  const nkvConnector = ConnectorService.getNKVConnector();
  const nkvClient = nkvConnector.requester(candidate);

  // check if namespace already exists
  const existingNamespace = await nkvClient.exists(`vectorDB:namespaces`, label);
  if (existingNamespace) {
    throw new Error('Namespace already exists');
  }

  const nsRecord: NsRecord = {
    credentialId,
    embeddings,
    label,
    createdAt: new Date().toISOString(),
  };

  const vecDbConnector = await baseDataSourceComponent.resolveVectorDbConnector(nsRecord, teamId);
  const vecDbClient = vecDbConnector.requester(candidate);

  await vecDbClient.createNamespace(label);

  // store namespace in nkv
  await nkvClient.set(`vectorDB:namespaces`, label, JSON.stringify(nsRecord));
};

export const listNamespaces = async ({ teamId }: { teamId: string }) => {
  // list all namespaces from nkv
  const nkvConnector = ConnectorService.getNKVConnector();
  const nkvClient = nkvConnector.requester(AccessCandidate.team(teamId));
  // delete all for now
  const namespaces = (await nkvClient.list(`vectorDB:namespaces`))
    .map(namespace => {
      try {
        return JSON.parse(namespace.data);
      } catch (error) {
        return null;
      }
    })
    .filter(namespace => namespace !== null);
  return namespaces;
};

export const deleteNamespace = async ({ teamId, label }: { teamId: string; label: string }) => {
  const nkvConnector = ConnectorService.getNKVConnector();
  const nkvClient = nkvConnector.requester(AccessCandidate.team(teamId));

  let vecDbConnector: VectorDBConnector;
  try {
    vecDbConnector = await baseDataSourceComponent.resolveVectorDbConnector(label, teamId);

    const vecDbClient = vecDbConnector.requester(AccessCandidate.team(teamId));
    await vecDbClient.deleteNamespace(label);
  } catch (error) {
    if (error instanceof DataSourceCompError && error.code === TDataSourceCompErrorCodes.CREDENTIAL_NOT_FOUND) {
      console.warn(
        `[DataPools] Credential not found for namespace ${label}, deleting namespace from nkv ONLY. Orphan datasources will be deleted later.`,
      );
    } else {
      throw error;
    }
  }

  // delete namespace from nkv
  await nkvClient.delete(`vectorDB:namespaces`, label);
};

export const listEmbeddingsModels = async () => {
  // Combine all models from all providers into a flat array
  const models = EmbeddingsFactory.getModels();

  return models.map(model => ({
    ...model,
    label: `${model.model} (${model.provider})`,
  }));
};

/**
 * Create a datasource in a namespace
 */
export const createDatasource = async ({
  datasourceLabel,
  namespaceLabel,
  chunkSize,
  chunkOverlap,
  metadata,
  file,
  teamId,
}: {
  datasourceLabel: string;
  namespaceLabel: string;
  chunkSize?: number | string;
  chunkOverlap?: number | string;
  metadata?: Record<string, any>;
  file: Express.Multer.File;
  teamId: string;
}) => {
  const candidate = AccessCandidate.team(teamId);
  const nkvConnector = ConnectorService.getNKVConnector();
  const nkvClient = nkvConnector.requester(candidate);

  // Verify namespace exists
  const namespaceExists = await nkvClient.exists(`vectorDB:namespaces`, namespaceLabel);
  if (!namespaceExists) {
    throw new Error('Namespace not found');
  }

  // log some info about the file
  console.log('[DataPools] Creating datasource:', {
    datasourceLabel,
    namespaceLabel,
    file: file.originalname,
    teamId,
  });

  const path = file.path;
  const doc = await Doc.auto.parse(path);

  console.log('[DataPools] Document parsed:', doc);

  const vecDbConnector = await baseDataSourceComponent.resolveVectorDbConnector(namespaceLabel, teamId);
  const vecDbClient = vecDbConnector.requester(AccessCandidate.team(teamId));

  const finalText = doc.pages.map(page => page.content.map(content => content.text).join(' ')).join(' ');

  // Parse chunk parameters if provided
  const parsedChunkSize = chunkSize ? (typeof chunkSize === 'string' ? parseInt(chunkSize, 10) : chunkSize) : undefined;
  const parsedChunkOverlap = chunkOverlap ? (typeof chunkOverlap === 'string' ? parseInt(chunkOverlap, 10) : chunkOverlap) : undefined;

  // Merge document metadata with custom metadata
  const finalMetadata = {
    title: doc.title,
    author: doc.metadata.author,
    date: doc.metadata.date,
    tags: doc.metadata.tags,
    ...(metadata || {}), // Custom metadata takes precedence
  };

  await vecDbClient
    .createDatasource(namespaceLabel, {
      label: datasourceLabel,
      text: finalText,
      chunkSize: parsedChunkSize,
      chunkOverlap: parsedChunkOverlap,
      metadata: finalMetadata,
    })
    .finally(() => {
      // delete the file from the temp directory after processing
      unlink(path)
        .then(() => {
          console.log('[DataPools] File deleted:', path);
        })
        .catch(error => {
          console.error('[DataPools] Error deleting file:', error);
        });
    });

  return { success: true };
};

/**
 * List all datasources in a namespace
 */
export const listDatasources = async ({ namespaceLabel, teamId }: { namespaceLabel: string; teamId: string }) => {
  const candidate = AccessCandidate.team(teamId);

  const vecDbConnector = await baseDataSourceComponent.resolveVectorDbConnector(namespaceLabel, teamId);
  const vecDbClient = vecDbConnector.requester(AccessCandidate.team(teamId));

  const datasources = await vecDbClient.listDatasources(namespaceLabel);

  return datasources;
};

/**
 * Delete a datasource from a namespace
 */
export const deleteDatasource = async ({
  datasourceId,
  namespaceLabel,
  teamId,
}: {
  datasourceId: string;
  namespaceLabel: string;
  teamId: string;
}) => {
  console.log('[DataPools] Delete datasource (dummy implementation):', {
    datasourceId,
    namespaceLabel,
    teamId,
  });

  const vecDbConnector = await baseDataSourceComponent.resolveVectorDbConnector(namespaceLabel, teamId);
  const vecDbClient = vecDbConnector.requester(AccessCandidate.team(teamId));
  await vecDbClient.deleteDatasource(namespaceLabel, datasourceId);

  return { success: true };
};
