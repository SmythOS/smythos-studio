import { errorToast, successToast } from '@src/shared/components/toast';
import config, { EXTENSION_COMP_NAMES } from '../config';
import { ExtensionCompNames } from '../types/component.types';
import { confirm } from '../ui/dialogs';
import { loadDynamicCompMenu } from './component.utils';
// import noAuthGPTPlugins from '../data/no-auth-gpt-plugins.json';

const uiServer = config.env.UI_SERVER;

/**
 * Extensions Utils
 * Here we'll have utility functions for extensions like GPT Plugins, Agent Plugins, HuggingFace Models, etc.
 */

type SearchExtensionsParams = {
  query: string;
  compName: string;
  extensions: any;
  page: number;
};

type HfModelInfo = {
  name: string;
  id: string;
  logoUrl: string;
  modelTask: string;
  inference: string;
};

/**
 * Search extensions as per query
 * @param {SearchExtensionsParams} params - Necessary parameters
 * @returns {any[]} matched extensions
 */
export function searchExtensions({
  query,
  compName,
  extensions,
  page = 1,
}: SearchExtensionsParams): any[] {
  let matched = [];

  switch (compName) {
    // ! DEPRECATED [GPTPlugin]: will be removed
    case EXTENSION_COMP_NAMES.gptPlugin:
      matched = extensions?.filter((extension) => {
        const name = extension?.manifest?.name_for_human;
        const desc = extension?.manifest?.description_for_human;
        const pattern = new RegExp(query, 'gi');

        return pattern.test(name) || pattern.test(desc);
      });
      break;
    case EXTENSION_COMP_NAMES.agentPlugin:
      matched = extensions?.filter((extension) => {
        const name = extension?.name;
        const desc = extension?.descForModel;
        const pattern = new RegExp(query, 'gi');

        return pattern.test(name) || pattern.test(desc);
      });
      break;
    case EXTENSION_COMP_NAMES.huggingFaceModel:
      matched = extensions?.filter((extension) => {
        const name = extension?.modelId;
        const pattern = new RegExp(query, 'gi');

        return pattern.test(name);
      });
      break;
    default:
      return [];
  }

  matched = matched?.slice((page - 1) * 8);

  // show only 8 extensions
  if (matched?.length > 8) {
    return matched.slice(0, 8);
  }

  return matched;
}

type ExtensionInfo = {
  id: string;
  name: string;
  desc?: string;
  descForModel?: string;
  logoUrl: string;
  modelTask?: string;
  specUrl?: string;
  inference?: string;
};
const _getExtensionInfo = async (compName: string, extension): Promise<ExtensionInfo> => {
  let info;

  switch (compName) {
    // ! DEPRECATED [GPTPlugin]: will be removed
    case EXTENSION_COMP_NAMES.gptPlugin:
      const data = extension?.manifest;
      info = {
        id: extension?.id,
        name: data?.name_for_human,
        desc: data?.description_for_human || '',
        descForModel: data?.description_for_model,
        logoUrl: data?.logo_url,
        specUrl: data?.api?.url,
      };
      break;
    case EXTENSION_COMP_NAMES.agentPlugin:
      info = {
        id: extension?.id,
        name: extension?.name,
        desc: extension?.description,
        descForModel: extension?.description,
        logoUrl: extension?.logoUrl,
      };
      break;
    case EXTENSION_COMP_NAMES.huggingFaceModel:
      info = {
        id: extension?.id,
        name: extension?.name,
        desc: extension?.desc,
        logoUrl: extension?.logoUrl,
        modelTask: extension?.modelTask,
        inference: extension?.inference,
      };
      break;
    default:
      info = {
        id: '',
        name: '',
        desc: '',
        logoUrl: '',
        specUrl: '',
      };
  }

  return info;
};

export function renderExtensionsSkeleton(elm: HTMLElement) {     
  let content = '<div class="row">';

  let item = `
        <div class="cell-3 animate-pulse">
            <div class="card">
                <div class="card-header">
                <div class="icon-box border bd-default">
                    <div class="icon bg-transparent">
                        <svg class="w-[100%] h-[100%] text-gray-200 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                        </svg>
                    </div>
                    <div class="content">
                        <div class="ext-name">
                            <div class="h-5 bg-gray-200 rounded dark:bg-gray-700 mb-2 mt-1"></div>
                        </div>

                        <div class="h-8 w-[80px] bg-gray-200 rounded dark:bg-gray-700"></div>
                    </div>
                </div>
                </div>
                <div class="card-content">
                    <div class="h-2 bg-gray-200 rounded dark:bg-gray-700 mb-2.5"></div>
                    <div class="h-2 w-[90%] bg-gray-200 rounded dark:bg-gray-700 mb-2.5"></div>
                    <div class="h-2 w-[80%] bg-gray-200 rounded dark:bg-gray-700"></div>
                </div>
            </div>
            <span class="sr-only">Loading...</span>
        </div>
    `;

  for (let i = 0; i < 8; i++) {
    content += item;
  }

  content += '</div>';

  elm.innerHTML = content;
}

