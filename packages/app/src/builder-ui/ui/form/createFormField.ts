import {
  createSpinner,
  delay,
  handleKvFieldEditBtn,
  handleVaultBtn,
  isValidJson,
} from '../../utils';
import {
  attachTooltipV2,
  mapMetroClassesToTooltipV2,
  mapMetroPositionToTooltipV2,
} from '../../utils/tooltip-wrapper-v2';
import { setCodeEditor, toggleMode } from '../dom';
import {
  createButton,
  createCheckbox,
  createCheckboxGroup,
  createColorInput,
  createDatalistInput,
  createHiddenInput,
  createHint,
  createInfoButton,
  createInput,
  createRadio,
  createRangeInput,
  createSelectBox,
  createTagInput,
  createTextArea,
  createToggle,
} from './fields';
import { createFormTable, createKeyValuePair } from './keyValueField';
import {
  addBracketSelection,
  createActionButton,
  createActionButtonAfterDropdown,
  createHtmlElm,
} from './misc';

declare var workspace;
declare var Metro;

// TODO: We have several props used for assigning classes, such as `class`, `cls`, and `fieldClasses`. We need to establish a clear and consistent naming convention for them.

export default function createFormField(entry, displayType = 'block', entryIndex = 0) {
  const value = entry?.value === undefined ? '' : entry.value;
  const attributes = entry.attributes || {};
  const events = entry.events || {};

  const div = document.createElement('div');
  div.className = 'form-box px-4 py-2';
  div.classList.add('form-group');
  div.classList.add(`form-group-${entry.type}`);
  div.setAttribute('data-field-name', entry.name);
  if (!entry.class) entry.class = 'mb-0';

  if (entry.class)
    entry.class.split(' ').forEach((cls) => cls.trim() && div.classList.add(cls.trim()));

  if (entry.classOverride) div.className = 'form-box ' + entry.classOverride;
  //else div.classList.add('w-full');

  let formElement: HTMLElement | HTMLInputElement;
  let hintElm: HTMLElement;

  let label = entry?.label === undefined ? entry.name : entry.label;

  let additionalFormElement: HTMLElement;

  // Store the wrapper container if textarea is expandable
  let textareaWrapper: HTMLDivElement | null = null;

  let subFields = [];
  let isDropdown = false;
  let isTagInput = false;
  let templateVarInput: HTMLInputElement | null = null;
  let templateVarToggle: HTMLInputElement | null = null;
  let templateVarModeDefault = false;
  let hasTemplateVarToggle = false;

  switch (entry.type) {
    case 'select':
    case 'dropdown':
    case 'SELECT':
    case 'DROPDOWN':
      formElement = createSelectBox(entry.options, value, entry?.dropdownHeight);

      if (entry.readonly) {
        formElement.setAttribute('disabled', 'disabled');
      }

      isDropdown = true;
      hasTemplateVarToggle =
        String(attributes?.['data-template-vars'] || '').toLowerCase() === 'true';

      break;
    case 'checkbox':
    case 'CHECKBOX':
      formElement = createCheckbox(label, value);

      const hint = entry.hint;

      // if (hint) {
      //     hintElm = document.createElement('small');
      //     hintElm.classList.add('field-hint');
      //     hintElm.innerHTML = hint;
      // }

      label = null;

      break;
    case 'checkbox-group':
    case 'CHECKBOX-GROUP':
      formElement = createCheckboxGroup(entry.options, value);

      break;

    case 'kvjson':
    case 'KVJSON':
      {
        const textareaResult = createTextArea(entry);
        // Handle both return types: direct textarea or object with textarea and container
        if (typeof textareaResult === 'object' && 'container' in textareaResult) {
          formElement = textareaResult.textarea;
          textareaWrapper = textareaResult.container;
        } else {
          formElement = textareaResult as HTMLTextAreaElement;
        }
      }
      if (!entry.actions) entry.actions = [];
      const kvParams: any = { title: entry.label };
      if (entry.attributes?.['data-vault']) {
        kvParams.showVault = true;
        kvParams.vaultScope = entry.attributes['data-vault'];
      }
      entry.actions.push({
        label: '',
        icon: 'fa-regular fa-pen-to-square',
        id: 'editHeaders',
        events: {
          click: handleKvFieldEditBtn.bind(workspace.RSidebarComponent, entry.name, kvParams),
        },
      });
      break;
    case 'textarea':
    case 'TEXTAREA':
      {
        // Get current content type from component data or sidebar (for backward compatibility)
        let contentType = '';
        try {
          const contentTypeSelect = document.querySelector('#contentType') as HTMLSelectElement;
          contentType = contentTypeSelect?.value || '';
        } catch (e) {
          // If no content type select found, try to get from component data
          const currentComponent = (window as any).Component?.curComponentSettings;
          contentType = currentComponent?.data?.contentType || '';
        }

        // Only create vault condition for the 'body' field in APICall component
        // The contentType is bound to the body field, while other fields are independent
        let vaultCondition = undefined;
        const isBodyField = entry.name === 'body' || entry.id === 'body';

        if (isBodyField) {
          vaultCondition = {
            property: 'contentType',
            value: 'application/json',
            getValue: () => {
              try {
                const select = document.querySelector('#contentType') as HTMLSelectElement;
                return select?.value || '';
              } catch {
                const currentComponent = (window as any).Component?.curComponentSettings;
                return currentComponent?.data?.contentType || '';
              }
            },
          };
        }
        // For other fields with data-vault attribute, vault button will show by default

        const textareaResult = createTextArea({
          ...entry,
          contentType: contentType,
          vaultCondition: vaultCondition,
        });

        // Handle both return types: direct textarea or object with textarea and container
        if (typeof textareaResult === 'object' && 'container' in textareaResult) {
          formElement = textareaResult.textarea;
          textareaWrapper = textareaResult.container;
        } else {
          formElement = textareaResult as HTMLTextAreaElement;
        }
      }

      if (entry?.code) {
        formElement.addEventListener('created', async () => {
          const mode = entry?.code?.mode;
          const theme = entry?.code?.theme || 'tomorrow';
          const editors = setCodeEditor(formElement, mode, theme, entry?.code?.disableWorker);
          (<any>formElement)._editor.setValue((<any>formElement).value);

          if (entry?.code?.editorHeight) {
            editors?.forEach((editor: any) => {
              editor?.setOptions({
                maxLines: entry?.code?.editorHeight,
              });
            });
          }
        });
      }
      if (entry?.toggle?.toLowerCase() === 'json') {
        if (displayType === 'block') {
          const checkbox: any = createCheckbox('json', value);
          checkbox.onchange = function () {
            toggleMode(formElement, checkbox.checked);
          };
          const checkboxDiv: any = document.createElement('div');
          checkboxDiv.appendChild(checkbox);
          div.appendChild(checkboxDiv);
          setTimeout(() => {
            checkbox.parentElement.style.float = 'right';
            checkbox.parentElement.style.height = '20px';
            // Get all elements with the class '.checkbox'
            const checkboxes: NodeListOf<HTMLInputElement> = document?.querySelectorAll?.('.check');
            checkboxes?.forEach?.((checkbox: HTMLInputElement) => {
              if (checkbox) {
                checkbox.style.height = '15px';
                checkbox.style.width = '15px';
                checkbox.style.border = '1px solid black';
              }
            });
            toggleMode(formElement, checkbox.checked);
          }, 200);
        }
      }
      break;

    case 'button':
    case 'BUTTON':
      formElement = createButton(entry.label, value);

      div.classList.remove('form-group');
      div.classList.remove('form-button');

      label = '';

      break;

    case 'color':
    case 'COLOR':
      formElement = createColorInput(value);

      break;

    case 'div':
    case 'span':
    case 'p':
    case 'DIV':
    case 'SPAN':
    case 'P':
      const html = typeof entry.html === 'function' ? entry.html() : entry.html;
      formElement = createHtmlElm(entry.type, html);

      div.classList.remove('form-group');
      div.classList.remove('form-button');
      div.classList.add('form-html');
      label = null;
      break;

    case 'key-value':
    case 'KEY-VALUE':
      formElement = createKeyValuePair(entry);

      // when we have existing key-value data, we will not add the 'pristine' class
      if (!entry?.key) {
        formElement.classList.add('pristine');
      }

      break;
    case 'table':
    case 'TABLE':
      formElement = createFormTable(entry);
      if (!entry?.key) {
        formElement.classList.add('pristine');
      }
      break;

    case 'range':
    case 'RANGE':
      const { rangeInput, numberInput } = createRangeInput(entry);

      formElement = rangeInput;
      additionalFormElement = numberInput;

      break;

    case 'tag':
    case 'TAG':
      formElement = createTagInput({ maxTags: entry.maxTags, value });
      isTagInput = true;

      break;

    case 'composite':
    case 'COMPOSITE':
      // Set the initial value and data attribute based on whether the entry is a sub composite
      const isArraySubFields = Array.isArray(entry?.subFields);
      const initialValue = value || (isArraySubFields ? '[]' : '{}');
      const compositeInputType = entry?.isSubComposite ? 'sub' : 'main';

      // Hidden input to store sub field values
      formElement = createHiddenInput(initialValue) as HTMLInputElement;

      // Textarea field for Debug purpose
      // formElement = createTextArea({value: initialValue});

      // Set the data attribute to identify the type of composite input, we may have nested composite inputs
      formElement.setAttribute('data-composite-input', compositeInputType);

      // Create sub fields
      subFields = createSubFields(formElement, entry);

      break;

    case 'hidden':
    case 'HIDDEN':
      // Serialize objects to JSON string for hidden fields (they only accept strings)
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      formElement = createHiddenInput(serializedValue);

      break;

    case 'toggle':
    case 'TOGGLE':
      formElement = createToggle(entry.label, value, entry.hintOnSelect);
      // label = null;
      break;

    case 'radio':
    case 'RADIO':
      formElement = createRadio({
        options: entry.options,
        name: entry?.name,
        value: entry?.value,
        events: { ...entry.events },
        fieldCls: entry?.fieldCls,
        readonly: entry?.readonly,
      });

      // Delete events from entry object as it's already added to the radio button
      delete entry.events;

      break;

    case 'date':
    case 'DATE':
      formElement = createInput(value);
      formElement.setAttribute('type', 'date');

      formElement.classList.add('form-control');

      break;

    case 'number':
    case 'NUMBER':
      formElement = createInput(value || 0);
      formElement.setAttribute('type', 'number');

      // Set number-specific attributes if provided
      if (entry.min !== undefined) formElement.setAttribute('min', entry.min);
      if (entry.max !== undefined) formElement.setAttribute('max', entry.max);
      if (entry.step !== undefined) formElement.setAttribute('step', entry.step);
      if (entry.placeholder !== undefined)
        formElement.setAttribute('placeholder', entry.placeholder);

      formElement.classList.add('form-control');

      break;

    case 'datalist':
    case 'DATALIST':
      // Create text input with datalist support for autocomplete
      // The datalist is lazily created on first focus using options from the global registry
      // This prevents storing large arrays in field definitions
      const datalistId = entry.datalistId || `${entry.name}-datalist`;
      formElement = createDatalistInput(value, datalistId);
      formElement.classList.add('form-control');

      break;

    default:
      formElement = createInput(value);

      formElement.setAttribute('type', entry.type);
      formElement.classList.add('form-control');
  }

  // It's important to check if the hint is undefined. Because we have a case where we have empty string as hint but need to register attributes related to hint. Specially for conditional fields.
  if (entry?.hint !== undefined) {
    // If hintPosition is one of the ('top', 'right', 'bottom', 'left'),
    // the hint will be displayed as a floating tooltip that appears on hover rather than
    // being permanently visible in the form layout
    if (['top', 'right', 'bottom', 'left'].includes(entry?.hintPosition)) {
      // Use lightweight TooltipV2 instead of Radix Tooltip for better performance
      attachTooltipV2(div, {
        text: entry.hint,
        position: mapMetroPositionToTooltipV2(entry?.hintPosition),
        className: mapMetroClassesToTooltipV2('bg-gray-50 shadow-lg'),
        delayDuration: 300,
      });

      // Additional hint
      if (entry?.additionalHint) {
        hintElm = createHint(entry?.additionalHint);
      }
    } else {
      hintElm = createHint(entry.hint);
    }
  }

  let fieldClasses = 'bg-gray-50 rounded-lg';

  if (entry.type === 'checkbox') {
    fieldClasses = 'bg-transparent rounded-lg';
  } else if (entry.type === 'toggle') {
    // background color set when we create the toggle input
    fieldClasses = '';
  }

  fieldClasses += ` ${entry?.formControlCls || ''}`;

  formElement.classList.add(`smt-input-${entry.type}`);
  formElement.className += ` text-gray-900 border border-gray-200 sm:text-md ${fieldClasses}`;

  if (templateVarInput) {
    // Don't add Metro UI classes, use clean Tailwind styling instead
    templateVarInput.className += ` text-gray-900 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldClasses}`;
  }

  if (entry?.type?.toLowerCase() !== 'key-value' && entry?.type?.toLowerCase() !== 'table') {
    formElement.setAttribute('id', entry.name);
    if (entry.name) formElement.setAttribute('name', entry.name);

    // We configure attributes for 'key-value' type fields separately in the '_createKvInputField()' function in the file 'src/frontend/ui/form/keyValueField.ts'.
    for (let attr in attributes) {
      if (attr === 'data-vault-exclusive' && [true, 'true'].includes(attributes[attr])) {
        formElement.setAttribute('disabled', 'disabled');
      }

      if (templateVarInput && attr === 'data-template-vars') {
        continue;
      }

      formElement.setAttribute(attr, attributes[attr]);
    }

    if (templateVarInput) {
      // Selectively copy attributes, excluding Metro UI and style-related attributes
      const excludedAttrs = ['data-role', 'data-template-vars', 'disabled', 'readonly'];

      for (let attr in attributes) {
        // Skip Metro UI and excluded attributes
        if (excludedAttrs.includes(attr)) {
          continue;
        }

        // Don't set disabled even for vault-exclusive
        if (attr === 'data-vault-exclusive') {
          continue;
        }

        templateVarInput.setAttribute(attr, attributes[attr]);
      }
    }
  }

  const vaultFieldActions = makeVaultFieldActions(formElement);

  if (vaultFieldActions?.children?.length > 0) {
    div.appendChild(vaultFieldActions);
  }

  if (entry.cls) formElement.className += ` ${entry.cls}`;

  // if (label && displayType === 'inline') {
  //     formElement.setAttribute('data-prepend', label);
  // }
  formElement.setAttribute('data-clear-button', 'false');
  //formElement.setAttribute('data-prepend', entry.label || entry.name); //

  if (entry.readonly) formElement.setAttribute('readonly', '');
  if (templateVarInput && entry.readonly) templateVarInput.setAttribute('readonly', '');
  if (entry.validate) {
    if (entry.doNotValidateOnLoad) {
      // Store validation rules but don't apply them yet
      formElement.setAttribute('data-validate-rules', entry.validate);
      // Add validation after first user interaction
      const enableValidation = () => {
        formElement.setAttribute('data-validate', entry.validate);
        formElement.removeAttribute('data-validate-rules');
        formElement.removeEventListener('focus', enableValidation);
        formElement.removeEventListener('input', enableValidation);
        formElement.removeEventListener('change', enableValidation);
      };
      formElement.addEventListener('focus', enableValidation, { once: true });
      formElement.addEventListener('input', enableValidation, { once: true });
      formElement.addEventListener('change', enableValidation, { once: true });
    } else {
      formElement.setAttribute('data-validate', entry.validate);
    }
  }

  /*
    * "entry.smythValidate" allows custom validation using asynchronous functions. (Metro UI does not support asynchronous function.)
    ? Logic is here - src/frontend/ui/form/smyth-validator.ts
    */
  if (entry.smythValidate) formElement.setAttribute('data-smyth-validate', entry.smythValidate);

  // Handle events for tag inputs differently
  if (isTagInput && Object.keys(events).length > 0) {
    // Store events to be attached after MetroUI initialization
    formElement.setAttribute('data-deferred-events', JSON.stringify(events));
  } else {
    // Add events for non-tag inputs (template var input events are handled in createTemplateVarToggle)
    for (let event in events) formElement.addEventListener(event, events[event]);
  }

  // add template variables
  if (entry?.variables) {
    const variables = window['__FIELD_TEMPLATE_VARIABLES__']?.[entry?.name] || new Map();

    for (const [key, value] of Object.entries(entry.variables)) {
      variables.set(key, { var: value, type: 'field' });
    }

    window['__FIELD_TEMPLATE_VARIABLES__'][entry?.name] = variables;
  }

  // Real-time validation - only clear error when field becomes valid
  if (
    (entry.validate?.includes('custom') || entry.smythValidate?.includes('func=')) &&
    formElement.tagName !== 'SELECT'
  ) {
    formElement.addEventListener('input', async (e: Event) => {
      const input = e.target as HTMLInputElement;
      const formControl = input.closest('.form-control');
      const value = input.value.trim();

      // Extract validator function name (supports both func= and custom= formats)
      const match = (entry.smythValidate || entry.validate)?.match(/(?:func|custom)=(\w+)/);
      const validatorFunc = match && (window as any)[match[1]];

      // Validate and update UI
      if (value && validatorFunc) {
        const isValid = await Promise.resolve(validatorFunc(value));
        formControl?.classList.toggle('invalid', !isValid);
      } else if (!value && (entry.validate?.includes('required') || entry.required)) {
        formControl?.classList.add('invalid');
      }
    });
  }

  let labelElement = null;
  let labelWrapper = null;
  if (label /*&& displayType !== 'inline'*/) {
    labelElement = document.createElement('label');
    labelElement.className = `form-label text-[#1E1E1E] text-sm font-medium mb-1.5 ${
      attributes.labelCase ? attributes.labelCase : 'capitalize'
    }`;

    if (entry.type?.toLowerCase() === 'key-value' || entry.type?.toLowerCase() === 'table') {
      labelElement.classList.add('form-label__kv');
    }
    labelElement.setAttribute('for', entry.name);
    const labelSpan = document.createElement('span');
    if (entry?.validate?.includes('required')) {
      labelSpan.innerHTML = `${label} <span class="text-red-500">*</span>`;
    } else {
      labelSpan.innerHTML = label;
    }

    labelElement.appendChild(labelSpan);

    generateTooltip(entry, labelSpan, entryIndex);
  } else if (entry.help && formElement) {
    generateTooltip(entry, formElement, entryIndex);
  }

  if (entry.type === 'checkbox') {
    delay(500).then(() => {
      const checkboxLabel = div.querySelector('.checkbox .caption') as HTMLElement;
      generateTooltip(entry, checkboxLabel, entryIndex);
    });
  }

  if (entry?.actions && entry?.actions.length) {
    !(async () => {
      const actionElms = [];
      for (const action of entry?.actions) {
        // Skip generating standard action buttons for 'after-dropdown' position since these use custom dropdown-specific styling
        if (action.position === 'after-dropdown') {
          continue;
        }

        let _shouldDisplay = true;

        if (typeof action?.shouldDisplay === 'function') {
          _shouldDisplay = await action.shouldDisplay();

          if (!_shouldDisplay) continue;
        }

        const actionBtn = createActionButton(action);

        // Add tooltip handling for action buttons
        applyTooltipConfig(actionBtn, action);

        actionElms.push(actionBtn);

        if (typeof action?.afterCreation === 'function') {
          action.afterCreation(actionBtn);
        }
      }

      const actionWrapper = document.createElement('div');
      actionWrapper.classList.add('smyth-field-actions', 'absolute', 'w-full', 'h-full');

      for (const actionElm of actionElms) {
        actionWrapper.appendChild(actionElm);
      }

      // Ensure the actionWrapper is the first child of the div to maintain proper positioning
      div.prepend(actionWrapper);
      // if (labelElement) {
      //     labelElement.appendChild(actionWrapper);
      // } else {
      //     div.appendChild(actionWrapper);
      // }
    })();
  }

  delay(500).then(() => {
    // Wait for dropdown menu to render before generating action buttons that need to be positioned relative to it
    if (entry?.actions && entry?.actions.length) {
      for (const action of entry?.actions) {
        if (action.position === 'after-dropdown') {
          const dropContainer = div.querySelector('.drop-container');
          dropContainer.classList.add('pb-14');

          if (dropContainer) {
            const actionBtn = createActionButtonAfterDropdown(action);

            // Add tooltip handling for after-dropdown action buttons
            applyTooltipConfig(actionBtn, action);

            dropContainer.appendChild(actionBtn);
          }
        }
      }
    }
  });

  // Create template variable toggle if needed
  if (hasTemplateVarToggle && labelElement) {
    const toggleResult = createTemplateVarToggle(entry, value, formElement, events);
    templateVarInput = toggleResult.templateVarInput;
    templateVarToggle = toggleResult.templateVarToggle;
    templateVarModeDefault = toggleResult.templateVarModeDefault;

    labelWrapper = document.createElement('div');
    labelWrapper.className = 'flex items-center justify-between gap-2 mb-0.5';
    labelWrapper.appendChild(labelElement);
    labelWrapper.appendChild(toggleResult.toggleWrapper);
  }

  const labelContainer = labelWrapper || labelElement;
  if (labelContainer) {
    div.appendChild(labelContainer);
  }

  if (entry?.loading) {
    const spinner = createSpinner('black', 'absolute right-2.5 top-3.5 field-spinner');
    div.appendChild(spinner);
  }

  //inject bracket selection event to the input element
  addBracketSelection(formElement);
  if (templateVarInput) {
    addBracketSelection(templateVarInput);
  }

  // Determine which element to append (wrapper container or direct formElement)
  let elementToAppend = textareaWrapper || formElement;

  if (templateVarInput) {
    const templateVarContainer = document.createElement('div');
    templateVarContainer.appendChild(formElement);

    // Create wrapper for template input with clear button
    const templateInputWrapper = document.createElement('div');
    templateInputWrapper.className = 'relative';
    templateInputWrapper.style.display = 'none';

    templateInputWrapper.appendChild(templateVarInput);

    // Create clear button for template variable input
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className =
      'absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors';
    clearButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    clearButton.title = 'Clear template variables';
    clearButton.style.display = 'none';

    clearButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      templateVarInput.value = '';
      clearButton.style.display = 'none';
      templateVarInput.dispatchEvent(new Event('input', { bubbles: true }));
      templateVarInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Show/hide clear button based on input value
    const updateClearButton = () => {
      clearButton.style.display = templateVarInput.value ? '' : 'none';
    };

    templateVarInput.addEventListener('input', updateClearButton);
    templateVarInput.addEventListener('change', updateClearButton);

    // Initial check
    updateClearButton();

    templateInputWrapper.appendChild(clearButton);
    templateVarContainer.appendChild(templateInputWrapper);

    // Store reference to wrapper for visibility toggling
    (templateVarInput as HTMLInputElement & { wrapper?: HTMLElement }).wrapper =
      templateInputWrapper;

    elementToAppend = templateVarContainer;
  }

  if (additionalFormElement) {
    /*
            Basically we implement it for 'range' type input
            But we can extend it to other types if needed
        */
    const rangeWrapper = document.createElement('div');
    rangeWrapper.classList.add('flex');

    rangeWrapper.appendChild(elementToAppend);
    rangeWrapper.appendChild(additionalFormElement);

    div.appendChild(rangeWrapper);
  } else if (entry?.display === 'inline') {
    if (labelElement) {
      labelElement.appendChild(elementToAppend);
    } else {
      div.appendChild(elementToAppend);
    }
  } else {
    div.appendChild(elementToAppend);
  }

  // append subfields if exists for 'composite' type input
  if (subFields.length) {
    div.append(...subFields);
  }

  // append hint element
  if (hintElm) {
    if (entry?.hintPosition === 'after_label') {
      hintElm.classList.add('mb-2', 'mt-0');
      if (labelContainer) {
        labelContainer.insertAdjacentElement('afterend', hintElm);
      } else {
        div.appendChild(hintElm);
      }
    } else {
      div.appendChild(hintElm);
    }
  }

  //draw activity status
  if (entry.status) {
    const status = document.createElement('div');
    status.classList.add('status');
    switch (entry.status) {
      case 'loading':
        status.classList.add('loading');
        status.classList.add('anim-arrow-loader');
        break;
      case 'error':
        status.classList.add('error');
        break;
    }
    div.appendChild(status);
  }

  if (entry.validateMessage) {
    const span = document.createElement('span');
    span.classList.add('invalid_feedback');
    // Use textContent instead of innerHTML for validation messages (no HTML needed)
    span.textContent = entry.validateMessage;

    // For expandable textareas, append the error message inside the wrapper
    // Position it absolutely below the textarea so it doesn't push the expand button
    if (textareaWrapper) {
      span.style.cssText =
        'display: none; position: absolute; bottom: -24px; left: 0; font-size: 12px; color: #c50f1f; font-weight: 500;';
      textareaWrapper.style.position = 'relative';
      textareaWrapper.style.marginBottom = '24px';
      textareaWrapper.appendChild(span);
    } else {
      div.appendChild(span);
    }
  }

  formElement.dispatchEvent(new Event('created'));

  // Handle tag input events after MetroUI initialization
  if (isTagInput && Object.keys(events).length > 0) {
    delay(100).then(() => {
      setupTagInputEvents(formElement, events);
    });
  }

  if (typeof entry?.onLoad === 'function') {
    entry.onLoad(div);
  }
  if (entry?.withoutSearch) {
    div.classList.add('without-search');
  }

  return div;
}

