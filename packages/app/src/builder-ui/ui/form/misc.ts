import { dispatchInputEvent } from '../../utils/form.utils';
type Action = {
  id: string;
  label: string;
  iconOnly?: boolean;
  icon?: string;
  attributes?: Record<string, string>;
  cls?: string;
  events: { [key: string]: Function };
};

window['__LAST_FIELD_WITH_TEMPLATE_VARS__'] = '';

export function createActionButton(action: Record<string, any>) {
  const events = action.events || {};

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(
    'class',
    `field-action-btn absolute z-10 py-1 px-2 transition-opacity rounded-md h-8 hover:opacity-75 text-gray-400${
      action?.classes ? ' ' + action.classes : ''
    }`,
  );
  if (action.id) {
    button.setAttribute('id', action.id);
  }

  // Set attributes
  const attributes = action?.attributes || {};
  if (Object.keys(attributes)?.length) {
    for (let attr in attributes) button.setAttribute(attr, attributes[attr]);
  }

  if (action?.icon) {
    let icon;
    if (action?.icon.startsWith('fa-') || action?.icon.startsWith('fas')) {
      icon = document.createElement('i');
      icon.className = 'btn-icon ' + action?.icon;
    } else {
      icon = document.createElement('span');
      icon.classList.add('btn-icon');
      if (action?.icon.startsWith('<') && action?.icon.endsWith('>')) {
        icon.innerHTML = action?.icon;
      } else {
        icon.classList.add(action?.icon);
      }
    }

    // icon = document.createElement('span');
    // icon.classList.add('btn-icon', action?.icon, 'align-middle');

    // The icon wrapper is required to dynamically change its content for specific actions, such as displaying a loading spinner.
    const iconWrapper = document.createElement('span');
    iconWrapper.classList.add('btn-icon-wrapper');
    iconWrapper.appendChild(icon);

    button.appendChild(iconWrapper);
  }

  if (action?.cls) button.className += ` ${action.cls}`;

  if (!action?.iconOnly) {
    button.append(action.label ? ' ' + action.label : '');
  }

  for (let event in events) {
    button[`on${event}`] = events[event];
  }

  return button;
}

export function createActionButtonAfterDropdown(action: Record<string, any>): HTMLElement {
  const events = action.events || {};

  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add(
    'field-action-btn',
    'absolute',
    'top-auto',
    'bottom-0',
    'inset-x-0',
    'bg-white',
    'h-[50px]',
    'flex',
    'items-center',
    'px-4',
    'rounded-lg',
  );
  button.innerHTML = `<span class="text-sm">${action.label}</span>`;

  if (action.icons.left) {
    const leftIcon = document.createElement('span');
    leftIcon.innerHTML = action.icons.left?.svg || '';
    leftIcon.className = action.icons.left?.classes || '';
    button.prepend(leftIcon);
  }

  if (action.icons.right) {
    const rightIcon = document.createElement('span');
    rightIcon.innerHTML = action.icons.right?.svg || '';
    rightIcon.className = action.icons.right?.classes || '';
    button.append(rightIcon);
  }

  button.setAttribute('id', action.id);

  for (let event in events) {
    button[`on${event}`] = events[event];
  }

  return button;
}

export function createHtmlElm(type: string, html: string): HTMLElement {
  const elm = document.createElement(type);
  elm.innerHTML = html;

  return elm;
}

export function createTemplateVarBtn(
  label: string,
  value: string,
  type: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.classList.add('button', 'primary', 'small', 'template-var-button');

  let cls = '';

  if (type === 'field') {
    cls = ' btn-field-var';
  } else if (type === 'global') {
    cls = ' btn-global-var';
  } else if (type === 'trigger') {
    cls = ' btn-trigger-var';
  }

  button.className = `button primary small template-var-button${cls}`;
  button.setAttribute('data-var', value);
  button.innerHTML = label;

  return button;
}

const TEMPLATE_VAR_BTNS_WRAPPER_CLASS = 'template-var-buttons';

