import { errorToast, successToast } from '@src/shared/components/toast';
import { generateKeyTemplateVar } from '../../../shared/utils';
import { Agent } from '../../Agent.class';
import config, { API_PAGES, EXTENSION_COMP_NAMES } from '../../config';
import { editValues } from '../../ui/dialogs';
import { editValuesDialog, twEditValuesWithCallback } from '../../ui/tw-dialogs';
import { capitalize, createSpinner, debounce, renderDropdown } from '../general.utils';
import {
  addVaultKey,
  createKeyBtnItems,
  isKeyTemplateVariable,
  renderVaultKeyBtnItems,
} from '../vault.utils';

declare var Metro;

const uiServer = config.env.UI_SERVER;

/**
 * Handle key-value field's edit button
 * @param {string} fieldName
 * @returns {Promise<void>}
 */
// * N:B Need to invoke this function with .bind(this), .call(this) or .apply(this) to get the correct context
export async function handleKvFieldEditBtn(
  fieldName: string,
  options?: { title: string; showVault: boolean; vaultScope: string },
): Promise<void> {
  const attributes = { 'data-template-vars': 'true' };

  if (options?.showVault) {
    attributes['data-vault'] = `${options?.vaultScope},All`;
  }

  const queryParamValues: any = await editValuesDialog({
    title: `${capitalize(options.title || fieldName)}`,
    fields: {
      [`_${fieldName}`]: {
        type: 'key-value',
        rel: `#${fieldName}`,
        valueField: {
          attributes,
        },
      },
    },
    showCloseButton: true,
  });

  //editValuesDialog;
  if (queryParamValues) {
    const data = JSON.stringify(queryParamValues?.[`_${fieldName}`] || {}, null, 2);

    this.data[fieldName] = data;

    const field = document.getElementById(fieldName) as HTMLTextAreaElement;
    field.value = data;

    //dispatch custom event for consistency
    const event = new Event('change');
    field.dispatchEvent(event);
  }
}

/**
 * Handle key-value field's edit button for query parameters
 * @returns {Promise<void>}
 */
// * N:B Need to invoke this function with .bind(this), .call(this) or .apply(this) to get the correct context
export async function handleKvFieldEditBtnForParams(options?: {
  showVault: boolean;
  vaultScope: string;
}): Promise<void> {
  // * Old implementation of edit values field, will remove it
  // const queryParamValues: any = await editValues({
  //     title: 'Edit Query Parameters',
  //     entriesObject: {
  //         _queryParams: {
  //             type: 'key-value',
  //             rel: '#url',
  //             valueType: 'url',
  //             attributes: { 'data-template-vars': 'true' },
  //             actions,
  //         },
  //     },
  //     features: {
  //         templateVars: true,
  //     },
  //     style: {
  //         dialogWidth: 800,
  //         dialogContentMinHeight: 300,
  //     },
  // });
  const attributes = { 'data-template-vars': 'true' };

  if (options?.showVault) {
    attributes['data-vault'] = `${options?.vaultScope},All`;
  }

  const queryParamValues: any = await editValuesDialog({
    title: `Query Parameters`,
    fields: {
      _queryParams: {
        type: 'key-value',
        rel: '#url',
        valueType: 'url',
        valueField: {
          attributes,
        },
      },
    },
    showCloseButton: true,
  });

  if (queryParamValues) {
    const params = queryParamValues?._queryParams || {};

    const searchParams = new URLSearchParams(params);

    const urlField = document.getElementById('url') as HTMLInputElement;
    const url = urlField?.value;

    try {
      const urlObj = new URL(url);

      urlObj.search = searchParams.toString();

      const newUrl = urlObj.href.replace(/%7B/g, '{').replace(/%7D/g, '}');

      urlField.value = this.data.url = newUrl;
    } catch {
      console.warn('Invalid URL', url);
      errorToast('Please enter a valid URL before setting the query parameters');
    }
  }
}

/*
 * The Dropdown system doesn't wait for async operations to display the dropdown.
 * To manage the vault dropdown, we need to manually confirm its visibility after the async operation completes.
 */
const _hideDropdown = (dropdown: HTMLElement) => {
  if (!dropdown) return;

  dropdown.classList.remove('visible');
  dropdown.classList.add('invisible');
};
const _showDropdown = (dropdown: HTMLElement) => {
  if (!dropdown) return;

  dropdown.classList.remove('invisible');
  dropdown.classList.add('visible');
};