/**
 * Creates template variable toggle UI and logic for select fields
 * Uses native HTML input (no Metro UI) for better control and performance
 * @param entry - The form field entry configuration
 * @param value - The current value of the field
 * @param formElement - The main form element (select)
 * @param events - Event handlers to attach to template input
 * @returns Object containing template input, toggle elements, and default state
 */
function createTemplateVarToggle(
  entry: any,
  value: any,
  formElement: HTMLElement,
  events: Record<string, Function>,
) {
  // Create native HTML input (no Metro UI) for template variables
  const templateVarInput = document.createElement('input');
  templateVarInput.type = 'text';
  templateVarInput.value = value || '';
  templateVarInput.placeholder = 'Click to select a template variable';
  templateVarInput.autocomplete = 'off';
  templateVarInput.setAttribute('data-template-vars', 'true');
  templateVarInput.classList.add('template-var-input');
  templateVarInput.style.paddingRight = '36px';
  templateVarInput.style.backgroundColor = '#ffffff';
  templateVarInput.style.cursor = 'pointer';
  templateVarInput.style.opacity = '1';

  // Copy template-related attributes from entry for variable filtering
  const attributes = entry.attributes || {};
  if (attributes['data-template-excluded-vars']) {
    templateVarInput.setAttribute(
      'data-template-excluded-vars',
      attributes['data-template-excluded-vars'],
    );
  }
  if (attributes['data-template-excluded-var-types']) {
    templateVarInput.setAttribute(
      'data-template-excluded-var-types',
      attributes['data-template-excluded-var-types'],
    );
  }

  // Prevent keyboard input - users should only insert template variables via buttons
  templateVarInput.addEventListener('keydown', (e) => {
    const allowedKeys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab',
      'Backspace',
      'Delete',
    ];
    const isCtrlCmd = e.ctrlKey || e.metaKey;
    const isSelectionKey =
      isCtrlCmd && (e.key === 'a' || e.key === 'A' || e.key === 'c' || e.key === 'C');

    if (!allowedKeys.includes(e.key) && !isSelectionKey) {
      e.preventDefault();
    }
  });

  templateVarInput.addEventListener('paste', (e) => {
    e.preventDefault();
  });

  // Attach events to template input
  for (let event in events) {
    templateVarInput.addEventListener(event, events[event] as EventListener);
  }

  // Get saved toggle state from component data
  const currentComponent = (window as any).Component?.curComponentSettings;
  const savedToggleState = currentComponent?.data?.templateVarToggleStates?.[entry.name];
  const templateVarModeDefault =
    savedToggleState !== undefined
      ? savedToggleState
      : typeof value === 'string' && /{{.*?}}/.test(value);

  // Create toggle checkbox
  const templateVarToggle = document.createElement('input');
  templateVarToggle.type = 'checkbox';
  templateVarToggle.className = 'sr-only peer';
  templateVarToggle.title = 'Use template variable';
  templateVarToggle.setAttribute('aria-label', 'Use template variable');
  templateVarToggle.id = `template-toggle-${entry.name}`;
  templateVarToggle.checked = templateVarModeDefault;
  templateVarToggle.disabled = entry.readonly;

  // Create toggle UI elements
  const toggleLabel = document.createElement('label');
  toggleLabel.className =
    'text-xs font-medium text-gray-600 cursor-pointer select-none hover:text-gray-800 transition-colors';
  toggleLabel.textContent = 'Use Template Vars';
  toggleLabel.htmlFor = `template-toggle-${entry.name}`;

  const toggleSwitch = document.createElement('div');
  toggleSwitch.className =
    'relative w-8 h-4 bg-gray-300 rounded-full cursor-pointer transition-all duration-300 shadow-inner hover:shadow-md';
  toggleSwitch.setAttribute('role', 'presentation');

  const toggleThumb = document.createElement('div');
  toggleThumb.className =
    'absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 transform';
  toggleSwitch.appendChild(toggleThumb);

  const toggleWrapper = document.createElement('div');
  toggleWrapper.className = 'flex items-center gap-2';
  toggleWrapper.appendChild(toggleLabel);
  toggleWrapper.appendChild(templateVarToggle);
  toggleWrapper.appendChild(toggleSwitch);

  // Initialize toggle appearance
  if (templateVarModeDefault) {
    toggleSwitch.classList.remove('bg-gray-300');
    toggleSwitch.classList.add('bg-blue-500');
    toggleThumb.classList.add('translate-x-4');
    toggleThumb.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
  }

  // Update toggle switch appearance on change
  templateVarToggle.addEventListener('change', () => {
    if (templateVarToggle.checked) {
      toggleSwitch.classList.remove('bg-gray-300');
      toggleSwitch.classList.add('bg-blue-500');
      toggleThumb.classList.add('translate-x-4');
      toggleThumb.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
    } else {
      toggleSwitch.classList.add('bg-gray-300');
      toggleSwitch.classList.remove('bg-blue-500');
      toggleThumb.classList.remove('translate-x-4');
      toggleThumb.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
    }

    // Update hidden form field for persistence
    const form = templateVarToggle.closest('form');
    const hiddenField = form?.querySelector(
      'input[name="templateVarToggleStates"]',
    ) as HTMLInputElement;

    if (hiddenField) {
      try {
        const currentStates = hiddenField.value ? JSON.parse(hiddenField.value) : {};
        currentStates[entry.name] = templateVarToggle.checked;
        hiddenField.value = JSON.stringify(currentStates);
      } catch (e) {
        console.error('[Template Vars] Failed to update hidden field:', e);
      }
    }
  });

  // Make the switch clickable
  toggleSwitch.addEventListener('click', () => {
    templateVarToggle.click();
  });

  // Create visibility toggle logic
  let lastSelectValue = value;
  const templateVarOnlyPattern = /^\s*{{[^{}]+}}\s*$/;

  const setSelectVisibility = (useTemplateInput: boolean) => {
    const selectWrapper =
      formElement.closest('label.select') || formElement.closest('.select') || formElement;
    if (selectWrapper instanceof HTMLElement) {
      selectWrapper.style.display = useTemplateInput ? 'none' : '';
    }
    const inputWrapper = (templateVarInput as HTMLInputElement & { wrapper?: HTMLElement }).wrapper;
    if (inputWrapper) {
      inputWrapper.style.display = useTemplateInput ? '' : 'none';
    } else {
      templateVarInput.style.display = useTemplateInput ? '' : 'none';
    }

    if (useTemplateInput) {
      const currentValue = templateVarInput.value.trim();
      const isCurrentValueValid =
        currentValue.length === 0 || templateVarOnlyPattern.test(currentValue);

      if (!isCurrentValueValid && !templateVarModeDefault) {
        templateVarInput.value = '';
      } else if (!templateVarInput.value && templateVarModeDefault) {
        templateVarInput.value = String(value ?? '');
      }

      const trimmedValue = templateVarInput.value.trim();
      const isValid = trimmedValue.length === 0 || templateVarOnlyPattern.test(trimmedValue);
      templateVarInput.classList.toggle('invalid', !isValid);
      templateVarInput.setAttribute('name', entry.name);
      templateVarInput.setAttribute('id', entry.name);
      formElement.removeAttribute('name');
      formElement.removeAttribute('id');
    } else {
      templateVarInput.classList.remove('invalid');
      formElement.setAttribute('name', entry.name);
      formElement.setAttribute('id', entry.name);
      templateVarInput.removeAttribute('name');
      templateVarInput.removeAttribute('id');

      const selectElement = formElement as HTMLSelectElement;
      const nextValue =
        selectElement.options &&
        [...selectElement.options].some((opt) => opt.value === lastSelectValue)
          ? lastSelectValue
          : selectElement.value;
      selectElement.value = nextValue;
    }
  };

  // Track select changes
  formElement.addEventListener('change', () => {
    lastSelectValue = (formElement as HTMLSelectElement).value;
  });

  // Set up toggle change handler
  templateVarToggle.addEventListener('change', () => {
    setSelectVisibility(templateVarToggle.checked);
  });

  // Set up input validation
  templateVarInput.addEventListener('input', () => {
    if (!templateVarToggle?.checked) return;
    const trimmedValue = templateVarInput.value.trim();
    const isValid = trimmedValue.length === 0 || templateVarOnlyPattern.test(trimmedValue);
    templateVarInput.classList.toggle('invalid', !isValid);
  });

  // Initialize visibility
  setTimeout(() => setSelectVisibility(templateVarModeDefault), 0);

  return {
    templateVarInput,
    templateVarToggle,
    toggleWrapper,
    templateVarModeDefault,
  };
}