// TODO: Refactor this function as we have similar pattern of code
export function generateTemplateVarBtns(
  variables: Map<string, { var: string; type?: string }>,
  compUid = '',
  parentContainer?: HTMLElement,
): HTMLElement | null {
  // Look for existing wrapper within the specific parent container, not globally
  const searchScope = parentContainer || document;
  let wrapper = searchScope.querySelector(
    `.${TEMPLATE_VAR_BTNS_WRAPPER_CLASS}.tvb-${compUid}`,
  ) as HTMLDivElement;

  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.classList.add(TEMPLATE_VAR_BTNS_WRAPPER_CLASS, `tvb-${compUid}`);
  }

  // reset the wrapper
  wrapper.innerHTML = '';

  const inputVarWrapper = document.createElement('div');
  inputVarWrapper.classList.add('input-vars-wrapper');

  const fieldVarWrapper = document.createElement('div');
  fieldVarWrapper.classList.add('field-vars-wrapper');

  const globalVarWrapper = document.createElement('div');
  globalVarWrapper.classList.add('global-vars-wrapper');

  const triggerVarWrapper = document.createElement('div');
  triggerVarWrapper.classList.add('trigger-vars-wrapper');

  if (variables?.size > 0) {
    for (const [key, value] of variables) {
      if (key) {
        const button = createTemplateVarBtn(key, value?.var || key, value?.type);

        switch (value?.type) {
          case 'field':
            fieldVarWrapper.appendChild(button);
            wrapper.classList.add('fields');
            break;
          case 'global':
            globalVarWrapper.appendChild(button);
            wrapper.classList.add('globals');
            break;
          case 'trigger':
            triggerVarWrapper.appendChild(button);
            wrapper.classList.add('triggers');
            break;
          default:
            // Default case handles standard input types (e.g. Any, String, Binary) by adding them to inputVarWrapper
            inputVarWrapper.appendChild(button);
            break;
        }
      }
    }

    if (inputVarWrapper?.children?.length) {
      wrapper.appendChild(inputVarWrapper);
    }
    if (fieldVarWrapper?.children?.length) {
      wrapper.appendChild(fieldVarWrapper);
    }
    if (globalVarWrapper?.children?.length) {
      wrapper.appendChild(globalVarWrapper);
    }
    if (triggerVarWrapper?.children?.length) {
      wrapper.appendChild(triggerVarWrapper);
    }

    wrapper.style.display = 'block';
  } else {
    wrapper.style.display = 'none';
  }

  return wrapper;
}

