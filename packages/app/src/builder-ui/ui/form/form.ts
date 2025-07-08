import { delay, isValidJson } from '../../utils';
import createFormField from './createFormField';
import { createInfoButton } from './fields';
import { generateKeyValuePairs, readKeyValueData } from './keyValueField';
import { setTabIndex } from './misc';

// Import custom input validator functions
import { COMPONENT_STATE_KEY } from '../../constants';
import './custom-validator-functions';

interface FormHTMLElement extends HTMLFormElement {
  _init?: () => void;
}

const _formInit = async ({ hasColorField }) => {
  if (hasColorField) {
    await delay(100);
    window['Coloris']({
      el: '.coloris input',
      theme: 'pill',
      //formatToggle: true,
      closeButton: true,
      //clearButton: true,
      swatches: [
        '#264653',
        '#2a9d8f',
        '#e9c46a',
        '#f4a261',
        '#e76f51',
        '#d62828',
        '#023e8a',
        '#0077b6',
        '#0096c7',
        '#00b4d8',
        '#48cae4',
      ],
      onChange: (color) => {
        const previewBtnElm = document.querySelector(
          '.circle-color-preview-btn',
        ) as HTMLButtonElement;
        if (previewBtnElm) {
          previewBtnElm.style.backgroundColor = color;
        }
      },
    });

    // Add event listener to the color button to open the color picker
    const circleColorPickerElm = document.querySelector('.stg-circle-color-picker');
    const colorBtnElm = circleColorPickerElm?.querySelector(
      '.clr-field > button',
    ) as HTMLButtonElement;
    const colorInputElm = circleColorPickerElm?.querySelector(
      '.clr-field > input',
    ) as HTMLInputElement;

    if (colorBtnElm) {
      const previewBtnElm = document.createElement('button');
      previewBtnElm.classList.add('circle-color-preview-btn');
      previewBtnElm.style.backgroundColor = colorInputElm.value;
      previewBtnElm.addEventListener('click', () => {
        colorBtnElm.click();
      });

      circleColorPickerElm?.prepend(previewBtnElm);
    }
  }

  // prevent to focus the fake textarea with tab key
  await delay(100);
  setTabIndex('.fake-textarea');
};

// #region Component State management
// TODO:
// * Consider moving this to a separate file once we have more types of data to store in the component state.
// * Currently, we're using a generic component state. However, it would be more robust to implement component-specific state.
// ** This will require additional effort — first, we need access to the component ID, which is not available in the form creation context.
// ** Additionally, we should implement a cleanup function to remove the component's state from local storage when the component or agent is removed.
function getComponentState() {
  const state = localStorage.getItem(COMPONENT_STATE_KEY);
  return state ? JSON.parse(state || '{}') : {};
}

function setComponentState(state: Record<string, any>) {
  const currentState = getComponentState();

  localStorage.setItem(COMPONENT_STATE_KEY, JSON.stringify({ ...currentState, ...state }));
}
// #endregion