/**
 * Setup events for tag inputs using MetroUI's event system
 */
function setupTagInputEvents(formElement: HTMLElement, events: Record<string, Function>) {
  try {
    // Wait for MetroUI to be fully initialized
    setTimeout(() => {
      const tagInputContainer = formElement.closest('.tag-input');

      if (!tagInputContainer) {
        return;
      }

      if (events.change) {
        // Listen for tag removal clicks
        tagInputContainer.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('remover')) {
            // Tag is being removed, trigger change after a small delay
            setTimeout(() => {
              const syntheticEvent = new CustomEvent('change', { bubbles: true });
              Object.defineProperty(syntheticEvent, 'target', { value: formElement });
              events.change(syntheticEvent);
            }, 50);
          }
        });

        // Listen for tag creation via keyboard
        const inputWrapper = tagInputContainer.querySelector('.input-wrapper');
        if (inputWrapper) {
          inputWrapper.addEventListener('keydown', (e: KeyboardEvent) => {
            // Check if this is a tag creation key
            if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
              const input = e.target as HTMLInputElement;
              if (input.value.trim()) {
                // Tag will be created, trigger change after a small delay
                setTimeout(() => {
                  const syntheticEvent = new CustomEvent('change', { bubbles: true });
                  Object.defineProperty(syntheticEvent, 'target', { value: formElement });
                  events.change(syntheticEvent);
                }, 50);
              }
            }
          });
        }

        // Also use MutationObserver as fallback
        setupTagInputDOMEvents(formElement, events);
      }
    }, 200);
  } catch (error) {
    console.warn('Error setting up tag input events:', error);
    // Fallback to DOM events
    setupTagInputDOMEvents(formElement, events);
  }
}