// TODO: REFACTOR THIS FUNCTION
export function handleTemplateVars(targetElm, component = null) {
  targetElm.onclick = (e) => {
    try {
      const clickedElm = e.target as HTMLInputElement;
      // TODO: Use component?._uid as the new way to get the component UID.
      // * We're keeping the old approach for now to prevent potential issues.
      const compUid =
        component?._uid || document.querySelector('.component.active')?.getAttribute('id') || '';

      if (
        clickedElm.classList.contains('template-var-button') &&
        clickedElm.hasAttribute('data-var')
      ) {
        // * Insert the template variable into the field when the button is clicked

        e.preventDefault();

        // for some reason clickedElm does not able to get parent elements, so we need to query it again
        // Search for the button within the current target element scope (modal or inline)
        // This ensures we get the correct button when there are multiple forms (inline + modal)
        const buttonElm = targetElm.querySelector(
          `.template-var-button[data-var="${clickedElm.getAttribute('data-var')}"]`,
        ) as HTMLElement;

        // If button not found in current scope, return early
        if (!buttonElm) return;

        // Prioritize finding json-editor (ACE editor textarea) first, then fall back to regular fields
        const formGroup = buttonElm.closest('.form-group');
        const focusedField =
          (formGroup?.querySelector('.json-editor') as HTMLTextAreaElement) ||
          (formGroup?.querySelector('textarea[data-template-vars=true]') as HTMLTextAreaElement) ||
          (formGroup?.querySelector('textarea[data-agent-vars=true]') as HTMLTextAreaElement) ||
          (formGroup?.querySelector('input[data-template-vars=true]') as HTMLTextAreaElement) ||
          (formGroup?.querySelector('input[data-agent-vars=true]') as HTMLTextAreaElement) ||
          (formGroup?.querySelector('textarea[data-trigger-vars=true]') as HTMLTextAreaElement) ||
          (formGroup?.querySelector('input[data-trigger-vars=true]') as HTMLTextAreaElement) ||
          (formGroup?.querySelector('textarea') as HTMLTextAreaElement);

        // changing select element does not remove template-var-buttons and these buttons can add inputs to readonly field
        if (focusedField && !focusedField.hasAttribute('readonly')) {
          // check if it is ace editor by checking for _editor property
          const editor = (<any>focusedField)?._editor;
          if (editor) {
            const textToInsert: any = buttonElm.getAttribute('data-var');

            // Insert text at current cursor position in ACE editor
            editor.session.replace(editor?.selection?.getRange(), textToInsert);

            // Set the cursor to the new position
            editor?.moveCursorToPosition(editor?.getCursorPosition());

            editor?.focus();
          } else {
            // Get the start and end positions of the cursor.
            const startPosition = focusedField.selectionStart;
            const endPosition = focusedField.selectionEnd;

            // Insert the text into the textarea.
            const value = buttonElm.getAttribute('data-var');

            focusedField.value = `${focusedField.value.substring(
              0,
              startPosition,
            )}${value}${focusedField.value.substring(endPosition)}`;

            // Focus on the textarea again.
            focusedField.focus();

            dispatchInputEvent(focusedField);

            // Set the cursor position to the end of the text.
            const cursorPosition = startPosition + value?.length || 0;
            focusedField.setSelectionRange(cursorPosition, cursorPosition);
          }
        }

        // Remove the template variable buttons container
        document.querySelector(`.${TEMPLATE_VAR_BTNS_WRAPPER_CLASS}.tvb-${compUid}`)?.remove();
      } else if (
        (clickedElm.getAttribute('data-template-vars') === 'true' ||
          (clickedElm as HTMLElement)?.closest?.('[data-template-vars="true"]')) &&
        !(clickedElm as HTMLElement)?.closest?.('[readonly]')
      ) {
        // * Display template variable buttons only if the field is not readonly
        const inputVariables = window['__INPUT_TEMPLATE_VARIABLES__']?.[compUid] || new Map();

        // For ACE editors, find the actual textarea element to get the field name
        let fieldName = clickedElm?.name;
        if (!fieldName) {
          const formGroup = (clickedElm as HTMLElement).closest('.form-group');
          const textarea = formGroup?.querySelector(
            'textarea[data-template-vars=true]',
          ) as HTMLTextAreaElement;
          fieldName = textarea?.name;
        }

        // set the last field with template vars to keep the field variables when add/remove input
        window['__LAST_FIELD_WITH_TEMPLATE_VARS__'] = fieldName;

        let fieldVariables = window['__FIELD_TEMPLATE_VARIABLES__']?.[fieldName] || new Map();

        let globalVariables = window['__GLOBAL_TEMPLATE_VARIABLES__'] || new Map();

        const variables = new Map([
          ...inputVariables,
          ...fieldVariables,
          ...globalVariables,
        ]) as Map<string, { var: string; type: string }>;

        // #region Exclude variable based on the data-template-excluded-vars = <VAR_NAME1>,<VAR_NAME2> (Input Names)
        let excludeVars = clickedElm?.getAttribute('data-template-excluded-vars') || '';

        for (const _var of excludeVars.split(',')) {
          if (variables.has(_var)) {
            variables.delete(_var);
          }
        }
        // #endregion

        // #region Exclude variable based on the data-template-excluded-var-types = <VAR_TYPE1>,<VAR_TYPE2> (Input Types)
        const excludeVarTypes = clickedElm?.getAttribute('data-template-excluded-var-types') || '';
        const excludeVarTypesArr = excludeVarTypes.split(',');

        for (const [key, value] of variables) {
          if (excludeVarTypesArr.includes(value.type)) {
            variables.delete(key);
          }
        }
        // #endregion

        const focusedElmParent = clickedElm.closest('.form-group') as HTMLElement;
        const buttonsContainer = generateTemplateVarBtns(
          variables,
          compUid,
          focusedElmParent,
        ) as HTMLDivElement;

        if (!buttonsContainer) return;

        focusedElmParent.appendChild(buttonsContainer);
      } else if (
        (clickedElm.getAttribute('data-agent-vars') === 'true' ||
          (clickedElm as HTMLElement)?.closest?.('[data-agent-vars="true"]')) &&
        !(clickedElm as HTMLElement)?.closest?.('[readonly]')
      ) {
        // * Display template variable buttons only if the field is not readonly

        // For ACE editors, find the actual textarea element to get the field name
        let fieldName = clickedElm?.name;
        if (!fieldName) {
          const formGroup = (clickedElm as HTMLElement).closest('.form-group');
          const textarea = formGroup?.querySelector(
            'textarea[data-agent-vars=true]',
          ) as HTMLTextAreaElement;
          fieldName = textarea?.name;
        }

        // set the last field with template vars to keep the field variables when add/remove input
        window['__LAST_FIELD_WITH_TEMPLATE_VARS__'] = fieldName;

        let globalVariables = window['__GLOBAL_TEMPLATE_VARIABLES__'] || new Map();

        const variables = new Map([...globalVariables]) as Map<
          string,
          { var: string; type: string }
        >;

        const focusedElmParent = clickedElm.closest('.form-group') as HTMLElement;
        const buttonsContainer = generateTemplateVarBtns(
          variables,
          compUid,
          focusedElmParent,
        ) as HTMLDivElement;

        if (!buttonsContainer) return;

        focusedElmParent.appendChild(buttonsContainer);
      } else if (
        clickedElm.getAttribute('data-trigger-vars') === 'true' &&
        !clickedElm?.hasAttribute('readonly')
      ) {
        console.log('clicked elm', clickedElm);
        let dataTriggers = clickedElm.getAttribute('data-triggers');
        if (!dataTriggers) return;

        const triggersList = Array.isArray(dataTriggers) ? dataTriggers.split(',') : [dataTriggers];
        const triggersSchema = triggersList.map((triggerId) => {
          const component = document.getElementById(triggerId);
          const control = (component as any)?._control;
          return control?.schema;
        });

        //generate variables from schema
        let variables = new Map();
        for (const schema of triggersSchema) {
          const triggerVariables = extractTriggerVariables(schema);
          for (const [key, value] of triggerVariables) {
            variables.set(key, value);
          }
        }

        const buttonsContainer = generateTemplateVarBtns(variables, compUid) as HTMLDivElement;
        if (!buttonsContainer) return;
        const focusedElmParent = clickedElm.closest('.form-group');
        focusedElmParent.appendChild(buttonsContainer);
      } else {
        // * Remove template variable buttons
        document.querySelector(`.${TEMPLATE_VAR_BTNS_WRAPPER_CLASS}.tvb-${compUid}`)?.remove();
      }
    } catch (err) {
      console.log('Template variables display error: ', err);
    }
  };
}
function extractTriggerVariables(schema: any, path = '') {
  let variables = new Map();

  for (const key in schema) {
    const fullPath = `${path?.trim() ? `${path}.` : ''}${key}`;
    variables.set(fullPath, { var: `${fullPath}`, type: 'trigger' });
    if (typeof schema[key] === 'object') {
      const nestedVariables = extractTriggerVariables(schema[key], fullPath);
      for (const [nestedKey, nestedValue] of nestedVariables) {
        variables.set(nestedKey, nestedValue);
      }
    }
  }
  return variables;
}

