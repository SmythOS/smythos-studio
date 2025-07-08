import { apiPayloadTypes, apiResultsTypes } from '@react/shared/types';

export const DEFAULT_PAGINATION_LIMIT = 9;

export const getDatasources = async (namespaceName: string, page: number) => {
  const res = await fetch(
    `/api/page/vectors/datasourceList?namespaceName=${namespaceName}&page=${page}&limit=${DEFAULT_PAGINATION_LIMIT}`,
  );
  const json = await res.json();
  return json?.res;
};

export const addDatasource = async ({ body }: { body: any }) => {
  const res = await fetch(`/api/page/vectors/addDatasource`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json;
};

export const deleteDatasource = async ({ id }: { id: string | number }) => {
  const res = await fetch(`/api/page/vectors/deleteDatasource?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  return json;
};

export const getDSStatus = async (
  id: string | number,
): Promise<apiResultsTypes.DatasourceStatus> => {
  const res = await fetch(`/api/page/vectors/datasourceStatus?id=${id}`);
  const json = await res.json();
  return json?.res;
};

export const getDSSitemapStatus = async (
  id: string | number,
): Promise<apiResultsTypes.DatasourceSitemapStatus> => {
  const res = await fetch(`/api/page/vectors/sitemapStatus?id=${id}`);
  const json = await res.json();
  return json?.res;
};

export const getVectorsCustomStorage = async () => {
  const res = await fetch('/api/page/vectors/custom_storage');
  const json = await res.json();
  return json as apiResultsTypes.VectorsCustomStorage;
};

export const saveCustomVectorStorage = async (payload: apiPayloadTypes.SaveCustomVectorStorage) => {
  const res = await fetch('/api/page/vectors/custom_storage', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  return json;
};

export const deleteCustomVectorStorage = async () => {
  const res = await fetch('/api/page/vectors/custom_storage', {
    method: 'DELETE',
  });
  const json = await res.json();
  return json;
};