/**
 * Fallback DOM event setup for tag inputs
 */
function setupTagInputDOMEvents(formElement: HTMLElement, events: Record<string, Function>) {
  const tagInputContainer = formElement.closest('.tag-input');

  if (!tagInputContainer) {
    console.warn('Tag input container not found for DOM events fallback');
    return;
  }

  // Setup MutationObserver to watch for tag changes
  const observer = new MutationObserver((mutations) => {
    let tagChanged = false;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Check if tags were added or removed
        const addedTags = Array.from(mutation.addedNodes).some(
          (node) => node instanceof HTMLElement && node.classList.contains('tag'),
        );
        const removedTags = Array.from(mutation.removedNodes).some(
          (node) => node instanceof HTMLElement && node.classList.contains('tag'),
        );

        if (addedTags || removedTags) {
          tagChanged = true;
        }
      }
    });

    if (tagChanged) {
      // Trigger change event
      if (events.change) {
        const syntheticEvent = new CustomEvent('change', { bubbles: true });
        Object.defineProperty(syntheticEvent, 'target', { value: formElement });
        events.change(syntheticEvent);
      }
    }
  });

  // Start observing
  observer.observe(tagInputContainer, { childList: true, subtree: true });
}

function bracketSelectionEvent(e: any) {
  const inputElement: HTMLInputElement = e.target;
  const text = inputElement.value;

  let cursorPosition = inputElement.selectionStart;

  const regex = /{{.*?}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;

    if (start <= cursorPosition && cursorPosition <= end) {
      inputElement.selectionStart = start;
      inputElement.selectionEnd = end;
      break;
    }
  }
}