export const setTabIndex = (selector: string): void => {
  // prevent to focus the fake textarea with tab key
  const fakeTextarea = document.querySelectorAll(selector);
  fakeTextarea.forEach((el) => el.setAttribute('tabindex', '-1'));
};

/**
 * Finds and returns the bracket match range for a given cursor position
 * Only matches if cursor is ON or INSIDE the brackets, not before/after them
 */
function findBracketMatch(text: string, cursorPosition: number): { start: number; end: number } | null {
  const regex = /{{.*?}}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // Only select if cursor is strictly inside the brackets (start < cursor < end)
    // This excludes clicking before opening {{ or after closing }}
    if (start < cursorPosition && cursorPosition < end) {
      return { start, end };
    }
  }

  return null;
}

/**
 * Handles bracket selection for variable syntax (e.g., {{variable}})
 * Supports: Ace editors, Metro UI textareas, and regular textareas
 */
function _bracketSelectionEvent(e: any) {
  const inputElement: HTMLInputElement = e.target;
  const aceContentElement = inputElement?.classList?.contains('ace_content')
    ? inputElement
    : inputElement?.closest?.('.ace_content');

  if (aceContentElement) {
    // Handle Ace editor clicks
    const editorContainer = aceContentElement.closest('.ace-editor');
    const textarea = editorContainer?.previousElementSibling as any;
    const editor = textarea?._editor ||
      (aceContentElement.closest('.form-group')?.querySelector('.json-editor') as any)?._editor;

    if (editor) {
      setTimeout(() => {
        const { row, column } = editor.getCursorPosition();
        const text = editor.session.getLine(row);
        const match = findBracketMatch(text, column);

        if (match) {
          editor.selection.setRange({
            start: { row, column: match.start },
            end: { row, column: match.end },
          });
        }
      }, 0);
    }
  } else if (inputElement?.classList?.contains('fake-textarea')) {
    // Handle Metro UI fake textarea clicks
    const textareaWrapper = inputElement.closest('.textarea');
    const realTextarea = textareaWrapper?.querySelector('textarea:not(.fake-textarea)') as HTMLTextAreaElement;

    if (realTextarea) {
      realTextarea.focus();

      // Longer delay needed for Metro UI to sync cursor position
      setTimeout(() => {
        const match = findBracketMatch(realTextarea.value, realTextarea.selectionStart);

        if (match) {
          realTextarea.setSelectionRange(match.start, match.end);
        }
      }, 50);
    }
  } else {
    // Handle regular textarea/input clicks
    const match = findBracketMatch(inputElement.value, inputElement.selectionStart);

    if (match) {
      inputElement.setSelectionRange(match.start, match.end);
    }
  }
}

export function addBracketSelection(element: HTMLElement) {
  const brSelectAttr = element.getAttribute('data-bracket-selection');
  if (brSelectAttr) return;
  element.addEventListener('click', _bracketSelectionEvent);
  element.setAttribute('data-bracket-selection', 'true');
}
