import { delay, isValidJson, getUrlParams } from '../../utils';
import createFormField from './createFormField';
import { setTabIndex } from './misc';
import { v4 as uuidv4 } from 'uuid';

function _getAttributes(element) {
  const attributes = {};

  for (const { nodeName, nodeValue } of element.attributes) {
    const ignoredAttributes = [
      'data-role',
      'data-auto-size',
      'data-clear-button',
      'data-role-textarea',
      'class',
      'style',
    ];

    if (ignoredAttributes.includes(nodeName)) continue;

    attributes[nodeName] = nodeValue;
  }

  return attributes;
}

function _createKvInputField({
  value,
  classes,
  attributes = {},
}: {
  value?: string;
  classes?: Array<string>;
  attributes?: Record<string, any>;
}): HTMLTextAreaElement {
  const fieldElm = document.createElement('textarea');
  fieldElm.setAttribute('data-role', 'textarea');
  fieldElm.setAttribute('data-auto-size', 'false');
  fieldElm.setAttribute('data-clear-button', 'false');

  if (Object.keys(attributes)?.length) {
    for (let attr in attributes) fieldElm.setAttribute(attr, attributes[attr]);
  }

  if (classes?.length > 0) {
    fieldElm.classList.add(...classes);
  }

  if (value) {
    fieldElm.value = value;
  }

  fieldElm.onfocus = (event) => {
    const target = event.target as HTMLTextAreaElement;

    target.style.height = `${target.scrollHeight}px`;
  };

  fieldElm.onblur = (event) => {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = '20px';
  };

  fieldElm.onkeydown = async (event) => {
    const target = event.target as HTMLTextAreaElement;

    // delay is required to get the updated value
    await delay(50);

    if (!target.value) return;

    const wrapper = target.closest('.smt-input-key-value');
    const isPristine = wrapper.classList.contains('pristine');

    const wrapperElm = target.closest('.key-value-fields-wrapper');

    // TODO: refactor this code to make it more readable
    const formGroup = target.closest('.form-group');

    const keyElm = formGroup.querySelector('.kv-key textarea[data-role="textarea"]');
    const valueElm = formGroup.querySelector('.kv-value textarea[data-role="textarea"]');

    const keyAttributes = _getAttributes(keyElm);
    const valueAttributes = _getAttributes(valueElm);

    if (isPristine) {
      wrapper.classList.remove('pristine');

      const kvPair = createFormField(
        {
          name: wrapperElm.getAttribute('id'),
          type: 'key-value',
          keyField: { attributes: keyAttributes },
          valueField: { attributes: valueAttributes },
        },
        'inline',
      );

      wrapperElm.appendChild(kvPair);

      //scroll parent content to bottom
      const overflowY = wrapperElm.closest('.overflow-y-auto');
      if (overflowY) overflowY.scrollTop = overflowY.scrollHeight;

      // prevent to focus the fake textarea with tab key
      setTabIndex('.fake-textarea');
    }
  };

  return fieldElm;
}

function _createKvDeleteBtn() {
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('button', 'btn-delete', 'alert', 'outline');
  const deleteIcon = document.createElement('span');
  deleteIcon.classList.add('icon', 'mif-bin');

  deleteBtn.appendChild(deleteIcon);

  deleteBtn.onclick = () => {
    const wrapper = deleteBtn.closest('.form-group-key-value');
    wrapper.remove();
  };

  return deleteBtn;
}

export function createKeyValuePair(entry: Record<string, any>) {
  const key = entry?.key || '';
  const value = entry?.value || '';
  const wrapperElm = document.createElement('div');

  const keyField = entry?.keyField;
  const valueField = entry?.valueField;

  const keyInput = _createKvInputField({
    value: key,
    classes: ['kv-key'],
    attributes: keyField?.attributes,
  });
  const valueInput = _createKvInputField({
    value,
    classes: ['kv-value'],
    attributes: valueField?.attributes,
  });
  const deleteBtn = _createKvDeleteBtn();

  keyInput.placeholder = keyInput.placeholder || 'Key';
  valueInput.placeholder = valueInput.placeholder || 'Value';

  wrapperElm.appendChild(keyInput);
  wrapperElm.appendChild(valueInput);
  wrapperElm.appendChild(deleteBtn);

  return wrapperElm;
}

export function generateKeyValuePairs(name: string, entry: Record<string, any>) {
  const kvFieldElm = document.querySelector(entry?.rel);

  if (!kvFieldElm) {
    console.warn(`Related field not found with the selector - ${entry?.rel}`);
    return;
  }

  let kvFieldVal = kvFieldElm?.value || '{}';

  if (entry?.valueType === 'url') {
    // require to provide empty text to getUrlParams to prevent error
    kvFieldVal = kvFieldElm?.value || '';

    const params = getUrlParams(kvFieldVal);

    kvFieldVal = Object.keys(params).length ? JSON.stringify(params) : '{}';
  }

  // Wrap fields inside another div to do add, read and remove operation smoothly
  let wrapper = document.getElementById(name);

  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.classList.add('key-value-fields-wrapper');
    wrapper.setAttribute('id', name);
  }

  if (kvFieldVal && isValidJson(kvFieldVal)) {
    const kvData = JSON.parse(kvFieldVal);
    const kvDataKeys = Object.keys(kvData);
    const kvDataEntries = Object.entries(kvData);

    if (entry?.type === 'table') {
      const kvPair = createFormField(
        {
          name,
          key: '',
          value: '',
          ...entry,
        },
        'inline',
      );
      wrapper.appendChild(kvPair);
    } else {
      for (let i = 0; i <= kvDataKeys.length; i++) {
        const data = kvDataEntries[i];
        const key = data?.[0] || '';
        const value = data?.[1] || '';
        console.log({ data }, { key }, { value });
        const kvPair = createFormField(
          {
            name,
            key,
            value,
            ...entry,
          },
          'inline',
        );

        wrapper.appendChild(kvPair);
      }
    }
  }

  if (entry.class)
    entry.class.split(' ').forEach((cls) => cls.trim() && wrapper.classList.add(cls.trim()));
  else wrapper.classList.add('w-full');

  return wrapper;
}

