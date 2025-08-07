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
): HTMLElement | null {
  let wrapper = document.querySelector(`.${TEMPLATE_VAR_BTNS_WRAPPER_CLASS}`) as HTMLDivElement;

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

  if (variables?.size > 0) {
    for (const [key, value] of variables) {
      if (key) {
        const button = createTemplateVarBtn(key, value?.var || key, value?.type);

        switch (value?.type) {
          case 'field':
            fieldVarWrapper.appendChild(button);
            break;
          case 'global':
            globalVarWrapper.appendChild(button);
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

    wrapper.style.display = 'block';
  } else {
    wrapper.style.display = 'none';
  }

  return wrapper;
}

// TODO: REFACTOR THIS FUNCTION
export function handleTemplateVars(targetElm) {
  targetElm.onclick = (e) => {
    try {
      const clickedElm = e.target as HTMLInputElement;
      const activeComp = document.querySelector('.component.active');
      const compUid = activeComp?.getAttribute('id') || '';

      if (
        clickedElm.classList.contains('template-var-button') &&
        clickedElm.hasAttribute('data-var')
      ) {
        // * Insert the template variable into the field when the button is clicked

        e.preventDefault();

        // for some reason clickedElm does not able to get parent elements, so we need to query it again
        const buttonElm = document.querySelector(
          `.template-var-button[data-var="${clickedElm.getAttribute('data-var')}"]`,
        );

        const focusedField =
          (buttonElm
            .closest('.form-group')
            .querySelector('[data-template-vars=true]') as HTMLTextAreaElement) ||
          (buttonElm
            .closest('.form-group')
            .querySelector('[data-agent-vars=true]') as HTMLTextAreaElement);

        // changing select element does not remove template-var-buttons and these buttons can add inputs to readonly field
        if (!focusedField.hasAttribute('readonly')) {
          // check if it is ace editor
          if (focusedField?.classList?.contains('json-editor')) {
            const textToInsert: any = buttonElm.getAttribute('data-var');
            const editor = (<any>focusedField)?._editor;

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
        clickedElm.getAttribute('data-template-vars') === 'true' &&
        !clickedElm?.hasAttribute('readonly')
      ) {
        // * Display template variable buttons only if the field is not readonly
        const inputVariables = window['__INPUT_TEMPLATE_VARIABLES__']?.[compUid] || new Map();

        const fieldName = clickedElm?.name;

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

        const buttonsContainer = generateTemplateVarBtns(variables, compUid) as HTMLDivElement;

        if (!buttonsContainer) return;

        const focusedElmParent = clickedElm.closest('.form-group');
        focusedElmParent.appendChild(buttonsContainer);
      } else if (
        clickedElm.getAttribute('data-agent-vars') === 'true' &&
        !clickedElm?.hasAttribute('readonly')
      ) {
        // * Display template variable buttons only if the field is not readonly

        const fieldName = clickedElm?.name;

        // set the last field with template vars to keep the field variables when add/remove input
        window['__LAST_FIELD_WITH_TEMPLATE_VARS__'] = fieldName;

        let globalVariables = window['__GLOBAL_TEMPLATE_VARIABLES__'] || new Map();

        const variables = new Map([...globalVariables]) as Map<
          string,
          { var: string; type: string }
        >;

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

export const setTabIndex = (selector: string): void => {
  // prevent to focus the fake textarea with tab key
  const fakeTextarea = document.querySelectorAll(selector);
  fakeTextarea.forEach((el) => el.setAttribute('tabindex', '-1'));
};

function _bracketSelectionEvent(e: any) {
  let inputElement: HTMLInputElement = e.target;

  const regex = /{{.*?}}/g;
  let match;

  if (inputElement?.classList?.contains('ace_content')) {
    const editor = (<any>(
      inputElement?.closest('.smt-input-textarea')?.querySelector('.json-editor')
    ))?._editor;

    const cursorPosition = editor?.getCursorPosition();
    const rowPosition = cursorPosition?.row;
    const columnPosition = cursorPosition?.column;

    const text = editor?.session?.getLine(rowPosition);

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;

      if (start <= columnPosition && columnPosition <= end) {
        editor.selection.setRange({
          start: { row: rowPosition, column: start },
          end: { row: rowPosition, column: end },
        });
        break;
      }
    }
  } else {
    const text = inputElement.value;
    const cursorPosition = inputElement.selectionStart;

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
}

export function addBracketSelection(element: HTMLElement) {
  const brSelectAttr = element.getAttribute('data-bracket-selection');
  if (brSelectAttr) return;
  element.addEventListener('click', _bracketSelectionEvent);
  element.setAttribute('data-bracket-selection', 'true');
}
