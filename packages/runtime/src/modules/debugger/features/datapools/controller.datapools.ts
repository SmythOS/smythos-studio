import * as datapoolsService from './service.datapools';

export const createNamespace = async (req, res) => {
  const teamId = res.locals.user?.teamId;
  const { label, credentialId, embeddings } = req.body;
  const namespace = await datapoolsService.createNamespace({ label, credentialId, embeddings, teamId });
  res.json(namespace);
};

export const listNamespaces = async (req, res) => {
  const teamId = res.locals.user?.teamId;
  const namespaces = await datapoolsService.listNamespaces({ teamId });
  res.json({ namespaces });
};

export const deleteNamespace = async (req, res) => {
  const teamId = res.locals.user?.teamId;
  const { label } = req.params;
  await datapoolsService.deleteNamespace({ label, teamId });
  res.json({ message: 'Namespace deleted successfully' });
};

export const listEmbeddingsModels = async (req, res) => {
  const teamId = res.locals.user?.teamId;
  const models = await datapoolsService.listEmbeddingsModels();
  res.json({ models });
};

/**
 * Create a datasource in a namespace
 */
export const createDatasource = async (req, res) => {
  const teamId = res.locals.user?.teamId;
  const { namespaceLabel } = req.params;
  const { datasourceLabel, chunkSize, chunkOverlap, metadata } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!datasourceLabel) {
    return res.status(400).json({ error: 'datasourceLabel is required' });
  }

  // Parse metadata if provided
  let parsedMetadata;
  if (metadata) {
    try {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid metadata JSON' });
    }
  }

  // Log file information
  console.log('[DataPools] File uploaded:', {
    path: file.path,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    datasourceLabel,
    namespaceLabel,
    chunkSize: chunkSize ? parseInt(chunkSize, 10) : undefined,
    chunkOverlap: chunkOverlap ? parseInt(chunkOverlap, 10) : undefined,
    metadata: parsedMetadata,
  });

  const datasource = await datapoolsService.createDatasource({
    datasourceLabel,
    namespaceLabel,
    chunkSize,
    chunkOverlap,
    metadata: parsedMetadata,
    file,
    teamId,
  });

  res.json({ datasource });
};

/**
 * List datasources by namespace label
 */
export const listDatasources = async (req, res) => {
  const teamId = res.locals.user?.teamId;
  const { namespaceLabel } = req.params;

  if (!namespaceLabel) {
    return res.status(400).json({ error: 'namespaceLabel is required' });
  }

  const datasources = await datapoolsService.listDatasources({
    namespaceLabel,
    teamId,
  });

  res.json({ datasources });
};

/**
 * Delete a datasource from a namespace
 */
export const deleteDatasource = async (req, res) => {
  const teamId = res.locals.user?.teamId;
  const { namespaceLabel, datasourceId } = req.params;

  if (!datasourceId || !namespaceLabel) {
    return res.status(400).json({ error: 'datasourceId and namespaceLabel are required' });
  }

  const result = await datapoolsService.deleteDatasource({
    datasourceId,
    namespaceLabel,
    teamId,
  });

  res.json({ message: 'Datasource deleted successfully', result });
};
