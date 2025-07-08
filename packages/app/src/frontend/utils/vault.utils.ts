import config from '../config';
import { editValues } from '../ui/dialogs';
import { ERR_MSG_VAULT_KEY_NAME } from '../../shared/constants/general';
import { EXTENSION_COMP_NAMES, COMP_NAMES } from '../config';
import { lsCache } from '../../shared/Cache.class';
import { VAULT_DATA_CACHE_KEY } from '../../shared/constants/general';
import { createSpinner, getSelectedText, isTemplateVariable, delay } from './general.utils';
import { dispatchInputEvent } from './form.utils';
import { generateKeyTemplateVar } from '../../shared/utils';

const uiServer = config.env.UI_SERVER;

export const isKeyTemplateVariable = (str: string): boolean => {
  if (!str) return false;

  const pattern = /{{KEY\((.*?)\)}}/;

  const match = str.match(pattern);

  if (!match) return false;

  return true;
};

export const getKeyIdsFromTemplateVars = (str: string): string[] => {
  if (!str) return [];

  const pattern = /{{KEY\((.*?)\)}}/g;
  const keyIds = [];
  let match = [];

  while ((match = pattern.exec(str)) !== null) {
    if (match?.length < 2) continue;
    keyIds.push(match[1]);
  }

  return keyIds;
};

async function _ensureUniqueKeyName(keyName: string) {
  const isKeyExistsResponse = await fetch(`/api/page/builder/keys/prefix/${keyName}/exists`).then(
    (res) => res.json(),
  );

  const isKeyExists = isKeyExistsResponse?.data?.exists;

  if (isKeyExists) {
    const keyIndex = isKeyExistsResponse?.data?.highestIndex;

    return `${keyName}_${keyIndex + 1}`;
  }

  return keyName;
}

