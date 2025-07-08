import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import he from 'he';

import { isURL, isValidObj, getCursorFromLinkHeader, encodeBase64, decodeBase64 } from '../utils/';
import { supportedHfTasks } from '../config';
import { APIResponse, ModelsQueryParams } from '../types/';
import * as openai from './openai-helper';
import Cache from './Cache.class';
import Store from './Store.class';

const modelInfoCache = new Cache({ directory: 'hf-model-info' });
const modelResultCache = new Cache({ directory: 'hf-model-result' });
const store = new Store('huggingFace/leftover-result');

const _getModelLogo = async (modelName: string): Promise<string> => {
  try {
    const res = await axios.get(`https://huggingface.co/${modelName}`);

    const $ = await cheerioLoad(res?.data);
    const imageElement = $('main header h1 > div:first-child > div:first-child img');
    let logoUrl = imageElement.attr('src');

    if (logoUrl) {
      logoUrl = isURL(logoUrl) ? logoUrl : `https://huggingface.co${logoUrl}`;
    }

    return logoUrl;
  } catch {
    return '';
  }
};

const _generateModelDesc = async (modelTask: string, modelName: string) => {
  try {
    const data = await openai.chatRequest(
      `Task/Category - ${modelTask}\nModel Name - ${modelName}`,
      {
        model: 'gpt-4o-mini',
        max_tokens: 100,
        messages: [
          {
            role: 'system',
            content: `Guess the model description based on the given Task/Category and Model Name within 15 words`,
          },
        ],
      },
    );

    return data;
  } catch (error) {
    // If the OpenAI request fails, return an empty string. Throwing an error skips to the next model, but other model's information might still be available.
    return '';
  }
};

type ModelInfo = {
  id?: string;
  name?: string;
  desc?: string;
  logoUrl?: string;
  modelTask?: string;
  inference?: string | boolean;
};
/**
 * Crawl the model page and get the model info
 * This approach is more stable than the fallback approach with API
 * @param {string} modelName
 * @returns {object} model info
 */
const _crawlModelInfo = async (modelName: string): Promise<ModelInfo> => {
  try {
    const res = await axios.get(`https://huggingface.co/${modelName}`);

    const $ = await cheerioLoad(res?.data);

    const dataElm = $('main > .SVELTE_HYDRATER.contents');
    const data = dataElm.attr('data-props');
    const decodedStr = he.decode(data);
    const modelInfo = JSON.parse(decodedStr);

    const modelId = modelInfo?.model?.id;
    const modelTask = modelInfo?.model?.pipeline_tag;

    // Make sure we have the required info
    if (!modelId || !modelTask) return null;

    const inference = modelInfo?.model?.inference;

    let logoUrl = modelInfo?.author?.avatarUrl;

    if (logoUrl) {
      logoUrl = isURL(logoUrl) ? logoUrl : `https://huggingface.co${logoUrl}`;
    }

    if (!logoUrl) {
      logoUrl = await _getModelLogo(modelName);
    }

    const desc = await _generateModelDesc(modelTask, modelName);

    return {
      id: modelId,
      name: modelId,
      desc,
      logoUrl,
      modelTask,
      inference,
    };
  } catch {
    return null;
  }
};

const _fetchModel = async (modelName: string) => {
  try {
    const res = await axios.get(`https://huggingface.co/api/models/${modelName}`);
    return res?.data;
  } catch (error) {
    throw { message: error?.response?.data?.error || `Hugging Face Model not found!` };
  }
};

/**
 * If the crawling approach fails, then fallback to this approach
 * @param {string} modelName
 * @returns {object} model info
 */
const _fallbackModelInfo = async (modelName: string): Promise<ModelInfo> => {
  try {
    const model = await _fetchModel(modelName);

    const id = model?.id;
    const modelId = model?.modelId;
    const modelTask = model?.pipeline_tag;
    const inference = model?.cardData?.inference;

    const logoUrl = await _getModelLogo(modelName);

    const desc = await _generateModelDesc(modelTask, modelName);

    return {
      id,
      name: modelId,
      logoUrl,
      desc,
      modelTask,
      inference,
    };
  } catch (error) {
    throw error;
  }
};

type FetchModels = {
  limit: number;
  sort?: 'downloads' | 'author';
  search?: string;
  cursor?: string;
};