const _syncVaultKeys = (targetField: HTMLInputElement, dropdown: HTMLElement): void => {
  // with checking latest promise we're preventing to have active key in wrong dropdown
  const promise = createKeyBtnItems(targetField, true);
  handleVaultBtn['latestPromise'] = promise;

  promise.then((res) => {
    if (promise === handleVaultBtn['latestPromise']) {
      renderVaultKeyBtnItems({ dropdown, keyBtns: res?.keyBtns, targetField });
    }
  });
};

const _debounceSyncVaultKeys = debounce(_syncVaultKeys, 1000);

export async function handleVaultBtn(event: MouseEvent): Promise<void> {
  console.log('handleVaultBtn', event);
  if (handleVaultBtn['loading']) return;

  const vaultBtn = event.target as HTMLButtonElement;
  const formGroup = vaultBtn.closest('.form-group') as HTMLElement;

  vaultBtn.disabled = true;
  handleVaultBtn['loading'] = true;

  let dropdown = document.getElementById('vault-keys-dropdown-menu');
  if (dropdown) dropdown.remove();

  dropdown = document.createElement('div');
  dropdown.id = 'vault-keys-dropdown-menu';

  const contentElm = document.createElement('div');
  contentElm.classList.add('smyth-dropdown-content');

  dropdown.appendChild(contentElm);

  document.querySelector('body').appendChild(dropdown);

  _hideDropdown(dropdown);

  const targetField = vaultBtn
    .closest('.form-group')
    .querySelector('[data-vault]') as HTMLInputElement;

  if (!targetField) return;

  // focus to highlight the template vars
  targetField?.focus();

  const { keyBtns, source } = await createKeyBtnItems(targetField);

  renderVaultKeyBtnItems({ dropdown, keyBtns, targetField });

  if (source === 'cache') {
    /*
            Update the vault key buttons when they come from the local cache.
            Because, when the builder is opened in incognito mode and changes occur in the vault page in the normal window, the cache is not updated in incognito mode.
        */
    _debounceSyncVaultKeys(targetField, dropdown);
  }

  await renderDropdown(vaultBtn, dropdown);

  dropdown['relFormGroup'] = formGroup;

  vaultBtn.disabled = false;
  handleVaultBtn['loading'] = false;
}

export async function promptVaultInfo(
  event: KeyboardEvent | { target: HTMLInputElement },
  keyName?: string,
) {
  const target = event.target as HTMLInputElement;

  if (!target) return;

  const formGroup = target.closest('.form-group');
  const vaultToast = formGroup.querySelector('.toast-vault');

  if (target.value && !isKeyTemplateVariable(target.value)) {
    if (!vaultToast) {
      // create the toast message to show the link to save Access Token in the Vault
      const vaultToast = document.createElement('div');
      vaultToast.classList.add('toast-vault');
      vaultToast.textContent = 'To save your Access Token in the Vault - ';

      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'Click Here';
      link.classList.add('inner-link');

      const field = formGroup.querySelector('[data-role=input]') as HTMLInputElement;

      // get key name and access token from the dialog
      link.onclick = async (event) => {
        event.preventDefault();
        const target = event.target as HTMLAnchorElement;

        if (target.getAttribute('data-waiting') === 'true') return;

        target.textContent = 'Please wait...';
        target.removeAttribute('href');
        target.setAttribute('data-waiting', 'true');

        const sidebarContainer = target.closest('.sidebar-container');
        const saveBtn = sidebarContainer.querySelector('.action-save') as HTMLButtonElement;

        const spinner = createSpinner('black', 'absolute top-[5px] right-[20px]');
        const fieldActions = formGroup.querySelector('.smyth-field-actions');
        fieldActions.prepend(spinner);

        if (saveBtn) saveBtn.disabled = true;

        try {
          const result = await addVaultKey(
            keyName || EXTENSION_COMP_NAMES.huggingFaceModel,
            field.value,
          );
          if (result?.keyId) {
            const keyVar = generateKeyTemplateVar(result?.keyName);
            field.value = keyVar;
          }
        } catch (error) {
          console.log(error);
        } finally {
          spinner.remove();
          if (saveBtn) saveBtn.disabled = false;

          // focus is required to check the value and show/hide the toast
          field.focus();
        }

        target.textContent = 'Click Here';
        target.setAttribute('href', '#');
        target.removeAttribute('data-waiting');
      };

      vaultToast.appendChild(link);
      formGroup.appendChild(vaultToast);
    }
  } else {
    vaultToast?.remove();
  }
}

/**
 * Dynamic component markup
 * @param {} params
 * @returns {Promise<void>}
 */