function handleCompositeInput(mainField, fieldName, subFieldElm) {
  const subFieldVal = subFieldElm.value;
  let mainFieldVal: any = mainField?.value;

  if (!mainFieldVal || !isValidJson(mainFieldVal)) {
    console.error(
      new Error(
        "Composite field should be a valid JSON string that can be parsed into an array '[]' or object '{}'.",
      ),
    );
    return [];
  }

  const isSubComposite = mainField.getAttribute('data-composite-input') === 'sub';
  mainFieldVal = JSON.parse(mainFieldVal);

  const isArrayVal = Array.isArray(mainFieldVal);

  mainFieldVal = isArrayVal ? mainFieldVal?.[0] || {} : mainFieldVal || {};

  const newSubFieldVal = isValidJson(subFieldVal) ? JSON.parse(subFieldVal) : subFieldVal;

  if (
    !newSubFieldVal ||
    (Array.isArray(newSubFieldVal) && !newSubFieldVal.length) ||
    (typeof newSubFieldVal === 'object' && !Object.keys(newSubFieldVal).length)
  ) {
    delete mainFieldVal[fieldName];
  } else {
    mainFieldVal[fieldName] = isValidJson(subFieldVal) ? JSON.parse(subFieldVal) : subFieldVal;
  }

  mainField.value = isArrayVal ? JSON.stringify([mainFieldVal]) : JSON.stringify(mainFieldVal);

  if (isSubComposite) {
    const groupElm = mainField.closest('.form-group-composite');
    const parentGroupElm = groupElm.parentNode.closest('.form-group-composite');
    const newMainField = parentGroupElm.querySelector('[data-composite-input]');
    handleCompositeInput(newMainField, mainField.getAttribute('data-name'), mainField);
  }
}