export function readKeyValueData(fields: Array<HTMLInputElement>) {
  const kvData = {};

  fields.forEach((kvPair) => {
    const keyElm: HTMLTextAreaElement = kvPair.querySelector(
      '.kv-key textarea[data-role="textarea"]',
    );
    const valueElm: HTMLTextAreaElement = kvPair.querySelector(
      '.kv-value textarea[data-role="textarea"]',
    );

    const key = keyElm?.value;
    const value = valueElm?.value;

    if (key) {
      kvData[key] = value;
    }
  });

  return kvData;
}

// FormTable classes and functioanlity for schedular component
export function createFormTable(entry) {
  const formTableWrapper = document.createElement('div');
  const { formTableSection, formTableFlexContainer } = createFormTableStructure();

  const formTableMode = entry?.mode ?? null;
  formTableWrapper.appendChild(formTableSection);

  const formTableInputs = getFormTableInputNames();
  formTableInputs.forEach((inputName) => {
    formTableFlexContainer.appendChild(createFormTableInputField(inputName, formTableMode, entry));
  });

  formTableFlexContainer.appendChild(createFormTableSelect(formTableMode, entry));

  const uuidValue = formTableMode ? entry.editObj['uuid'] : uuidv4();
  const formTableHiddenUuidInput = createFormTableHiddenInput(uuidValue, 'uuid');
  formTableFlexContainer.appendChild(formTableHiddenUuidInput);

  return formTableWrapper;
}

function createFormTableInputField(inputName, mode, entry) {
  const formTableFieldContainer = createFormTableFieldContainer();
  formTableFieldContainer.appendChild(createFormTableLabel(inputName, '15%'));
  const inputValue = mode ? entry.editObj[inputName] : '';
  formTableFieldContainer.appendChild(createFormTableTextInput(inputValue, inputName));
  return formTableFieldContainer;
}

function createFormTableSelect(mode, entry) {
  const formTableSelectOptions = ['10min', '30min', 'hourly', 'daily', 'weekly', 'monthly'];
  const formTableSelectContainer = createFormTableSelectContainer();
  formTableSelectContainer.appendChild(createFormTableLabel('frequency', '15%'));
  const selectedValue = mode ? entry.editObj['frequency'] : 'monthly';
  formTableSelectContainer.appendChild(
    createFormTableDropdownSelect(formTableSelectOptions, selectedValue, 'frequency'),
  );
  return formTableSelectContainer;
}

function getFormTableInputNames() {
  var inputElements = document.querySelectorAll('.active .input-container .name');
  return Array.from(inputElements).map((el) => el.textContent.trim());
}

function createFormTableStructure() {
  const formTableSection = document.createElement('section');
  formTableSection.className = 'form-table-section py-1 bg-blueGray-50';

  const formTableContainer = document.createElement('div');
  formTableContainer.className = 'form-table-container w-full lg:w-12/12 px-4 mx-auto mt-6';
  formTableSection.appendChild(formTableContainer);

  const formTableCard = document.createElement('div');
  formTableCard.className =
    'form-table-card relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-100 border-0';
  formTableContainer.appendChild(formTableCard);

  const formTableWrapper = document.createElement('div');
  formTableWrapper.className = 'form-table-wrapper flex-auto px-1 lg:px-1 py-10 pt-0';
  formTableCard.appendChild(formTableWrapper);

  const formTableForm = document.createElement('form');
  formTableWrapper.appendChild(formTableForm);

  const formTableFlexContainer = document.createElement('div');
  formTableFlexContainer.className = 'form-table-flex-container flex flex-wrap';
  formTableForm.appendChild(formTableFlexContainer);

  return { formTableSection, formTableFlexContainer };
}

function createFormTableLabel(text, width) {
  const label = document.createElement('label');
  label.className =
    'form-table-label block text-blueGray-600 text-xs pt-4 font-bold mb-2 mr-3 flex-none text-right uppercase';
  label.style.width = width;
  label.textContent = text;
  return label;
}

function createFormTableFieldContainer() {
  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'form-table-field-container w-full lg:w-12/12 px-1 mb-3 flex';
  return fieldContainer;
}

function createFormTableSelectContainer() {
  const selectContainer = document.createElement('div');
  selectContainer.className = 'form-table-select-container w-full lg:w-12/12 px-1 mb-3 flex';
  return selectContainer;
}

function createFormTableTextInput(value = '', name = '') {
  const textField = document.createElement('input');
  textField.setAttribute('name', name);
  textField.type = 'text';
  textField.className =
    'form-table-text-input border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full';
  textField.value = value;
  return textField;
}

function createFormTableDropdownSelect(options, selectedOption = '', name = '') {
  const dropdownSelect = document.createElement('select');
  dropdownSelect.setAttribute('name', name);
  dropdownSelect.className =
    'form-table-dropdown-select border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full';
  options.forEach((option) => {
    const selectOption = document.createElement('option');
    selectOption.value = option;
    selectOption.textContent = option;
    dropdownSelect.appendChild(selectOption);
    if (option === selectedOption) {
      selectOption.selected = true;
    }
  });
  return dropdownSelect;
}

function createFormTableHiddenInput(value = '', name = '') {
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.value = value;
  hiddenInput.name = name;
  return hiddenInput;
}