// * Need to invoke this function with .bind(this), .call(this) or .apply(this) to get the correct context
export async function setLogoForDynamicComp(logoUrl: string): Promise<void> {
  const titleBar = this.domElement.querySelector('.title-bar');

  if (logoUrl) {
    const iconElm = titleBar.querySelector('.icon');
    iconElm.classList.remove('mif-insert-template');
    iconElm.classList.add('clearfix');
    iconElm.innerHTML = `<img src="${logoUrl}" />`;
  }
}

type LoadCompParams = {
  components?: Record<string, any>[];
  compName: string;
  deletedItemId?: string;
  resetPrevItems?: boolean;
};

/**
 * Load dynamic components
 * @param {LoadCompParams} params
 * @returns {Promise<void>}
 */
window['SMYTH_EXTENSION_IDS'] = {};

type CompMenuParam = {
  data: Record<string, any>;
  compName: string;
  placeholderLogo: string;
  compDisplayName: string;
};

const _updateCompMenu = ({
  elm,
  data,
  compName,
  placeholderLogo,
  compDisplayName,
}: { elm: HTMLLinkElement } & CompMenuParam) => {
  if (!elm) return;

  let isDisabled = false;
  const label = compDisplayName;

  if (compName === EXTENSION_COMP_NAMES.zapierAction && !data?.enabled) {
    isDisabled = true;
  }

  elm.setAttribute('title', data?.name);

  if (isDisabled) {
    elm.classList.add('disabled', 'opacity-70');
    elm.removeAttribute('smt-component');
  } else {
    elm.classList.remove('disabled', 'opacity-70');
    elm.setAttribute('smt-component', compName);
  }

  if (compName === EXTENSION_COMP_NAMES.zapierAction && !data?.enabled) {
    compDisplayName += `<br><span class="text-xs">[Unavailable]</span>`;
  }

  elm.setAttribute('data-label', label);
  elm.setAttribute('smt-id', data?.id);
  elm.setAttribute('smt-name', data?.name);
  elm.setAttribute('smt-desc', data?.desc || '');
  elm.setAttribute('smt-desc-for-model', data?.descForModel?.replace(/"/g, '&quot;') || '');
  elm.setAttribute('smt-spec-url', data?.specUrl || '');
  elm.setAttribute('smt-model-task', data?.modelTask || '');
  elm.setAttribute('smt-api-key', data?.apiKeyName ? generateKeyTemplateVar(data?.apiKeyName) : '');
  elm.setAttribute('smt-params', JSON.stringify(data?.params || '{}'));
  elm.setAttribute('smt-available', !isDisabled ? 'true' : 'false');

  const iconElm = elm.querySelector('.icon');
  iconElm.setAttribute('src', data?.logoUrl || placeholderLogo);

  elm.querySelector('.name').innerHTML = compDisplayName;

  // Update the delete button's rel attribute
  const deleteBtn = elm.parentNode.querySelector('.btn-delete');
  deleteBtn?.setAttribute('rel', data?.id || '');
};

const _compMenuMarkup = ({ data, compName, placeholderLogo, compDisplayName }: CompMenuParam) => {
  let isDisabled = false;
  let compAttr = `smt-component="${compName}"`;
  let label = compDisplayName;

  if (compName === EXTENSION_COMP_NAMES.zapierAction && !data?.enabled) {
    isDisabled = true;
    // Disable the component if it's not enabled
    compAttr = '';
  }

  let deleteBtn = `<button 
    class="btn-delete w-1 h-2 p-0"
    rel="${data?.id || ''}"
    aria-label="Delete ${data?.name || 'item'}">

    <span class="hidden cursor-pointer items-center justify-center w-3 h-3 p-3 ml-2 text-xs font-medium text-gray-600 bg-gray-200 rounded-md hover:text-smyth-red-500 group-hover:inline-flex">
                <i class="fa-regular fa-trash-can"></i>
    </span>

    </button>`;

  if (compName == EXTENSION_COMP_NAMES.zapierAction && !isDisabled) {
    deleteBtn = '';
  }

  if (compName === EXTENSION_COMP_NAMES.zapierAction && !data?.enabled) {
    compDisplayName += `<br><span class="text-xs">[Unavailable]</span>`;
  }

  return `<div class="h-9">
        <a href="#"
        title="${data?.name}"
        class="group flex items-center py-2 mx-2 pl-4 pr-2 text-sm text-black rounded-md bg-white ${
          isDisabled ? 'disabled opacity-70' : ''
        }"
        ${compAttr}
        data-label="${label}"
        smt-id="${data?.id}"
        smt-name="${data?.name}"
        smt-desc="${data?.desc || ''}"
        smt-desc-for-model="${data?.descForModel?.replace(/"/g, '&quot;') || ''}"
        smt-spec-url="${data?.specUrl || ''}"
        smt-model-task="${data?.modelTask || ''}"
        smt-api-key="${data?.apiKeyName ? generateKeyTemplateVar(data?.apiKeyName) : ''}"
        smt-params='${JSON.stringify(data?.params || '{}')}'
        smt-available="${!isDisabled ? 'true' : 'false'}"
        >


            <span class="icon">
                <img src="${
                  data?.logoUrl || placeholderLogo
                }" class=" w-6 h-6 rounded-lg border-solid border-gray-200" style="border-width:3px" onerror='this.setAttribute("src", "${placeholderLogo}")' />
            </span>


            <span class="name flex-1 ml-3 whitespace-nowrap overflow-x-hidden max-w-[130px]">${compDisplayName}</span>
            ${deleteBtn}
        </a>


    </div>`;
};

export async function loadDynamicCompMenu({
  components = [],
  compName = '',
  deletedItemId,
  resetPrevItems = false,
}: LoadCompParams) {
  let apiUrl = `${uiServer}/api/component/${compName}`;
  let placeholderLogo = '/img/smythos-logo.png';
  let apiKey = '';

  if (compName === EXTENSION_COMP_NAMES.zapierAction) {
    placeholderLogo = '/img/zapier.png';
  }

  try {
    const menuListElm = document.querySelector(`.comp-menuitem-list-${compName}`);

    if (deletedItemId) {
      const deletedItem = menuListElm.querySelector(`[smt-id="${deletedItemId}"]`)
        ?.parentNode as HTMLLinkElement;
      deletedItem?.remove();
    }

    if (components.length === 0) {
      const res = await fetch(apiUrl);
      const resJson = await res.json();
      components = resJson?.data || [];

      // Store extension ids in global variable to check in extension list popup
      const ids = components.map((component) => component?.id);
      window['SMYTH_EXTENSION_IDS'][compName] = ids;
    } else {
      // Store extension ids in global variable to check in extension list popup
      if (!window['SMYTH_EXTENSION_IDS'][compName]) {
        window['SMYTH_EXTENSION_IDS'][compName] = components?.[0]?.id;
      } else {
        window['SMYTH_EXTENSION_IDS'][compName].push(components?.[0]?.id);
      }
    }

    if (resetPrevItems) {
      menuListElm.innerHTML = '';
    }

    components.forEach((component) => {
      const menuItem = document.createElement('LI');
      menuItem.classList.add('cpt-item');
      menuItem.setAttribute('data-label', component?.name);

      let compDisplayName = component?.name;

      if (compName === EXTENSION_COMP_NAMES.huggingFaceModel) {
        compDisplayName = component?.name?.split('/')?.[1] || component?.name;
      }

      const existingItem = menuListElm.querySelector(
        `[smt-id="${component?.id}"]`,
      ) as HTMLLinkElement;

      if (existingItem) {
        _updateCompMenu({
          elm: existingItem,
          data: component,
          compName,
          placeholderLogo,
          compDisplayName,
        });
      } else {
        menuItem.innerHTML = _compMenuMarkup({
          data: component,
          compName,
          placeholderLogo,
          compDisplayName,
        });

        menuListElm.appendChild(menuItem);
      }
    });
  } catch (error) {
    console.log('error', error);
  }
}

export function renderMenuSkeleton(elm: HTMLElement) {
  let content = '<ul class="comp-menuitem-list animate-pulse">';

  let item = `
        <li class="cpt-item">
            <div class="flex items-center">
                <a href="#" class="p-2 dynamic-comp-button flex w-48 space-x-2 text-gray-700 transition-colors rounded-lg group hover:bg-gray-100 hover:text-gray-800">

                    <span aria-hidden="true" class="p-2 transition-colors rounded-lg group-hover:bg-gray-200 group-hover:text-white">
                        <span class="icon">
                            <svg class="w-6 h-6 text-gray-200 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                                <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                            </svg>
                        </span>
                    </span>
                    <span class="name align-middle p-2 w-[100%]"><div class="h-5 bg-gray-200 rounded-[4px] dark:bg-gray-700"></div></span>

                </a>
            </div>
        </li>
    `;

  for (let i = 0; i < 3; i++) {
    content += item;
  }

  content += '</ul>';

  elm.innerHTML = content;
}

// Check component validity for Zapier Action
export async function checkComponentValidity(menuListElm: HTMLElement, agent: Agent) {
  const components = agent?.data?.components;

  if (!components?.length) return;

  for (const component of components) {
    if (component?.name !== EXTENSION_COMP_NAMES.zapierAction) {
      continue;
    }
    const actionId = component.data.actionId;

    const menuItem = menuListElm.querySelector(`[smt-id="${actionId}"]`);
    const invalidClassName = `component-invalid-${EXTENSION_COMP_NAMES.zapierAction}`;
    const workspace = document.getElementById('workspace-container');
    const comps = workspace.querySelectorAll(`[data-action-id="${actionId}"]`);

    comps.forEach((comp) => {
      if (!menuItem || menuItem?.getAttribute('smt-available') === 'false') {
        // show invalid status
        comp.classList.add(invalidClassName);
        comp.addEventListener('click', async (event) => {
          const loader = comp.querySelector('.loading-icon');
          // Cast comp to HTMLElement to access style property
          if (comp === event.target) {
            const htmlComp = comp as HTMLElement;
            if (loader && !loader?.classList?.contains?.('hidden')) {
              return;
            }
            loader.classList.remove('hidden');
            const result = await addVaultKey(EXTENSION_COMP_NAMES.zapierAction);
            loader.classList.add('hidden');
            if (result) {
              location.reload();
            }
          }
        });
      } else if (
        menuItem &&
        menuItem?.getAttribute('smt-available') === 'true' &&
        comp.classList.contains(invalidClassName)
      ) {
        // hide invalid status
        comp.classList.remove(invalidClassName);
      }
    });
  }
}

export async function handleTableEditBtn(fieldName: string): Promise<void> {
  const table: any = await editValues({
    title: `Add ${capitalize(fieldName)}`,
    entriesObject: {
      [`_${fieldName}`]: {
        inputs: this.properties.inputs,
        type: 'table',
        rel: `#${fieldName}`,
        value: { hello: 'how' },
        attributes: { 'data-template-vars': 'true' },
      },
    },
    features: {
      templateVars: true,
    },
    style: {
      dialogWidth: 800,
    },
  });

  const field = document.getElementById(fieldName) as HTMLInputElement | null;

  if (table && field) {
    const data = table[`_${fieldName}`];
    const jsonData = JSON.stringify(data, null, 2);

    if (jsonData === '{}' || jsonData === '[]' || jsonData === 'undefined' || jsonData === 'null') {
      field.value = '';
      this.data[fieldName] = '';
      this.settings.jobs.value = '';
      this.editSettings();

      const container = document.querySelector('#right-sidebar .job-details');
      if (container) {
        container.innerHTML = '';
      }
    } else {
      const existingData =
        typeof this.data[fieldName] === 'string' && this.data[fieldName] !== ''
          ? JSON.parse(this.data[fieldName])
          : [];
      const updatedData = Array.isArray(existingData) ? [data, ...existingData] : [data];
      const updatedDataJSON = JSON.stringify(updatedData, null, 2);

      this.data[fieldName] = updatedDataJSON;
      this.settings.jobs.value = updatedDataJSON;
      this.editSettings();

      field.value = updatedDataJSON;

      if (this.data.jobs && this.data.jobs !== '{}' && this.data.jobs !== '[]') {
        const _sidebar = document.querySelector('#right-sidebar .form-section');
        if (_sidebar) {
          const jobBoxesContainer: any = createJobBoxes(this, 'job-details');
          await _sidebar.appendChild(jobBoxesContainer);
        }
      }
    }
  }
}

function replaceObjectByUuid(data, uuid, newObject) {
  data = JSON.parse(data);
  const index = data.findIndex((obj) => obj.uuid === uuid);

  if (index !== -1) {
    // Replace the object if found
    data[index] = newObject;
  }
  return JSON.stringify(data);
}

export async function updateJobs(editObj: any, inputs: any): Promise<void> {
  const table: any = await editValues({
    title: `Edit ${capitalize('Jobs')}`,
    entriesObject: {
      ['_jobs']: {
        inputs,
        type: 'table',
        rel: `#jobs`,
        mode: 'edit',
        editObj,
        attributes: { 'data-template-vars': 'true' },
      },
    },
    features: {
      templateVars: true,
    },
    style: {
      dialogWidth: 800,
    },
  });
  return table;
}

function getInputNames() {
  var inputElements = document.querySelectorAll('.active .input-container .name');
  return Array.from(inputElements).map((el) => el.textContent.trim());
}

function createUserAccountForm() {
  const divCard = document.createElement('div');
  divCard.className =
    'relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-100 border-lightgrey-important py-3 border border-gray-300';
  return { divCard };
}

function createLabel(text, width) {
  const label = document.createElement('label');
  label.className = 'block text-blueGray-600 text-xs pt-4 font-bold mb-2 mr-3 flex-none text-right';
  label.style.width = width;
  label.style.fontFamily = 'monospace';
  label.textContent = text;
  return label;
}

function createFieldDiv(flexContainer) {
  const fieldDiv = document.createElement('div');
  fieldDiv.className = 'w-full lg:w-12/12 px-1 mb-3 flex';
  flexContainer.appendChild(fieldDiv);
  return fieldDiv;
}

function createStyledDiv(value = '', name = '') {
  const div = document.createElement('div');
  div.className =
    'border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600  rounded text-sm shadow focus:outline-none focus:ring w-full';
  if (name) div.setAttribute('name', name);
  div.textContent = value;
  return div;
}

export async function createJobBoxes(context, containerClassName) {
  let container = document?.querySelector(
    `#right-sidebar .${containerClassName}`,
  ) as HTMLDivElement;

  if (!container) {
    console.log('Container does not exist. Creating container ...');
    container = document.createElement('div');
    container.className = `${containerClassName} mb-1 bg-gray-100 border-solid border-t border-b border-gray-200 pl-2`;
  } else {
    console.log('Container exists. Adding div to existing container ...');
    container.innerHTML = '';
  }

  let jobDataArray = null;
  try {
    jobDataArray =
      typeof context.data.jobs === 'string' ? JSON.parse(context.data.jobs) : context.data.jobs;
  } catch (e) {
    console.error('Failed to parse jobData:', e);
    return container;
  }

  let title = document.createElement('h3');
  title.textContent = 'Scheduled Jobs Overview';
  title.style.padding = '5px 0 2px 5px';
  title.style.fontFamily = 'monospace';

  title.style.marginBottom = '15px';
  container.appendChild(title);
  jobDataArray?.forEach((job, index) => {
    const { divCard } = createUserAccountForm();

    Object.keys(job).forEach((key) => {
      const fieldDiv = createFieldDiv(divCard);
      const label = createLabel(key.charAt(0).toUpperCase() + key.slice(1), '20%');
      const valueDiv = createStyledDiv(job[key]);
      fieldDiv.appendChild(label);
      fieldDiv.appendChild(valueDiv);
      if (key !== 'frequency' && key !== 'uuid' && !getInputNames()?.includes?.(key)) {
        const fieldDiv = createFieldDiv(divCard);
        const valueDiv = document.createElement('div');
        valueDiv.textContent = `⚠️ Warning: '${key}' is not present as a component input.`;
        valueDiv.style.cssText = 'color: red; font-size: 14px;';
        valueDiv.style.marginLeft = '25%';
        fieldDiv.appendChild(valueDiv);
      }
    });
    const deleteButton = document.createElement('button');
    deleteButton.className = 'button btn-delete alert';
    deleteButton.innerHTML = '<span class="mif-bin"></span>';
    deleteButton.onmouseup = () => {
      container.removeChild(divCard);
      jobDataArray = jobDataArray.filter((_, idx) => idx !== index);
      const _jobDataArr = JSON.stringify(jobDataArray);
      if (_jobDataArr === '[]' || _jobDataArr === '{}') {
        context.data.jobs = '';
        context.settings.jobs.value = '';
      } else {
        context.data.jobs = _jobDataArr;
        context.settings.jobs.value = _jobDataArr;
      }
      context.editSettings();
      console.log('Updated job data:', jobDataArray);
    };

    const editButton = document.createElement('button');
    editButton.className = 'button success';
    editButton.innerHTML = '<span class="mif-pencil"></span>';
    editButton.onmouseup = async () => {
      let updatedJob: any = await updateJobs(jobDataArray[index], context.properties.inputs);
      if (updatedJob) {
        context.data.jobs = replaceObjectByUuid(
          context.data.jobs,
          jobDataArray[index]['uuid'],
          updatedJob['_jobs'],
        );
        const jobs: any = document.querySelector('#jobs');
        jobs.value = context.data.jobs;
        context.settings.jobs.value = context.data.jobs;
        context.editSettings();
      }
    };

    const fieldDiv = createFieldDiv(divCard);
    fieldDiv.className = 'flex justify-end space-x-2';
    fieldDiv.appendChild(editButton);
    fieldDiv.appendChild(deleteButton);
    container.appendChild(divCard);
  });

  return container;
}

// * Test this function interactively in case it may replace wrong text/value
export const replaceValidationRules = ({
  fieldElm,
  attribute,
  targetValue,
  inputType = '',
}: {
  fieldElm: HTMLInputElement;
  attribute: string;
  targetValue: number;
  inputType?: string;
}) => {
  if (!fieldElm) return;

  const currentValue = fieldElm?.getAttribute(attribute);
  const formGroupElm = fieldElm.closest('.form-group');

  // Update the HTML built-in attribute
  if (fieldElm.getAttribute(attribute)) {
    fieldElm.setAttribute(attribute, `${targetValue}`);
  }
  if (inputType === 'range') {
    const numFieldElm = formGroupElm.querySelector(`[data-rel="#${fieldElm?.id}"]`);
    if (numFieldElm?.getAttribute(attribute)) {
      numFieldElm.setAttribute(attribute, `${targetValue}`);
    }
  }

  // Update the Metro UI validation rules
  if (fieldElm.getAttribute('data-validate')) {
    const currentValidationRules = fieldElm.getAttribute('data-validate');
    // preceding '=' is to ensure that we are replacing the exact value case like 0, 0.01 etc.
    const newValidationRules = currentValidationRules.replace(
      `=${currentValue}`,
      `=${targetValue}`,
    );
    fieldElm.setAttribute('data-validate', newValidationRules);
  }

  // Update the error message
  const invalidFeedbackElm = formGroupElm?.querySelector('.invalid_feedback');

  if (invalidFeedbackElm) {
    // preceding ' ' is to ensure that we are replacing the exact value case like 0, 0.01 etc.
    invalidFeedbackElm.innerHTML = invalidFeedbackElm.innerHTML.replace(
      ` ${currentValue}`,
      ` ${targetValue}`,
    );
  }
};

// The formElm ensures that we are in the correct context, even when there are multiple IDs on the same page.
export const setRangeInputValue = (formElm, id, value) => {
  if (formElm) {
    // Find elements within the form by ID and data-rel attribute
    const rangeField = formElm.querySelector(`#${id}`);
    const numField = formElm.querySelector(`[data-rel="#${id}"]`);

    // Set the value if the elements are found
    if (rangeField) rangeField.value = value;
    if (numField) numField.value = value;
  }
};

export async function setupSidebarTooltips(sidebar, instance) {
  sidebar?.querySelectorAll('li')?.forEach((ele) => {
    const listItem = ele as HTMLLIElement; // Use type assertion here
    listItem.style.cursor = 'default';

    // Check if the listItem contains the lock badge and doesn't have a tooltip yet
    const lockBadgeElement = listItem?.querySelector('.mif-lock');
    if (lockBadgeElement && !lockBadgeElement?.hasAttribute('data-tooltip-target')) {
      // Add tooltip to the lock badge element
      addTooltipToLockBadge(
        lockBadgeElement,
        'Add your API key to use models with your own account credentials and billing',
      );
    }
  });

  sidebar.querySelectorAll('[data-tooltip-target]').forEach(async (element) => {
    const listItem = element.closest('li');
    if (listItem) {
      await addTooltipListeners(element, sidebar, instance);
    }
  });
}

export async function addTooltipListeners(element, sidebar, instance) {
  const tooltipId = element.getAttribute('data-tooltip-target');
  const tooltipElement = sidebar.querySelector(`#${tooltipId}`);
  if (!tooltipElement) return;

  element?.parentNode?.parentNode?.addEventListener('mouseenter', () =>
    showTooltip(tooltipElement, element),
  );
  element?.parentNode?.parentNode?.addEventListener('mouseleave', () =>
    hideTooltip(tooltipElement),
  );
  element?.parentNode?.parentNode?.addEventListener(
    'click',
    instance.handleElementClick.bind(instance),
  );
}

export function showTooltip(tooltipElement, targetElement) {
  if (!tooltipElement || !targetElement) return;

  // Calculate the top position for the tooltip
  const listItem = targetElement?.closest('li');
  const parentContainer = targetElement?.parentNode?.parentNode?.parentNode?.parentNode;

  if (!listItem || !parentContainer) return;

  const targetElementRect = targetElement?.getBoundingClientRect();
  const listItemRect = listItem?.getBoundingClientRect();
  const parentRect = parentContainer?.getBoundingClientRect();
  const topPosition = listItemRect?.top - parentRect?.top;
  const leftPosition = targetElementRect?.right - parentRect?.left;
  // Set the top and left position and make the tooltip visible
  tooltipElement.style.top = `${topPosition}px`;
  tooltipElement.style.left = `${leftPosition - 10}px`;
  tooltipElement?.classList?.remove('invisible', 'opacity-0');
  tooltipElement?.classList?.add('visible', 'opacity-100');
}

export function hideTooltip(tooltipElement) {
  tooltipElement?.classList?.remove('visible', 'opacity-0');
  tooltipElement?.classList?.add('invisible', 'opacity-100');
}

export async function handleElementClick(event, instance) {
  event.stopPropagation();
  const listItem = event.target.closest('li');
  const serviceLabel = listItem.getAttribute('data-text');
  const serviceKey = listItem.getAttribute('data-value');

  try {
    const formData = await twEditValuesWithCallback(
      {
        title: `Add API Key`,
        fields: {
          apiKey: {
            type: 'textarea',
            label: `<span class="normal-case">Add your <strong><a href="${API_PAGES[serviceKey]}" class="font-bold no-underline text-gray-800 hover:text-blue-500" target="_blank" style="color:#333;">${serviceLabel} API key</a></strong> to unlock the ${serviceLabel} models.</span>`,
            // fieldCls: 'max-h-64 min-h-[34px] px-3 py-2',
            fieldCls: 'max-h-64 min-h-[34px] px-3 py-1 resize-y',
            classOverride: 'p-2 w-full mb-0',
            validate: 'required maxlength=10000',
            validateMessage: `Please provide a valid key.`,
            value: '',
            attributes: {
              'data-auto-size': 'false',
              style: 'height: 34px;',
              placeholder: `Your ${serviceLabel} API key`,
            },
          },
        },
        actions: [
          {
            label: 'Save to Vault',
            cssClass: 'bg-smyth-emerald-400',
            requiresValidation: true,
            callback: async (result, dialog) => {
              if (result?.apiKey) {
                const saveButton = dialog.querySelector('.bg-smyth-emerald-400');
                const formElements = dialog.querySelectorAll('input, textarea, button');
                // Change save button text and color
                saveButton.textContent = 'Saving ...';
                saveButton.classList.remove('bg-smyth-emerald-400');
                saveButton.classList.add('bg-gray-400');
                // Disable buttons and form elements
                saveButton.disabled = true;
                formElements.forEach((element) => (element.disabled = true));
                const success = await instance.saveApiKey(serviceKey, serviceLabel, result);

                if (success) {
                  successToast(`${serviceLabel} is available now.`);
                }

                // Close dialog regardless of the API call result
                dialog.remove();
              }
            },
          },
        ],
        onDOMReady: null,
        onLoad: null,
        onCloseClick: null,
      },
      '230px',
      '92px',
      'none',
    );
  } catch (error) {
    console.error('Error showing dialog', error);
    errorToast('Error showing dialog');
  }
}

export async function saveApiKey(serviceKey, serviceLabel, formData, workspace, refreshLLMModels) {
  const apiKey = formData.apiKey;
  try {
    const response = await fetch(`${workspace.server}/api/page/vault/keys/${serviceKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: apiKey, keyName: serviceLabel, scope: ['global'] }),
    });
    const result = await response.json();
    if (response.ok) {
      await refreshLLMModels(); // Refresh LLM models after adding a new key
      return true; // Indicate success
    } else {
      errorToast('Error saving API key');
      return false; // Indicate failure
    }
  } catch (error) {
    console.error('Error saving API key', error);
    errorToast('Error saving API key');
    return false; // Indicate failure
  }
}

export async function refreshLLMModels(workspace, prepare, init, refreshSettingsSidebar) {
  try {
    const response = await fetch('/api/page/builder/llm-models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log('LLM Models refreshed:', data.LLMModels);
      window['__LLM_MODELS__'] = data.LLMModels;
      await prepare();
      await init();
      refreshSettingsSidebar();
    } else {
      console.error('Error refreshing LLM models:', data.error);
      errorToast('Error refreshing LLM models');
    }
  } catch (error) {
    console.error('Error making request to refresh LLM models:', error);
    errorToast('Error making request to refresh LLM models');
  }
}

export function addTooltipToLockBadge(element, tooltipText) {
  if (!element) return;

  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  const tooltipHTML = `
        <div id="${tooltipId}" role="tooltip" class="absolute cursor-default z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
            ${tooltipText}
        </div>`;
  element?.setAttribute('data-tooltip-target', tooltipId);
  element?.parentNode?.parentNode?.parentNode?.insertAdjacentHTML('beforebegin', tooltipHTML);
  // add event listener to tooltipId to show hide tooltip when mouse enter and leave on tooltip
  const tooltipElement = document?.querySelector(`#${tooltipId}`);
  if (tooltipElement) {
    tooltipElement?.addEventListener('mouseenter', () => showTooltip(tooltipElement, element));
    tooltipElement?.addEventListener('mouseleave', () => hideTooltip(tooltipElement));
  }
}

export { default as PromptGeneratorUtils } from './PromptGenerator.utils';
export { default as VisionLLMUtils } from './VisionLLM.utils';