const _fetchModels = async ({
  limit = 100,
  sort = 'downloads',
  search = '',
  cursor = '',
}: FetchModels): Promise<{ data: Record<string, any>; cursors: Record<string, any> }> => {
  try {
    const url = `https://huggingface.co/api/models`;

    const params = {
      limit,
      direction: -1,
    };

    if (sort) params['sort'] = sort;

    if (search) params['search'] = search;

    if (cursor) params['cursor'] = cursor;

    const result = await axios.get(url, { params });

    const cursors = getCursorFromLinkHeader(result?.headers?.link);

    return { data: result?.data, cursors };
  } catch {
    return { data: [], cursors: {} };
  }
};

const _getModelInfo = async (modelName: string, modelTask: string): Promise<ModelInfo> => {
  try {
    let modelsInfo = await modelInfoCache.get(modelTask);
    modelsInfo = modelsInfo?.data;

    let modelInfo = {};

    // If we have the model info in cache, then return it
    if (isValidObj(modelsInfo)) {
      modelInfo = modelsInfo?.[modelName];

      if (isValidObj(modelInfo)) {
        return modelInfo;
      }
    }

    // If we don't have the model info in cache, then crawl it
    modelInfo = await _crawlModelInfo(modelName);

    // If crawling fails, then fallback to the API approach
    if (!modelInfo) {
      modelInfo = await _fallbackModelInfo(modelName);
    }

    // Update the cache
    if (isValidObj(modelInfo)) {
      modelInfoCache.update(modelTask, modelName, modelInfo);
    }

    return modelInfo;
  } catch (error) {
    throw error;
  }
};

const _getSupportedModels = async ({ limit, search, cursor }) => {
  const result = await _fetchModels({ limit, search, cursor });
  const models = result?.data;

  const supportedModels = models?.filter((model) => supportedHfTasks.includes(model?.pipeline_tag));
  const cursors = result?.cursors;

  return {
    data: supportedModels,
    cursors,
  };
};

type Cursors = {
  hf: {
    prev: string;
    next: string;
  };
  smyth: {
    next: string;
  };
};

type FilterModels = {
  ({
    retry,
    search,
    cursors,
    page,
  }: {
    retry: number;
    search: string;
    cursors: Cursors;
    page: number;
  }): Promise<{
    models: Record<string, any>[];
    cursors: Cursors;
  }>;
  filtered?: Record<string, any>[];
  modelWithInferenceAPI?: ModelInfo[];
  smythCursor?: Record<string, string>;
};