// define the 'createSubFields()' here to avoid circular dependency
export function createSubFields(mainField, entry) {
  let subFieldElms = [];

  const subFields =
    (Array.isArray(entry?.subFields) ? entry?.subFields?.[0] : entry?.subFields) || {};

  for (const [index, [_name, _entry]] of Object.entries(subFields).entries()) {
    if (_entry && typeof _entry === 'object') {
      const name = `${entry?.name}-${_name}`;
      let events = {};

      const entryType = _entry['type'].toLowerCase();

      if (entryType !== 'composite') {
        const inputHandler = (event) => handleCompositeInput(mainField, _name, event.target);

        if (entryType.toLowerCase() === 'select') {
          events = {
            change: inputHandler,
          };
        } else if (entryType.toLowerCase() === 'password') {
          events = {
            input: inputHandler,
            // When insert key from vault key list
            focus: async (event) => {
              await delay(100); // delay is required to wait for the key to be inserted
              inputHandler(event);
            },
          };
        } else {
          events = {
            input: inputHandler,
          };
        }
      }

      const field = createFormField(
        {
          name,
          isSubComposite: true,
          events,
          attributes: {
            'data-name': _name,
            ..._entry?.['attributes'],
          },
          ..._entry,
        },
        null,
      );

      subFieldElms.push(field);
    }
  }

  return subFieldElms;
}