export const addVaultKey = async (
  scope: string,
  key?: string,
  keyName?: string,
): Promise<{ keyId: string; keyName: string }> => {
  try {
    const fields = {};
    let label = 'Key';
    let _keyName = keyName || '';

    if (!_keyName) {
      if (scope.includes(EXTENSION_COMP_NAMES.zapierAction)) {
        const credentialsUrl = 'https://actions.zapier.com/credentials/';
        fields['fields'] = {
          type: 'div',
          html: `If you don't have the API key, get it from <a href="${credentialsUrl}" target="_blank" class="inner-link">here</a>`,
        };
        label = 'Zapier AI Actions API Key';
        _keyName = `ZAPIER_AI_ACTIONS_API_KEY`;
      } else if (scope.includes(EXTENSION_COMP_NAMES.huggingFaceModel)) {
        label = 'Hugging Face Access Token';
        _keyName = `HUGGING_FACE_ACCESS_TOKEN`;
      } else if (scope.includes(COMP_NAMES.apiCall)) {
        label = 'API Key';
        _keyName = `API_KEY`;
      } else {
        _keyName = `KEY`;
      }
    }

    _keyName = await _ensureUniqueKeyName(_keyName);

    const values = (await editValues({
      title: `Save ${label} to the Vault`,
      entriesObject: {
        keyName: {
          type: 'text',
          label: 'Name',
          classOverride: 'p-2 w-full',
          validate: `required maxlength=300 custom=validVaultKeyName`,
          smythValidate: 'func=isUniqueVaultKeyName', // as Metro UI does not support async function
          validateMessage: ERR_MSG_VAULT_KEY_NAME,
          value: _keyName,
        },
        apiKey: {
          type: 'textarea',
          label: 'Key',
          fieldCls: 'max-h-64 min-h-[34px] px-3 py-1 resize-y',
          classOverride: 'p-2 w-full',
          validate: 'required maxlength=10000',
          validateMessage: `Please provide a valid ${label} that is not empty and is less than 10000 characters.`,
          value: key || '',
          attributes: { 'data-auto-size': 'false', style: 'height: 34px;' }, // 'data-auto-size': 'false' to prevent set auto height initially
        },
        ...fields,
      },
      secondary: true,
    })) as { keyName: string; apiKey: string };

    if (values?.apiKey) {
      const saveKey = await fetch(`${uiServer}/api/page/builder/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyName: values?.keyName,
          key: values?.apiKey,
          scope: scope.split(','),
        }),
      }).then((res) => res.json());

      if (saveKey?.data?.keyId) {
        lsCache.delete(VAULT_DATA_CACHE_KEY);
        return {
          keyId: saveKey?.data?.keyId,
          keyName: values?.keyName,
        };
      }
    }
  } catch {
    return {
      keyId: '',
      keyName: '',
    };
  }
};

const _fetchKeys = async () => {
  try {
    let url = `/api/page/builder/keys?fields=name,scope`;

    const res = await fetch(url);
    const resJson = await res.json();

    return resJson?.data || {};
  } catch {
    return {};
  }
};

// TODO [Forhad]: Need adjust why 'All' returns keys that includes 'All' Scope. When the scope is 'All' we should return all keys without checking the scope.
export const getVaultData = async ({
  scope,
  ignoreCache,
  keyId,
}: {
  scope: string;
  ignoreCache?: boolean;
  keyId?: string;
}) => {
  let vaultData = {};
  let data = {};
  let source = 'cache';

  if (!ignoreCache) {
    vaultData = lsCache.get(VAULT_DATA_CACHE_KEY) || {};
  }

  if (!Object.keys(vaultData).length) {
    vaultData = await _fetchKeys();

    source = 'server';

    lsCache.set(VAULT_DATA_CACHE_KEY, vaultData);
  }

  if (Object.keys(vaultData)?.length) {
    for (const keyId in vaultData) {
      const keyObj = vaultData[keyId];

      if (
        !scope || // Will return all keys if scope is not defined
        (scope?.includes('ALL_NON_GLOBAL_KEYS') && !keyObj?.scope?.includes('global')) ||
        scope?.split(',')?.some((s) => keyObj?.scope?.includes(s)) // Sometimes we have multiple scopes like 'HuggingFace,All' etc.
      ) {
        data[keyId] = keyObj;
      }
    }
  }

  if (keyId && typeof keyId === 'string') {
    return { data: data?.[keyId], source };
  }

  return { data, source };
};

export function updateVaultDataCache(vaultData: any) {
  const currentVaultData = lsCache.get(VAULT_DATA_CACHE_KEY) || {};
  lsCache.set(VAULT_DATA_CACHE_KEY, { ...currentVaultData, ...vaultData });
}

export const insertKeyTemplateVar = (
  fieldElm: HTMLInputElement | HTMLTextAreaElement,
  keyVar: string,
) => {
  if (fieldElm.getAttribute('data-vault-exclusive') === 'true') {
    // Focus on the textarea again.
    fieldElm.focus();

    dispatchInputEvent(fieldElm); // help to resolve 'required' validation issue, as the value is updated programmatically

    fieldElm.value = keyVar;
  } else {
    // Get the start and end positions of the cursor.
    const startPosition = fieldElm.selectionStart;
    const endPosition = fieldElm.selectionEnd;

    // Focus on the textarea again.
    fieldElm.focus();

    dispatchInputEvent(fieldElm); // help to resolve 'required' validation issue, as the value is updated programmatically

    // Set the cursor position to the end of the text.
    const cursorPosition = startPosition + keyVar?.length || 0;
    fieldElm.setSelectionRange(cursorPosition, cursorPosition);

    if (!fieldElm?.value?.includes(keyVar)) {
      fieldElm.value = `${fieldElm.value.substring(
        0,
        startPosition,
      )}${keyVar}${fieldElm.value.substring(endPosition)}`;
    }
  }
};

export const createKeyBtnItems = async (
  targetField: HTMLInputElement,
  sync?: boolean,
): Promise<{
  keyBtns: HTMLAnchorElement[];
  source: string;
}> => {
  let keyBtns = [];
  const fieldValue = targetField?.value || '';

  const vaultBtn = targetField?.closest('.form-group')?.querySelector('.vault-action-btn');

  // show spinner when fetching keys from the server, but not when syncing
  if (!sync) {
    // show spinner when fetching keys from the server
    const spinner = createSpinner('grey', 'mt-[-3px]');
    vaultBtn.appendChild(spinner);
  }

  const scope = targetField.getAttribute('data-vault') || 'All';

  let { data, source } = await getVaultData({ scope, ignoreCache: sync });

  if (!sync) {
    vaultBtn.querySelector('.smyth-spinner')?.remove();
  }

  for (const keyId in data) {
    const keyName = data[keyId]?.name || keyId;
    const btn = document.createElement('a');
    btn.setAttribute('href', '#');
    btn.setAttribute('data-value', keyId);
    btn.textContent = keyName;

    const existingKeyNames = getKeyIdsFromTemplateVars(fieldValue) || [];

    for (const existingKeyName of existingKeyNames) {
      if (existingKeyName === keyName) {
        btn.classList.add('active');
      }
    }

    const keyVar = generateKeyTemplateVar(keyName);

    btn.onclick = (event) => {
      event.preventDefault();

      if (targetField?.classList?.contains('json-editor')) {
        const editor = (<any>targetField)?._editor;

        editor.session.replace(editor?.selection?.getRange(), keyVar);

        // Set the cursor to the new position
        editor?.moveCursorToPosition(editor?.getCursorPosition());

        editor?.focus();

        dispatchInputEvent(editor);
      } else {
        insertKeyTemplateVar(targetField, keyVar);
      }
    };

    keyBtns.push(btn);
  }

  return { keyBtns, source };
};

const _innerLink = (targetField: HTMLInputElement, message: string = '', keyName?: string) => {
  const msgElm = document.createElement('div');
  msgElm.style.padding = '10px';

  const linkElm = document.createElement('button');
  //linkElm.setAttribute('href', '#');
  linkElm.classList.add('inner-link');
  linkElm.innerText = ' Add Key ';

  if (message) {
    msgElm.append(message);
  }

  msgElm.append(linkElm);
  //msgElm.append(', to add a key');

  linkElm.addEventListener('click', async (event) => {
    event.preventDefault();
    const target = event.target as HTMLAnchorElement;

    let formGroup = target?.closest('.form-group');
    if (!formGroup) {
      const dropdown = target?.closest('#vault-keys-dropdown-menu');

      formGroup = dropdown?.['relFormGroup'];
    }
    const actionBtn = formGroup.querySelector('.field-action-btn') as HTMLButtonElement;

    const spinner = createSpinner('grey');
    actionBtn.appendChild(spinner);
    actionBtn.disabled = true;

    const saveBtn = formGroup
      .closest('#right-sidebar')
      ?.querySelector('.save-btn') as HTMLButtonElement;

    if (saveBtn) saveBtn.disabled = true;

    try {
      let selectedText = '';

      if (targetField?.classList?.contains('json-editor')) {
        const editor = (<any>targetField)?._editor;
        selectedText = editor?.getSelectedText();
      } else {
        selectedText = getSelectedText(targetField);
      }

      const key = !(isKeyTemplateVariable(selectedText) || isTemplateVariable(selectedText))
        ? selectedText
        : '';

      const scope = targetField.getAttribute('data-vault') || 'All';
      const result = await addVaultKey(scope, key, keyName);

      if (result?.keyId) {
        const keyVar = generateKeyTemplateVar(result?.keyName);
        insertKeyTemplateVar(targetField, keyVar);
      }
    } catch {
      console.log('Error adding vault key');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      spinner.remove();
      actionBtn.disabled = false;
    }
  });

  return msgElm;
};

export const renderVaultKeyBtnItems = ({
  dropdown,
  keyBtns,
  targetField,
}: {
  dropdown: HTMLElement;
  keyBtns: HTMLAnchorElement[];
  targetField: HTMLInputElement;
}) => {
  const dropdownContent = dropdown.querySelector('.smyth-dropdown-content');

  dropdownContent.innerHTML = '';

  if (keyBtns?.length) {
    dropdownContent.append(...keyBtns);
  }

  const keyNamesInTheTargetField = getKeyIdsFromTemplateVars(targetField.value);
  const keyNames = keyBtns.map((item) => item.textContent);
  const keyNameToAdd = keyNamesInTheTargetField.find((name) => !keyNames.includes(name));

  // show the link to add a new key only if the scope is not global
  const scope = targetField.getAttribute('data-vault') || 'All';
  if (scope !== 'global') {
    const msgElm = _innerLink(targetField, !!keyBtns?.length ? '' : 'No Keys found ', keyNameToAdd);

    dropdownContent.appendChild(msgElm);
  }
};