export function createForm(entriesObject, displayType = 'block'): FormHTMLElement {
  const form = document.createElement('form');
  form.setAttribute('action', 'javascript:');
  form.setAttribute('class', 'form dlg-form w-full');
  if (Object.values(entriesObject).find((e: any) => e.validate))
    form.setAttribute('data-role', 'validator');

  const sections = {};
  const sectionsHelp = {};
  sections['main'] = [];
  const groupsIndexMap = {};
  let entryIndex = 0;
  for (let name in entriesObject) {
    if (!entriesObject[name]) continue;

    const entry = entriesObject[name];
    const sectionName = entry.section || 'main';
    if (sectionName && !sections[sectionName]) sections[sectionName] = [];
    if (entry.sectionHelp) {
      sectionsHelp[sectionName] = {
        help: entry.sectionHelp,
        tooltipClasses: entry?.sectionTooltipClasses || '',
        arrowClasses: entry?.sectionArrowClasses || '',
        hintPosition: entry?.sectionHintPosition || 'top',
      };
    }
    const section = sections[sectionName];

    if (entry?.type === 'key-value' || entry?.type === 'table') {
      section.push(generateKeyValuePairs(name, entry));
      //form.appendChild(generateKeyValuePairs(name, entry));
    } else if (entry?.fieldsGroup) {
      // Append fields to a group
      const groupName = entry?.fieldsGroup;
      const field = createFormField({ name, ...entry }, displayType, entryIndex++);

      if (groupsIndexMap?.[groupName] === undefined) {
        const fieldsGroupElm = document.createElement('div') as HTMLElement;
        fieldsGroupElm.className = 'fields-group-wrapper p-2';
        fieldsGroupElm.setAttribute('data-group-name', entry?.fieldsGroup);
        fieldsGroupElm.appendChild(field);

        const index = section.length;
        groupsIndexMap[groupName] = index;
        section[index] = fieldsGroupElm;
      } else {
        const index = groupsIndexMap[groupName];
        const fieldsGroupElm = section[index];
        fieldsGroupElm.appendChild(field);
      }
    } else {
      section.push(createFormField({ name, ...entry }, displayType, entryIndex++));
      //form.appendChild(createFormField({ name, ...entry }, displayType));
    }
  }

  for (let sectionName in sections) {
    const section = sections[sectionName];
    if (section.length > 0) {
      const sectionWrapper = document.createElement('div');
      sectionWrapper.setAttribute('class', 'form-section flex flex-wrap');
      sectionWrapper.setAttribute('data-name', sectionName);
      form.appendChild(sectionWrapper);

      let sectionContent = sectionWrapper;
      if (sectionName !== 'main') {
        const collapseToggle = document.createElement('button');
        collapseToggle.setAttribute(
          'class',
          'section w-full form-section-toggle pl-2 text-sm mt-5 flex items-center',
        );
        collapseToggle.setAttribute('id', `collapse_toggle_${sectionName}`);
        //collapseToggle.setAttribute('data-target', sectionName);
        const sectionDisplayName = sectionName.includes('_')
          ? sectionName.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
          : sectionName;

        const span = document.createElement('span');
        span.className = 'mx-2 font-bold';
        span.textContent = sectionDisplayName;

        if (sectionsHelp[sectionName]) {
          const infoBtn = createInfoButton(sectionsHelp[sectionName].help, {
            cls: 'mr-2 btn-info',
            clsHint: 'smt-hint drop-shadow bg-[#111111] rounded-lg text-white text-center',
            position: sectionsHelp[sectionName]?.hintPosition || 'bottom',
            tooltipClasses: sectionsHelp[sectionName]?.tooltipClasses || '',
            arrowClasses: sectionsHelp[sectionName]?.arrowClasses || '',
          });
          span.appendChild(infoBtn);
        }

        collapseToggle.innerHTML = '';
        collapseToggle.appendChild(span);

        // #region Handle collapse toggle based on component state
        const sectionKey = `section:${sectionName}`;
        collapseToggle.addEventListener('click', () => {
          setComponentState({
            [sectionKey]: {
              collapsed: !!collapseToggle.classList.contains('active-toggle'),
            },
          });
        });

        const componentState = getComponentState();
        const isCollapsed = componentState?.[sectionKey]?.collapsed ?? true;

        if (!isCollapsed) {
          collapseToggle?.classList?.add('active-toggle');
        }
        // #endregion

        sectionWrapper.appendChild(collapseToggle);

        sectionContent = document.createElement('div');
        sectionContent.setAttribute('class', 'form-section-content w-full');
        sectionContent.setAttribute('data-role', 'collapse');
        sectionContent.setAttribute('data-toggle-element', `#collapse_toggle_${sectionName}`);
        sectionContent.setAttribute('data-collapsed', isCollapsed ? 'true' : 'false');

        sectionWrapper.appendChild(sectionContent);
      }
      //sectionWrapper.setAttribute('style', 'display:none');
      section.forEach((el) => {
        // el.classList.add('mb-2');
        sectionContent.appendChild(el);
      });
    }
  }

  // Add "Test API Endpoint" button
  if (entriesObject.endpoint && entriesObject.endpointLabel) {
    const testApiButton = document.createElement('div');
    testApiButton.setAttribute(
      'class',
      'mt-4 mb-2 w-[200px] cursor-pointer float-right font-bold text-right text-blue-500 bg-transparent hover:text-smythos-blue focus:outline-none px-4 py-2 rounded-lg text-sm transition-colors',
    );
    testApiButton.innerHTML =
      'Test API Endpoint <span id="test-api-endpoint-arrow" class="transition-transform duration-300">-></span>';
    testApiButton.addEventListener('click', async (e) => {
      e.preventDefault();
      // Import the function dynamically to avoid circular dependencies
      const { openAPIEmbodiment } = await import('../../pages/builder/agent-settings');
      openAPIEmbodiment();
    });
    testApiButton.addEventListener('mouseover', () => {
      const arrow = testApiButton.querySelector('#test-api-endpoint-arrow') as HTMLElement;
      if (arrow) {
        arrow.style.transform = 'translateX(10px)';
      }
    });

    // Add click handler to Advanced section toggle to show/hide test API button
    const advancedToggle = form.querySelector('#collapse_toggle_Advanced') as HTMLElement;
    advancedToggle?.addEventListener('click', () => {
      if (!advancedToggle.classList.contains('active-toggle')) {
        testApiButton.classList.add('hidden');
      } else {
        testApiButton.classList.remove('hidden');
      }
    });
    form.appendChild(testApiButton);
  }

  const formBtn = document.createElement('button');
  formBtn.setAttribute('class', 'button primary submit');
  formBtn.setAttribute('style', 'display:none');
  form.appendChild(formBtn);

  const hasColorField = Object.values(entriesObject).some((e: any) => e?.type === 'color');

  form._init = _formInit.bind(this, { hasColorField });

  return form;
}