function makeVaultFieldActions(formElement) {
  const fieldActions = document.createElement('div');
  fieldActions.classList.add('smyth-field-actions', 'absolute', 'w-full', 'h-full');

  const vaultElm = formElement.querySelector('[data-vault]') || formElement.closest('[data-vault]');
  if (vaultElm) {
    const vaultBtn = createActionButton({
      label: 'Vault',
      icon: 'mif-key',
      iconOnly: true,
      //classes: 'vault-action-btn',
      cls: 'vault-action-btn',
      attributes: {
        'data-smyth-dropdown-toggle': 'vault-keys-dropdown-menu', // 'vault-keys-dropdown-menu' is the id of the dropdown menu
      },
      events: {
        click: handleVaultBtn,
      },
    });

    fieldActions.appendChild(vaultBtn);

    if (fieldActions.children?.length > 0) {
      // apply indent to the default field button like 'hide/show', 'clear' etc.
      delay(100).then(() => {
        const formControl = formElement.closest('.form-group');

        const button = formControl.querySelector('.button-group .button') as HTMLButtonElement;

        if (button) {
          button.style.marginInlineEnd = fieldActions.children?.length * 30 + 'px';
        }
      });
    }
  }

  return fieldActions;
}

function generateTooltip(entry, elm, entryIndex) {
  if (!entry?.help) return '';
  const infoBtn = createInfoButton(
    entry?.help,
    {
      cls: 'btn-info ' + entry?.tooltipIconClasses || '',
      clsHint: 'smt-hint drop-shadow bg-[#111111] rounded-lg text-white text-left normal-case',
      position: entry?.hintPosition,
      arrowClasses: entry?.arrowClasses || '',
      tooltipClasses: entry?.tooltipClasses || '',
    },
    entryIndex,
  );
  elm.appendChild(infoBtn);
}

function applyTooltipConfig(actionBtn, action) {
  if (!action.tooltip) return;

  const defaultTooltipConfig = {
    position: 'top',
    classes:
      'bg-white shadow-lg text-black py-2 px-2 whitespace-nowrap max-w-[320px] -translate-x-[110px] rounded-lg',
    hideDelay: '500000',
    offset: '-4',
    text: typeof action.tooltip === 'string' ? action.tooltip : action.tooltip.text,
  };

  // Merge default config with custom config if provided
  const tooltipConfig =
    typeof action.tooltip === 'string'
      ? defaultTooltipConfig
      : { ...defaultTooltipConfig, ...action.tooltip };

  // Use lightweight TooltipV2 instead of Radix Tooltip for better performance
  attachTooltipV2(actionBtn, {
    text: tooltipConfig.text,
    position: mapMetroPositionToTooltipV2(tooltipConfig.position),
    className: mapMetroClassesToTooltipV2(tooltipConfig.classes),
    delayDuration: 300,
  });
}