const _filterModels: FilterModels = async ({ retry = 0, search = '', cursors, page }) => {
  const limit = 100;
  const maxRetry = 20;

  const decodedSmythCursor = JSON.parse(decodeBase64(cursors?.smyth?.next) || '{}');

  let modelResult;
  let nextHfCursor;

  const prevHfCursor = cursors?.hf?.next || '';
  const leftoverCount = +decodedSmythCursor?.leftoverCount || 0;
  const leftoverPage = +decodedSmythCursor?.page || 1;

  if (leftoverCount > 0) {
    modelResult = await store.get(`models-${search || 'initial'}-${leftoverPage}`);

    nextHfCursor = modelResult?.cursors?.hf?.next || '';

    _filterModels.smythCursor = {
      next: encodeBase64(
        JSON.stringify({
          page: leftoverPage,
          leftoverCount: 0,
        }),
      ),
    };
  }

  if (!modelResult?.data?.length) {
    let cursor = cursors?.hf?.next || '';
    modelResult = await _getSupportedModels({ limit, search, cursor });

    nextHfCursor = modelResult?.cursors?.next || '';
  }

  const supportedModels = modelResult?.data || [];

  if (retry > maxRetry) {
    return {
      models: _filterModels.modelWithInferenceAPI,
      cursors: {
        hf: {
          prev: prevHfCursor || '',
          next: nextHfCursor || '',
        },
        smyth: {
          next: _filterModels.smythCursor?.next || '',
        },
      },
    };
  }

  _filterModels.filtered = _filterModels.filtered?.length
    ? [..._filterModels.filtered, ...supportedModels]
    : supportedModels;

  if (nextHfCursor && _filterModels.filtered?.length < 8) {
    return _filterModels({
      retry: retry + 1,
      search,
      cursors: {
        hf: {
          prev: prevHfCursor || '',
          next: nextHfCursor || '',
        },
        smyth: {
          next: _filterModels.smythCursor?.next || '',
        },
      },
      page,
    });
  }

  for (const [index, model] of _filterModels.filtered?.entries()) {
    try {
      const modelInfo = await _getModelInfo(model.modelId, model.pipeline_tag);

      // The order of the break logic is important to have the correct value for startIndex in the smythCursor
      if (_filterModels.modelWithInferenceAPI?.length >= 8) {
        _filterModels.smythCursor = {
          next: encodeBase64(
            JSON.stringify({
              page,
              leftoverCount: _filterModels.filtered?.length - index,
            }),
          ),
        };

        const leftOverItems = _filterModels.filtered?.slice(index);

        store.set(`models-${search || 'initial'}-${page}`, {
          data: leftOverItems,
          cursors: {
            hf: {
              prev: prevHfCursor || '',
              next: nextHfCursor || '',
            },
            smyth: {
              next: _filterModels.smythCursor?.next || '',
            },
          },
        });

        break;
      }

      if (
        modelInfo?.inference &&
        modelInfo?.inference !== 'false' &&
        !/not/i.test(modelInfo?.inference as string)
      ) {
        _filterModels.modelWithInferenceAPI = _filterModels.modelWithInferenceAPI?.length
          ? [..._filterModels.modelWithInferenceAPI, modelInfo]
          : [modelInfo];
      }
    } catch {
      // If the model info is not found, then continue to the next model
      continue;
    }
  }

  if (nextHfCursor && _filterModels.modelWithInferenceAPI?.length < 8) {
    return _filterModels({
      retry: retry + 1,
      search,
      cursors: {
        hf: {
          prev: prevHfCursor || '',
          next: nextHfCursor || '',
        },
        smyth: {
          next: _filterModels.smythCursor?.next || '',
        },
      },
      page,
    });
  }

  return {
    models: _filterModels.modelWithInferenceAPI,
    cursors: {
      hf: {
        prev: prevHfCursor || '',
        next: nextHfCursor || '',
      },
      smyth: {
        next: _filterModels.smythCursor?.next || '',
      },
    },
  };
};

export async function getModelInfo(modelName: string): Promise<APIResponse> {
  try {
    const model = await _fetchModel(modelName);

    const modelInfo = await _getModelInfo(modelName, model?.pipeline_tag);

    return { success: true, data: modelInfo };
  } catch (error) {
    return { success: false, error: error?.message || `Hugging Face Model not found!` };
  }
}

const _fetchAndCacheModels = async ({
  search,
  page,
  hf_cursor_prev,
  hf_cursor_next,
  smyth_cursor_next,
}: ModelsQueryParams) => {
  const res = await _filterModels({
    retry: 0,
    search,
    cursors: {
      hf: {
        prev: hf_cursor_prev || '',
        next: hf_cursor_next || '',
      },
      smyth: {
        next: smyth_cursor_next || '',
      },
    },
    page,
  });
  const models = res?.models || [];
  const cursors = res?.cursors || {};

  // Set the cache for 7 days ie. 7 * 24 * 60 * 60 = 604800 seconds
  if (models?.length > 0) {
    modelResultCache.set(`${search || 'initial'}-page-${page}`, { models, cursors }, 604800);
  }

  return { models, cursors };
};

export async function getModels(params: ModelsQueryParams): Promise<APIResponse> {
  try {
    const { search, page } = params;

    // Reset global variables
    _filterModels.modelWithInferenceAPI = [];
    _filterModels.filtered = [];

    // Check if we have the models in cache
    let cachedResult = await modelResultCache.get(`${search || 'initial'}-page-${page}`);
    let models = cachedResult?.data?.models || [];

    if (models && Array.isArray(models) && models.length > 0) {
      // If the cache is expired, then fetch the models and update the cache
      if (cachedResult?.expired) {
        _fetchAndCacheModels(params);
      }
      // Return the cached models even it is expired
      return {
        success: true,
        data: {
          models,
          cursors: cachedResult?.data?.cursors,
        },
      };
    }

    // If we don't have the models in cache, then fetch them
    const res = await _fetchAndCacheModels(params);
    models = res?.models || [];
    const cursors = res?.cursors || {};

    return { success: true, data: { models, cursors } };
  } catch {
    return { success: false, error: `Hugging Face Models not found!` };
  }
}