export async function renderExtensions({
  elm,
  extensions,
  compName,
  append = false,
}: {
  elm: HTMLElement;
  extensions: Record<string, string | object>[];
  compName: string;
  append?: boolean;
}): Promise<void> {
  let content = `<div class="row row-${compName}">`;

  // show nothing found message if there are no extensions
  if (
    extensions?.length === 0 &&
    !document.querySelector(`.extensions__container .row-${compName}`)?.hasChildNodes()
    && compName !== EXTENSION_COMP_NAMES.gptPlugin // to hide nothing found message for gpt plugin
  ) {
    content += `<div class="flex-1 text-center">Nothing Found!</div>`;
  }

  for (const extension of extensions) {
    const data = await _getExtensionInfo(compName, extension);

    const placeholderLogo = '/img/smythos-logo.png';

    const isAdded = window['SMYTH_EXTENSION_IDS'][compName]?.includes(data?.id);

    const desc = data?.desc || '';
    const descForModel = data?.descForModel || '';
    const logoUrl = data?.logoUrl || placeholderLogo;
    const specUrl = data?.specUrl || '';
    const modelTask = data?.modelTask || '';
    const inference = data?.inference || '';

    let modelLink = '';
    let modelTaskLabel = '';
    let agentDomain = '';

    if (compName === EXTENSION_COMP_NAMES.huggingFaceModel) {
      modelLink = `<a href="https://huggingface.co/${data?.id}" target="blank">
            <svg class="w-3.5 h-3.5 inline mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11v4.833A1.166 1.166 0 0 1 13.833 17H2.167A1.167 1.167 0 0 1 1 15.833V4.167A1.166 1.166 0 0 1 2.167 3h4.618m4.447-2H17v5.768M9.111 8.889l7.778-7.778"/>
            </svg>
          </a>`;
      modelTaskLabel = `<div class="text-sm text-gray-500 dark:text-gray-400">${modelTask}</div>`;
    }

    content += `
            <div class="cell-3">
                <div class="card"
                data-id="${data?.id ? data.id : ''}"
                data-desc="${desc?.replace(/"/g, '&quot;')}"
                data-desc-for-model="${descForModel?.replace(/"/g, '&quot;')}"
                data-spec-url="${specUrl}"
                data-model-task="${modelTask}"
                data-inference="${inference}"
                data-name="${data?.name}"
            >
                    <div class="card-header">
                    <div class="icon-box border bd-default">
                        <div class="icon bg-cyan fg-white">
                            <img src="${logoUrl}"  onerror='this.setAttribute("src", "${placeholderLogo}")' />
                        </div>
                        <div class="content">
                            <div class="ext-name-wrapper">
                                <div class="ext-name">${data?.name} ${modelLink}</div>
                                ${modelTaskLabel}
                            </div>

                            <button class="button primary btn-add-extension hover:bg-smythos-blue-500 bg-smyth-blue text-white" data-status="${isAdded ? 'added' : 'add'
      }" data-role="add-extension" ${isAdded ? 'disabled' : ''}>
                                <span class="${isAdded ? 'mif-checkmark' : 'mif-plus'
      } light" data-role="btn-icon"></span>
                                <span class="label">${isAdded ? 'Added' : 'Add'}</span>
                            </button>
                        </div>
                    </div>
                    </div>
                    <div class="card-content">
                        ${desc}
                    </div>
                </div>
            </div>
        `;
  }

  content += '</div>';

  if (append) {
    elm.innerHTML += content;
  } else {
    elm.innerHTML = content;
  }
}