export function readFormValues(form, entriesObject) {
  const result = {};
  Object.keys(entriesObject).forEach((key) => {
    const inputField: any = form.querySelector(`[name="${key}"]`);

    if (inputField) {
      switch (entriesObject[key].type) {
        case 'dropdown':
          result[key] = inputField.selectedOptions[0].value;
          break;
        case 'checkbox':
          result[key] = inputField.checked;
          break;
        case 'checkbox-group':
          result[key] = [...inputField.querySelectorAll('input[type="checkbox"]')]
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value);
          break;
        case 'toggle':
          result[key] = inputField.checked;
          break;
        case 'radio':
          // Get all radio buttons with the same name and find the checked one
          const checkedRadio = form.querySelector(
            `input[name="${key}"]:checked`,
          ) as HTMLInputElement;

          if (checkedRadio) {
            let value: string | boolean = checkedRadio.value;

            // convert the value to boolean if it's a string
            if (value === 'true') value = true;
            else if (value === 'false') value = false;

            result[key] = value;
          } else {
            result[key] = '';
          }

          break;
        case 'div':
        case 'span':
        case 'p':
          break;
        default:
          result[key] = inputField.value;
      }
    }

    // read values from key-value pairs or table
    const isKvPair =
      entriesObject?.[key]?.type === 'key-value' || entriesObject?.[key]?.type === 'table';
    const entryType = entriesObject?.[key]?.type;
    if (isKvPair) {
      const kvWrapper = form?.querySelector(`#${key}`);
      const kvFields = kvWrapper?.querySelectorAll(`.form-group-${entryType}`);

      switch (entryType) {
        case 'key-value':
          result[key] = readKeyValueData(kvFields);
          break;

        case 'table':
          result[key] = extractFormValues(() => elementsProvider(kvFields), processElement);
          break;
      }
    }
  });

  return result;
}

export function readFormValidation(form, entriesObject) {
  const result = {};
  Object.keys(entriesObject).forEach((key) => {
    const inputField: any = form.querySelector(`[name="${key}"]`);

    if (inputField) {
      switch (entriesObject[key].type) {
        case 'dropdown':
          result[key] = { value: inputField.selectedOptions[0].value };
          break;
        case 'checkbox':
        case 'toggle':
          result[key] = { value: inputField.checked };
          break;
        case 'div':
        case 'span':
        case 'p':
          break;
        default:
          result[key] = { value: inputField.value };
      }
    }

    // read values from key-value pairs or table
    const isKvPair =
      entriesObject?.[key]?.type === 'key-value' || entriesObject?.[key]?.type === 'table';
    const entryType = entriesObject?.[key]?.type;
    if (isKvPair) {
      const kvWrapper = form?.querySelector(`#${key}`);
      const kvFields = kvWrapper?.querySelectorAll(`.form-group-${entryType}`);

      switch (entryType) {
        case 'key-value':
          result[key] = { value: readKeyValueData(kvFields) };
          break;

        case 'table':
          result[key] = {
            value: extractFormValues(() => elementsProvider(kvFields), processElement),
          };
          break;
      }
    }
    if (result[key]) result[key].valid = !inputField?.parentElement?.classList?.contains('invalid');
  });

  return result;
}

/**
 * Extracts values from form elements based on a custom value processing function.
 *
 * @param {function} elementsProvider - A function that returns a NodeList or array of form elements to process.
 * @param {function} processValue - A function that takes an element and a formValues object, then processes the element's value and adds it to the formValues object.
 * @returns {Object} An object containing the extracted values.
 */
function extractFormValues(elementsProvider, processValue) {
  const formValues = {};
  const formElements = elementsProvider();

  formElements.forEach((element) => {
    processValue(element, formValues);
  });

  return formValues;
}

function elementsProvider(container) {
  // Assuming container is a single DOM element, not an array or NodeList
  return container?.[0]?.querySelectorAll('input, select');
}

function processElement(element, formValues) {
  if (element.name) {
    formValues[element.name] = element.value;
  }
}

export function syncCompositeValues(entry) {
  // the sub fields either array or object
  const subFields =
    (Array.isArray(entry?.subFields) ? entry?.subFields?.[0] : entry?.subFields) || {};

  if (!entry?.value || !isValidJson(entry?.value) || !subFields) return entry;

  let values = JSON.parse(entry?.value);
  values = (Array.isArray(values) ? values?.[0] : values) || {};

  // Iterate over the keys in the values object
  for (const key in subFields) {
    // If the key exists in subFields, set its value
    if (subFields[key]) {
      // If the key is a composite type, recursively set its subFields values
      if (subFields[key].type === 'composite') {
        subFields[key].value = JSON.stringify(values?.[key] || {});
        subFields[key] = syncCompositeValues(subFields?.[key]);
      } else {
        subFields[key].value = values?.[key] || '';
      }
    }
  }

  return {
    ...entry,
    subFields,
  };
}