const _changeBtnStatus = (elm: HTMLButtonElement, status: string = 'add'): void => {
  if (!elm) return;

  let iconToBeRemoved = '';
  let iconToBeAdded = '';
  let label = '';

  elm.disabled = true;

  switch (status) {
    case 'adding':
      iconToBeRemoved = 'mif-plus';
      iconToBeAdded = 'smyth-spinner';
      label = 'Adding...';
      break;
    case 'added':
      iconToBeRemoved = 'smyth-spinner';
      iconToBeAdded = 'mif-checkmark';
      label = 'Added';
      break;
    default:
      elm.disabled = false;
      iconToBeRemoved = 'smyth-spinner';
      iconToBeAdded = 'mif-plus';
      label = 'Add';
      break;
  }

  elm?.setAttribute('data-status', status);

  const iconElm = elm.querySelector('[data-role=btn-icon]') as HTMLElement;
  iconElm?.classList?.remove(iconToBeRemoved);
  iconElm?.classList?.add(iconToBeAdded);

  const labelElm = elm.querySelector('.label');

  if (labelElm) {
    labelElm.textContent = label;
  }
};

type ExtensionData = {
  id?: string;
  name: string;
  logoUrl: string;
  desc?: string;
  descForModel?: string;
  modelTask?: string;
  specUrl?: string;
  inference?: string;
  domain?: string;
};
export const getDataByCompName = (elm: HTMLElement, compName: string): ExtensionData => {
  const id = elm?.getAttribute('data-id');
  const name = elm?.getAttribute('data-name');
  const logoUrl = elm?.querySelector('.icon img')?.getAttribute('src');

  const data: ExtensionData = {
    id,
    name,
    logoUrl,
  };

  switch (compName) {
    // ! DEPRECATED [GPTPlugin]: will be removed
    case EXTENSION_COMP_NAMES.gptPlugin:
      const specUrl = elm?.getAttribute('data-spec-url');
      const gptPluginDesc = elm?.getAttribute('data-desc');
      const gptDescForModel = elm?.getAttribute('data-desc-for-model');

      data.specUrl = specUrl;
      data.desc = gptPluginDesc;
      data.descForModel = gptDescForModel;
      break;
    case EXTENSION_COMP_NAMES.agentPlugin:
      const agentPluginDesc = elm?.getAttribute('data-desc');
      const agentPluginDescFromModel = elm?.getAttribute('data-desc-for-model');

      data.desc = agentPluginDesc;
      data.descForModel = agentPluginDescFromModel;
      break;
    case EXTENSION_COMP_NAMES.huggingFaceModel:
      const modelTask = elm?.getAttribute('data-model-task');
      const inference = elm?.getAttribute('data-inference');
      const modelDesc = elm?.getAttribute('data-desc');
      data.modelTask = modelTask;
      data.inference = inference;
      data.desc = modelDesc;
      break;
    default:
      break;
  }

  return data;
};

export async function saveExtension(
  compName: ExtensionCompNames,
  data: ExtensionData | { resourceKey: string },
): Promise<ExtensionData> {
  const apiUrl = `${uiServer}/api/component/${compName}`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    let resJson = await res.json();

    if (!resJson.success) {
      throw resJson.error;
    }

    return resJson?.data;
  } catch (error) {
    throw error;
  }
}

type AddExtensionParams = {
  compName: ExtensionCompNames;
  btnElm: HTMLButtonElement;
  data: ExtensionData | { resourceKey: string };
  addingType?: string;
};
export async function addExtension({
  compName,
  btnElm,
  data,
  addingType = '',
}: AddExtensionParams): Promise<void> {
  // change button status to adding
  _changeBtnStatus(btnElm, 'adding');

  const extensionLabel = getExtensionCompLabel(compName);

  try {
    const extension = await saveExtension(compName, data);

    await loadDynamicCompMenu({
      compName,
      components: [extension],
    });

    if (addingType !== 'manual') {
      // change button status to added
      _changeBtnStatus(btnElm, 'added');
    } else {
      _changeBtnStatus(btnElm, 'add');
    }

    successToast(`${extensionLabel} added`);
  } catch (error) {
    // change button status to add
    _changeBtnStatus(btnElm, 'add');

    errorToast(`Failed to add ${extensionLabel} <br/> ${error?.error}`);
  }
}

export const getExtensionCompLabel = (compName: string): string => {
  let label = '';

  switch (compName) {
    case EXTENSION_COMP_NAMES.gptPlugin:
      label = 'OpenAPI';
      break;
    case EXTENSION_COMP_NAMES.agentPlugin:
      label = 'My SmythOS Agents';
      break;
    case EXTENSION_COMP_NAMES.huggingFaceModel:
      label = 'Hugging Face Model';
      break;
    default:
      label = compName;
  }

  return label;
};

export const getExtensionManualFieldLabel = (compName: string): string => {
  let label = '';

  switch (compName) {
    case EXTENSION_COMP_NAMES.gptPlugin:
      label = `Enter the OpenAPI URL`;
      break;
    case EXTENSION_COMP_NAMES.agentPlugin:
      label = 'Enter Deployed Agent ID';
      break;
    case EXTENSION_COMP_NAMES.huggingFaceModel:
      label = 'Enter the Hugging Face Model Name';
      break;
    default:
      label = compName;
  }

  return label;
};

export const getExtensionManualFieldDescription = (compName: string): string => {
  let label = '';

  switch (compName) {
    case EXTENSION_COMP_NAMES.gptPlugin:
      label = `Provide the URL of your API's OpenAPI (formerly Swagger) specification file. This is a .json or .yaml file that defines your API's endpoints, methods, and data formats.`;
      break;
    case EXTENSION_COMP_NAMES.agentPlugin:
      label = ``;
      break;
    case EXTENSION_COMP_NAMES.huggingFaceModel:
      label = ``;
      break;
    default:
      label = compName;
  }

  return label;
};
const _getAgentPlugins = async (): Promise<any[]> => {
  try {
    const url = `${uiServer}/api/agent`;
    const result = await fetch(url).then((res) => res.json());

    if (!result.success) return [];

    const agents = result?.agents?.agents;

    if (!Array.isArray(agents) || agents?.length === 0) return [];

    // Sort agents by updatedAt in descending order
    const sortedAgents = agents.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return sortedAgents;
  } catch (error) {
    console.error('Failed to fetch Agent plugins', error);
    return [];
  }
};

export const _getHuggingFaceModels = async (query: string, page = 1, nextLink = '') => {
  try {
    let url = nextLink
      ? nextLink
      : `${uiServer}/api/component/${EXTENSION_COMP_NAMES.huggingFaceModel}/models?page=${page}`;

    if (query) {
      url += `&search=${query}`;
    }

    const res = await fetch(url);

    const resJson = await res.json();

    if (!resJson?.success) {
      return { data: [], headers: {} };
    }

    return { data: resJson?.data, headers: resJson.headers };
  } catch (error) {
    console.error('Failed to fetch HuggingFace models', error);
    return { data: [], headers: {} };
  }
};

export async function getExtensionsByCompName({
  compName,
  query = '',
  page = 1,
  nextLink = '',
}: {
  compName: string;
  query?: string;
  page?: number;
  nextLink?: string;
}): Promise<{ data: Record<string, any>[]; pagination: { next: string } }> {
  let extensions = {
    data: [],
    pagination: { next: '' },
  };

  switch (compName) {
    // ! DEPRECATED [GPTPlugin]: will be removed
    case EXTENSION_COMP_NAMES.gptPlugin:
      // import noAuthGPTPlugins from '../data/no-auth-gpt-plugins.json';
      // const noAuthGPTPlugins = await fetch('/data/no-auth-gpt-plugins.json').then((res) =>
      //   res.json(),
      // );
      // extensions.data = noAuthGPTPlugins?.items;
      // extensions.pagination.next = `${+page + 1}`;
      break;
    case EXTENSION_COMP_NAMES.agentPlugin:
      extensions.data = await _getAgentPlugins();
      break;
    case EXTENSION_COMP_NAMES.huggingFaceModel:
      const res = await _getHuggingFaceModels(query, page, nextLink);
      extensions.data = res?.data;
      extensions.pagination.next = res?.headers.link;
      break;
    default:
      return extensions;
  }

  return extensions;
}

/**
 * Delete extension
 * @param {DeleteCompOption} params
 * @param  {MouseEvent} event
 * @returns {Promise<void>}
 */
export async function deleteExtensionHandler(compName, event) {
  event.preventDefault();

  const clickedElm = event?.target as HTMLElement;
  const btnElm = clickedElm?.closest('.btn-delete') as HTMLButtonElement;

  if (!btnElm) return;

  const extensionLabel = getExtensionCompLabel(compName);

  const shouldDelete = await confirm(
    '',
    `Are you sure you want to delete this ${extensionLabel}?`,
    {
      btnNoLabel: 'No, Cancel',
      btnYesLabel: "Yes, I'm sure",
      btnYesClass: 'bg-smyth-red-500 border-smyth-red-500',
    },
  );

  if (shouldDelete) {
    const id = btnElm.getAttribute('rel');
    const apiUrl = `${uiServer}/api/component/${compName}/${id}`;

    try {
      const res = await fetch(apiUrl, { method: 'DELETE' });

      if (res.status >= 400) {
        throw new Error();
      }

      loadDynamicCompMenu({ compName, deletedItemId: id });

      successToast(`${extensionLabel} deleted`);
    } catch (error) {
      errorToast(`Failed to delete ${extensionLabel}`);
    }
  }
}
