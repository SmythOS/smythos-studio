import DOMPurify from 'dompurify';
import { Tooltip } from 'flowbite-react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { delay } from '../../utils';
import { handleKvFieldEditBtn, handleVaultBtn } from '../../utils/component.utils';
import { addBracketSelection, handleTemplateVars } from './misc';

declare var Metro;

/**
 * Helper function to check if vault button should be shown based on dynamic conditions
 * @param vaultCondition - The condition configuration
 * @param contentType - Fallback content type for backward compatibility
 * @returns boolean indicating whether vault button should be shown
 */
function shouldShowVaultButton(
  vaultCondition?: { property: string; value: string; getValue?: () => string },
  contentType?: string,
): boolean {
  // If no vault condition is provided, use legacy contentType logic
  if (!vaultCondition) {
    return contentType === 'application/json';
  }

  try {
    // Try to get the value using the custom getValue function first
    if (vaultCondition.getValue) {
      const currentValue = vaultCondition.getValue();
      return currentValue === vaultCondition.value;
    }

    // Fallback: try to get value from DOM element
    const element = document.querySelector(`#${vaultCondition.property}`) as
      | HTMLSelectElement
      | HTMLInputElement;
    if (element) {
      return element.value === vaultCondition.value;
    }

    // Fallback: try to get value from component data
    const currentComponent = (window as any).Component?.curComponentSettings;
    if (currentComponent?.data?.[vaultCondition.property]) {
      return currentComponent.data[vaultCondition.property] === vaultCondition.value;
    }

    return false;
  } catch (error) {
    console.warn('Error checking vault condition:', error);
    return false;
  }
}

/**
 * Global registry for datalist options.
 * Options are stored as functions to avoid loading large data modules during app initialization.
 * The functions are called synchronously on first focus to ensure immediate availability.
 */
const datalistRegistry: Map<string, () => Array<string | { text: string; value: string }>> =
  new Map();

/**
 * Register a datalist options provider by datalist ID.
 * The provider function is called synchronously when the field is first focused.
 *
 * @param datalistId - Unique ID for the datalist
 * @param optionsProvider - Function that returns the options array
 */
export const registerDatalistOptions = (
  datalistId: string,
  optionsProvider: () => Array<string | { text: string; value: string }>,
): void => {
  datalistRegistry.set(datalistId, optionsProvider);
};

export const createInput = (value: string = ''): HTMLInputElement => {
  const fieldElm = document.createElement('input');
  fieldElm.setAttribute('data-role', 'input');
  fieldElm.setAttribute('value', value || '');

  return fieldElm;
};

export const createHiddenInput = (value: string = ''): HTMLInputElement => {
  const fieldElm = document.createElement('input');
  fieldElm.setAttribute('type', 'hidden');
  fieldElm.setAttribute('value', value || '');

  return fieldElm;
};

/**
 * Creates a text input with datalist autocomplete support.
 * The datalist is created synchronously on first user interaction (mousedown, touchstart, or focus).
 * Using mousedown ensures the datalist is ready BEFORE focus, making it work on the first try.
 * This keeps initial render fast while ensuring the field works immediately.
 *
 * @param value - Initial value for the input
 * @param datalistId - ID for the datalist element (used to lookup options in registry)
 * @returns HTMLInputElement with datalist support
 */
export const createDatalistInput = (value: string = '', datalistId?: string): HTMLInputElement => {
  const fieldElm = document.createElement('input');
  fieldElm.setAttribute('data-role', 'input');
  fieldElm.setAttribute('type', 'text');
  fieldElm.setAttribute('value', value || '');

  // Set up datalist if datalistId is provided
  if (datalistId) {
    fieldElm.setAttribute('list', datalistId);

    let datalistCreated = false;

    // Create datalist on first interaction - synchronously so it's ready immediately
    const createDatalistOnce = (): void => {
      // Prevent multiple calls
      if (datalistCreated) {
        return;
      }

      // Check if datalist already exists
      if (document.getElementById(datalistId)) {
        datalistCreated = true;
        return;
      }

      // Get options provider from registry
      const optionsProvider = datalistRegistry.get(datalistId);
      if (!optionsProvider) {
        console.warn(`Datalist options not registered for ID: ${datalistId}`);
        datalistCreated = true;
        return;
      }

      // Create datalist SYNCHRONOUSLY (no setTimeout/requestIdleCallback)
      // This ensures the datalist exists before the browser tries to show the dropdown
      const options = optionsProvider();

      const datalist = document.createElement('datalist');
      datalist.id = datalistId;

      // Use DocumentFragment for batch DOM operations (much faster)
      const fragment = document.createDocumentFragment();

      options.forEach((option) => {
        const optionEl = document.createElement('option');
        if (typeof option === 'string') {
          optionEl.value = option;
        } else {
          optionEl.value = option.value;
          if (option.text) {
            optionEl.textContent = option.text;
          }
        }
        fragment.appendChild(optionEl);
      });

      datalist.appendChild(fragment);
      document.body.appendChild(datalist);
      datalistCreated = true;
    };

    // Listen to multiple events to catch interaction as early as possible
    // mousedown fires BEFORE focus, ensuring datalist is ready
    fieldElm.addEventListener('mousedown', createDatalistOnce, { once: true });
    fieldElm.addEventListener('focus', createDatalistOnce, { once: true });
    // Also handle touch devices
    fieldElm.addEventListener('touchstart', createDatalistOnce, { once: true, passive: true });
  }

  return fieldElm;
};

/*
 * Note:
 * Currently, the 'options()' function does not support badges. To enable this feature,
 * maybe we can extend the 'addOption()' function in 'static/metroui/js/metro.js' at line #30083.
 */
export const createSelectBox = (
  options: Array<{ value: string; text: string }> | any,
  value: string,
  dropdownHeight?: number,
): HTMLSelectElement => {
  const select = document.createElement('select');
  select.setAttribute('data-role', 'select');

  if (dropdownHeight) {
    select.setAttribute('data-drop-height', `${dropdownHeight}`);
  }

  let entries = [];

  //get options from function
  if (typeof options === 'function') {
    setTimeout(() => {
      const div = select.closest('.form-box');
      if (div) div.classList.add('loading');
    }, 300);
    options().then((data) => {
      entries = data;

      const selectElem = Metro.getPlugin(select, 'select');
      selectElem.removeOptions([...selectElem?.elem?.options].map((o) => o.value)); //remove all options
      data.forEach((option) => {
        const _text = option.text !== undefined ? option.text : option?.value || option; // handle empty string ''
        const _value = option.value !== undefined ? option.value : option; // handle empty string ''
        const _selected = value == _value;
        selectElem.addOption(_value, _text, _selected);
      });

      const div = select.closest('.form-box');
      if (div) {
        setTimeout(() => {
          div.classList.remove('loading');
        }, 300);
      }
    });
  } else {
    entries = options;
  }

  //create the default select element, leave it empty if no value is provided or if we're fetching options from a function
  select.innerHTML = entries
    .map((option) => {
      const _text = option.text !== undefined ? option.text : option?.value || option; // handle empty string ''
      const _value = option.value !== undefined ? option.value : option; // handle empty string ''
      const _badge = option?.badge || '';
      let template = '';

      if (_badge) {
        template = `data-template="$1 ${_badge.replace(/\"/g, `'`)}"`;
      }

      return `<option value="${_value}" ${
        value == _value ? 'selected' : ''
      } ${template}>${_text}</option>`;
    })
    .join('');

  return select;
};

export const createCheckbox = (label: string, value: string): HTMLInputElement => {
  const checkbox = document.createElement('input');
  checkbox.setAttribute('data-role', 'checkbox');
  checkbox.setAttribute('type', 'checkbox');
  checkbox.setAttribute('data-caption', label);
  //formElement.setAttribute('data-caption-position', 'left');
  if (value) checkbox.setAttribute('checked', '');
  else checkbox.removeAttribute('checked');

  return checkbox;
};

export const createCheckboxGroup = (
  options: Array<{ value: string; text: string; checked: boolean; readonly: boolean }>,
  value: string[],
): HTMLDivElement => {
  const group = document.createElement('div');
  group.setAttribute('data-role', 'checkbox-group');

  // value example: ['1', '2']
  group.innerHTML = options
    .map((option) => {
      const checkbox = document.createElement('input');
      checkbox.setAttribute('data-role', 'checkbox');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('data-caption', option.text);
      checkbox.setAttribute('value', option.value);

      if ((value && Array.isArray(value) && value.includes(option.value)) || option?.checked) {
        checkbox.setAttribute('checked', 'checked');
      }

      if (option?.readonly) {
        checkbox.setAttribute('disabled', 'disabled');
      }

      return checkbox.outerHTML;
    })
    .join('');

  return group;
};

/**
 * Type definition for textarea elements with an attached code editor instance
 */
interface TextAreaWithEditor extends HTMLTextAreaElement {
  _editor?: {
    getValue: () => string;
    setValue: (value: string) => void;
    focus: () => void;
    container?: HTMLElement;
  };
}

/**
 * Shared code editor configuration type
 */
type CodeConfig = { mode?: string; theme?: string; disableWorker?: boolean };

/**
 * Cached imports for modal and editor functionality to avoid repeated dynamic imports
 */
let cachedTwModalDialog: typeof import('../tw-dialogs').twModalDialog | null = null;
let cachedSetCodeEditor: typeof import('../dom').setCodeEditor | null = null;

/**
 * Lazy load and cache modal-related imports
 * This avoids circular dependencies while maintaining performance
 * Imports are cached separately to handle both code editor and non-code editor cases
 */
async function getModalImports(needsCodeEditor: boolean): Promise<{
  twModalDialog: typeof import('../tw-dialogs').twModalDialog;
  setCodeEditor: typeof import('../dom').setCodeEditor | null;
}> {
  // Load dialog module if not cached
  if (!cachedTwModalDialog) {
    const dialogModule = await import('../tw-dialogs');
    cachedTwModalDialog = dialogModule.twModalDialog;
  }

  // Load code editor module if needed and not cached
  if (needsCodeEditor && !cachedSetCodeEditor) {
    const domModule = await import('../dom');
    cachedSetCodeEditor = domModule.setCodeEditor;
  }

  return {
    twModalDialog: cachedTwModalDialog,
    setCodeEditor: needsCodeEditor ? cachedSetCodeEditor : null,
  };
}

/**
 * Creates an expand button element with proper styling and accessibility
 * Uses passive event listeners for hover effect to avoid blocking the main thread
 */
function createExpandButton(): HTMLButtonElement {
  const expandButton = document.createElement('button');
  expandButton.type = 'button';
  expandButton.classList.add('expand-textarea-btn');
  expandButton.setAttribute('aria-label', 'Expand textarea');
  expandButton.classList.add(
    'absolute',
    'bottom-2',
    'right-2',
    'text-gray-500',
    'hover:text-gray-700',
    'opacity-50',
    'hover:opacity-100',
    'transition-opacity',
    'cursor-pointer',
  );

  // Add expand icon SVG
  expandButton.innerHTML = `
    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" class="fa-md" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H3v9h9v-2H5zm7-7h7v7h2V3h-9z"></path></svg>
  `;

  // Add hover effect using passive event listeners for better performance
  expandButton.addEventListener(
    'pointerenter',
    () => {
      expandButton.style.opacity = '1';
    },
    { passive: true },
  );

  expandButton.addEventListener(
    'pointerleave',
    () => {
      expandButton.style.opacity = '0.5';
    },
    { passive: true },
  );

  return expandButton;
}

/**
 * Handles key/value modal for the modal textarea
 * @param {HTMLTextAreaElement} modalTextarea - The modal textarea to update
 * @param {HTMLButtonElement} originalButton - The original button to extract parameters from
 */
async function handleKeyValueModalForModal(
  modalTextarea: HTMLTextAreaElement,
  originalButton: HTMLButtonElement,
): Promise<void> {
  try {
    // Extract field name from the original textarea
    const originalTextarea = originalButton
      .closest('.form-group')
      ?.querySelector('textarea') as HTMLTextAreaElement;
    const fieldName = originalTextarea?.id || 'body';

    // Extract options from the original button's onclick handler
    const originalHandler = (originalButton as any).onclick;
    let options = { title: 'Body', showVault: true, vaultScope: 'apiCall' }; // Default options

    // Try to extract options from the bound function
    if (originalHandler && originalHandler.length > 1) {
      // This is a bound function, try to extract the bound arguments
      const handlerString = originalHandler.toString();
      if (handlerString.includes('showVault')) {
        // Extract options from the handler string or use defaults
        options = { title: 'Body', showVault: true, vaultScope: 'apiCall' };
      }
    }

    // Call the key/value modal handler directly
    await handleKvFieldEditBtn(fieldName, options);

    // The handler should have updated the element with the fieldName ID
    // But we need to copy that value to our modal textarea
    const updatedField = document.getElementById(fieldName) as HTMLTextAreaElement;
    if (updatedField && updatedField.value !== modalTextarea.value) {
      modalTextarea.value = updatedField.value;

      // Dispatch events to trigger any listeners
      const changeEvent = new Event('change', { bubbles: true });
      modalTextarea.dispatchEvent(changeEvent);

      const inputEvent = new Event('input', { bubbles: true });
      modalTextarea.dispatchEvent(inputEvent);
    }
  } catch (error) {
    console.error('Error handling key/value modal for modal textarea:', error);
  }
}

/**
 * Creates a vault key button element with proper styling and accessibility
 * Positioned at the top right of the textarea
 */
function createVaultButton(): HTMLButtonElement {
  const vaultButton = document.createElement('button');
  vaultButton.type = 'button';
  vaultButton.classList.add('vault-action-btn', 'field-action-btn');
  vaultButton.setAttribute('aria-label', 'Vault keys');
  vaultButton.setAttribute('data-smyth-dropdown-toggle', 'vault-keys-dropdown-menu');
  vaultButton.classList.add(
    'absolute',
    'top-2',
    'right-2', // Position at top right
    'text-gray-500',
    'hover:text-gray-700',
    'opacity-50',
    'hover:opacity-100',
    'transition-opacity',
    'cursor-pointer',
    'z-10', // Ensure it's above other elements
  );

  // Add vault key icon
  vaultButton.innerHTML = `<i class="mif-key fa-md"></i>`;

  // Add hover effect using passive event listeners for better performance
  vaultButton.addEventListener(
    'pointerenter',
    () => {
      vaultButton.style.opacity = '1';
    },
    { passive: true },
  );

  vaultButton.addEventListener(
    'pointerleave',
    () => {
      vaultButton.style.opacity = '0.5';
    },
    { passive: true },
  );

  // Don't add click handler here - it will be added in the onLoad callback
  // This prevents duplicate event handlers

  return vaultButton;
}

/**
 * Get the current code configuration for a textarea based on its attributes and data
 * This ensures the expandable textarea uses the current content type configuration
 */
function getCurrentCodeConfig(
  textarea: HTMLTextAreaElement,
  fallbackCode?: CodeConfig,
  attributes?: Record<string, string>,
): CodeConfig | undefined {
  // Priority 1: Check textarea data attributes (highest priority)
  const textareaCodeConfig = getCodeConfigFromAttributes(textarea);
  if (textareaCodeConfig) {
    return textareaCodeConfig;
  }

  // Priority 2: Check if textarea has existing editor instance
  if ((textarea as TextAreaWithEditor)._editor) {
    return fallbackCode || getDefaultCodeConfig();
  }

  // Priority 3: Check content type (APICall components only)
  const contentTypeConfig = getCodeConfigFromContentType(textarea);
  if (contentTypeConfig) {
    return contentTypeConfig;
  }

  // Priority 4: Check attributes parameter
  if (attributes) {
    const attributesCodeConfig = getCodeConfigFromAttributes(undefined, attributes);
    if (attributesCodeConfig) {
      return attributesCodeConfig;
    }
  }

  // Priority 5: Fallback to entry-provided configuration
  return fallbackCode;
}

/**
 * Extract code configuration from element attributes or attributes object
 */
function getCodeConfigFromAttributes(
  element?: HTMLTextAreaElement,
  attributes?: Record<string, string>,
): CodeConfig | undefined {
  const source = element || attributes;
  if (!source) return undefined;

  const getAttr = (name: string) => {
    if (element) {
      return element.getAttribute(name);
    }
    return attributes?.[name];
  };

  const mode = getAttr('data-code-mode');
  const theme = getAttr('data-code-theme');
  const disableWorker = getAttr('data-code-disable-worker');

  if (mode || theme || disableWorker) {
    return {
      mode: mode || undefined,
      theme: theme || undefined,
      disableWorker: disableWorker === 'true' || undefined,
    };
  }

  return undefined;
}

/**
 * Get code configuration based on content type (APICall components)
 */
function getCodeConfigFromContentType(
  textarea: HTMLTextAreaElement,
): CodeConfig | undefined {
  const contentType = textarea.getAttribute('data-content-type');

  if (!contentType) return undefined;

  const contentTypeModes: Record<string, string> = {
    'application/json': 'json',
    'application/javascript': 'javascript',
    'text/html': 'html',
  };

  const mode = contentTypeModes[contentType];
  if (mode) {
    return {
      mode,
      theme: 'tomorrow',
      disableWorker: false,
    };
  }

  return undefined;
}

/**
 * Get default code configuration
 */
function getDefaultCodeConfig(): { mode: string; theme: string; disableWorker: boolean } {
  return {
    mode: 'text',
    theme: 'tomorrow',
    disableWorker: false,
  };
}

/**
 * Apply all attributes and configurations to a textarea element
 */
function applyTextareaConfiguration(
  textarea: HTMLTextAreaElement,
  config: {
    attributes?: Record<string, string>;
    code?: CodeConfig;
  },
): void {
  const { attributes, code } = config;

  // Apply all attributes to the textarea
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      textarea.setAttribute(key, value);
    });
  }

  // Store code configuration as data attributes for dynamic access
  if (code) {
    if (code.mode) textarea.setAttribute('data-code-mode', code.mode);
    if (code.theme) textarea.setAttribute('data-code-theme', code.theme);
    if (code.disableWorker !== undefined) {
      textarea.setAttribute('data-code-disable-worker', code.disableWorker.toString());
    }
  }

  // Store component UID in textarea data attribute for template variables
  const currentComponent = (window as any).Component?.curComponentSettings || null;
  const compUid =
    currentComponent?._uid || document.querySelector('.component.active')?.getAttribute('id') || '';
  if (compUid) {
    textarea.setAttribute('data-component-uid', compUid);
  }
}

/**
 * Apply styles to a textarea element based on whether it's a code editor or regular textarea
 */
function applyTextareaStyles(textarea: HTMLTextAreaElement, isCodeEditor: boolean): void {
  if (isCodeEditor) {
    // Minimal styles for code editor - the editor handles most styling
    textarea.style.cssText = `
      width: 100%;
      min-height: 400px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
    `;
  } else {
    // Regular textarea styling for modal
    textarea.style.cssText = `
      overflow-y: auto;
    `;
  }
}

/**
 * Synchronize values between modal textarea and original textarea
 * Handles both regular textareas and code editor instances
 */
function syncTextareaValues(
  modalTextarea: TextAreaWithEditor,
  originalTextarea: TextAreaWithEditor,
  hasCodeEditor: boolean,
): void {
  let valueToSync = modalTextarea.value;

  // If it's a code editor, get value from the editor instance
  if (hasCodeEditor && modalTextarea._editor) {
    valueToSync = modalTextarea._editor.getValue();
  }

  // Update the original textarea
  originalTextarea.value = valueToSync;

  // If original textarea has an editor, update it too
  if (originalTextarea._editor) {
    originalTextarea._editor.setValue(valueToSync);
  }

  // Trigger input event to notify any listeners
  const changeEvent = new Event('input', { bubbles: true });
  originalTextarea.dispatchEvent(changeEvent);
}

/**
 * Initialize code editor in a textarea element
 * Uses requestAnimationFrame for optimal DOM readiness detection
 * Adds json-editor class to match inline textarea behavior
 * Sets up Ace editor with bracket selection for variable syntax
 */
async function initializeCodeEditor(
  textarea: TextAreaWithEditor,
  setCodeEditor: typeof import('../dom').setCodeEditor,
  mode: string,
  theme: string,
  disableWorker: boolean | undefined,
  initialValue: string,
): Promise<void> {
  // Wait for DOM to be ready using requestAnimationFrame instead of setTimeout
  await new Promise((resolve) => requestAnimationFrame(resolve));

  // Initialize the code editor
  setCodeEditor(textarea, mode, theme, disableWorker);

  // Add json-editor class to match inline textarea behavior
  textarea.classList.add('json-editor');

  // Wait for editor initialization and set value
  await new Promise((resolve) => requestAnimationFrame(resolve));

  if (textarea._editor) {
    textarea._editor.setValue(initialValue);
    textarea._editor.focus();

    // Setup bracket selection for Ace editor content
    const aceContentElement = textarea._editor.container?.querySelector('.ace_content') as HTMLElement | null;
    if (aceContentElement) {
      addBracketSelection(aceContentElement);
    }
  }
}

/**
 * Initialize a regular textarea by focusing and positioning cursor at the end
 */
function initializeRegularTextarea(textarea: HTMLTextAreaElement): void {
  // Use requestAnimationFrame for optimal timing instead of setTimeout
  requestAnimationFrame(() => {
    textarea.focus();
    // Set cursor at the end
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  });
}

/**
 * Copy all relevant attributes from source textarea to target textarea
 * This ensures the modal textarea has the same behavior and appearance as the original
 */
function copyTextareaAttributes(
  sourceTextarea: HTMLTextAreaElement,
  targetTextarea: HTMLTextAreaElement,
  additionalAttributes?: Record<string, string>,
): void {
  // Define all relevant attributes that should be copied
  const relevantAttributes = [
    // Form control attributes
    'readonly',
    'disabled',
    'placeholder',
    // Template variables attributes
    'data-template-vars',
    'data-agent-vars',
    'data-template-excluded-vars',
    'data-template-excluded-var-types',
  ];

  // Copy all relevant attributes from source to target
  relevantAttributes.forEach((attr) => {
    const value = sourceTextarea.getAttribute(attr);
    if (value !== null) {
      targetTextarea.setAttribute(attr, value);
    }
  });

  // Apply additional attributes from the attributes parameter
  if (additionalAttributes) {
    Object.entries(additionalAttributes).forEach(([key, value]) => {
      targetTextarea.setAttribute(key, value);
    });
  }
}

/**
 * Setup bracket selection for Metro UI textareas in modal
 * Waits for Metro UI initialization and attaches handlers to both fake and real textareas
 */
async function setupMetroUIBracketSelection(textarea: HTMLTextAreaElement): Promise<void> {
  // Wait for Metro UI to initialize its wrapper structure
  await new Promise((resolve) => setTimeout(resolve, 100));

  const textareaWrapper = textarea.closest('.textarea');
  const fakeTextarea = textareaWrapper?.querySelector('.fake-textarea') as HTMLElement;

  if (fakeTextarea) {
    // Attach to both elements: fake receives clicks, real handles some focus events
    addBracketSelection(fakeTextarea);
    addBracketSelection(textarea);
  } else {
    addBracketSelection(textarea);
  }
}

/**
 * Initialize template variables UI inside the modal if enabled on the textarea
 */
function setupTemplateVarsIfNeeded(
  dialogElm: HTMLElement,
  modalTextareaInDialog: TextAreaWithEditor,
  currentComponent: { _uid: string } | null,
): void {
  const hasTemplateVars = modalTextareaInDialog.getAttribute('data-template-vars') === 'true';
  const hasAgentVars = modalTextareaInDialog.getAttribute('data-agent-vars') === 'true';

  if (!hasTemplateVars && !hasAgentVars) {
    return;
  }

  // Clean up any existing template variable wrappers in the modal first
  const existingWrappers = dialogElm.querySelectorAll('.template-var-buttons');
  existingWrappers.forEach((wrapper) => wrapper.remove());

  // Find the form group within the modal and set up template vars on that specific container
  const modalFormGroup = modalTextareaInDialog.closest('.form-group') as HTMLElement | null;
  if (modalFormGroup) {
    handleTemplateVars(modalFormGroup, currentComponent as any);
  }
}

/**
 * Attach vault button behavior for the modal textarea (with toggle and editor support)
 */
function setupVaultInDialog(
  dialogElm: HTMLElement,
  modalTextareaInDialog: TextAreaWithEditor,
  vaultCondition?: { property: string; value: string; getValue?: () => string },
  contentType?: string,
): void {
  // The vault button should already be in the modal from the HTML content
  // We need to re-attach the click handler since the button was recreated from HTML
  const vaultButton = dialogElm.querySelector('.vault-action-btn') as HTMLButtonElement | null;
  if (!vaultButton) {
    return;
  }

  // Remove existing click handlers by cloning the element
  vaultButton.replaceWith(vaultButton.cloneNode(true));
  const newVaultButton = dialogElm.querySelector('.vault-action-btn') as HTMLButtonElement | null;
  if (!newVaultButton) {
    return;
  }

  newVaultButton.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Toggle dropdown
    const existingDropdown = document.getElementById('vault-keys-dropdown-menu');
    if (existingDropdown) {
      existingDropdown.remove();
      return;
    }

    const formGroup = newVaultButton.closest('.form-group');
    const targetField = formGroup?.querySelector('[data-vault]') as TextAreaWithEditor | null;

    // Open vault dropdown using existing handler
    await handleVaultBtn(event as MouseEvent);

    // Enhance dropdown behavior for code editor inputs
    setTimeout(() => {
      const vaultDropdown = document.getElementById('vault-keys-dropdown-menu');
      if (!vaultDropdown) return;

      const keyButtons = vaultDropdown.querySelectorAll('a[data-value]');
      keyButtons.forEach((keyBtn) => {
        const originalOnclick = (keyBtn as unknown as { onclick?: (e: Event) => void }).onclick;
        if (!originalOnclick) return;

        (keyBtn as HTMLElement).onclick = (ev: Event) => {
          ev.preventDefault();

          if ((targetField as TextAreaWithEditor | null)?._editor) {
            const editor = (targetField as TextAreaWithEditor)._editor;
            if (!editor) return;
            const keyVar = `{{KEY(${keyBtn.textContent})}}`;
            // Insert into editor at current selection
            // @ts-expect-error: session/selection are provided by the editor implementation
            editor.session.replace(editor.selection.getRange(), keyVar);
            // @ts-expect-error: editor API
            editor.moveCursorToPosition(editor.getCursorPosition());
            editor.focus();

            const inputEvent = new Event('input', { bubbles: true });
            (targetField as HTMLTextAreaElement).dispatchEvent(inputEvent);
          } else {
            // Fallback to original handler for regular textareas
            originalOnclick(ev);
          }

          const dropdown = document.getElementById('vault-keys-dropdown-menu');
          if (dropdown) dropdown.remove();

          if (targetField) {
            (targetField as HTMLTextAreaElement).focus();
            (targetField as HTMLTextAreaElement).scrollTop = (targetField as HTMLTextAreaElement).scrollHeight;

            const inputEvent = new Event('input', { bubbles: true });
            (targetField as HTMLTextAreaElement).dispatchEvent(inputEvent);
            const changeEvent = new Event('change', { bubbles: true });
            (targetField as HTMLTextAreaElement).dispatchEvent(changeEvent);
          }
        };
      });
    }, 500);

    // After vault handler runs, ensure focus/update
    setTimeout(() => {
      const updatedTargetField = (newVaultButton.closest('.form-group')?.querySelector(
        '[data-vault]'
      ) as HTMLTextAreaElement | null);
      if (updatedTargetField) {
        updatedTargetField.focus();
        updatedTargetField.scrollTop = updatedTargetField.scrollHeight;
        const inputEvent = new Event('input', { bubbles: true });
        updatedTargetField.dispatchEvent(inputEvent);
      }
    }, 1000);
  });

  // Show/hide vault button based on condition (or show by default if data-vault exists)
  let shouldShowVault = true;
  if (vaultCondition) {
    shouldShowVault = shouldShowVaultButton(vaultCondition, contentType);
  }
  newVaultButton.style.display = shouldShowVault ? 'inline-block' : 'none';
}

/**
 * Re-attach action buttons from the original form group to the modal
 */
function reattachActionButtons(
  dialogElm: HTMLElement,
  originalTextarea: TextAreaWithEditor,
  modalTextareaInDialog: TextAreaWithEditor,
): void {
  const originalFormGroup = originalTextarea.closest('.form-group');
  if (!originalFormGroup) return;

  const actionButtons = originalFormGroup.querySelectorAll(
    '.smyth-field-actions button, .button-group button',
  ) as NodeListOf<HTMLButtonElement>;

  actionButtons.forEach((originalButton, index) => {
    if (originalButton.classList.contains('vault-action-btn')) return;

    const modalActionButton = dialogElm.querySelector(
      `button[data-action-index="${index}"]`,
    ) as HTMLButtonElement | null;
    if (!modalActionButton) return;

    const originalClickHandler = (originalButton as unknown as { onclick?: (e: Event) => void }).onclick;
    if (originalClickHandler) {
      modalActionButton.onclick = async (event) => {
        const buttonId = originalButton.id;
        const buttonIcon = originalButton.querySelector('i')?.className;

        if (buttonIcon?.includes('pen-to-square') || buttonId?.includes('EditBtn')) {
          await handleKeyValueModalForModal(modalTextareaInDialog, originalButton);
          return;
        }

        const originalId = originalTextarea.id;
        const originalName = originalTextarea.name;

        modalTextareaInDialog.id = originalId;
        modalTextareaInDialog.name = originalName;

        await originalClickHandler.call(originalButton, event);

        originalTextarea.id = originalId;
        originalTextarea.name = originalName;
      };
    }

    const originalEvents = (originalButton as unknown as { _events?: Record<string, EventListener> })._events || {};
    Object.keys(originalEvents).forEach((eventType) => {
      modalActionButton.addEventListener(eventType, originalEvents[eventType] as EventListener);
    });
  });
}

/**
 * Handles the expansion of a textarea into a modal dialog
 * Creates modal content, handles code editor initialization, and manages value synchronization
 */
async function handleExpandTextarea(
  originalTextarea: TextAreaWithEditor,
  label: string | undefined,
  code: CodeConfig | undefined,
  attributes: Record<string, string> | undefined,
  contentType?: string,
  vaultCondition?: { property: string; value: string; getValue?: () => string },
  validateMessage?: string,
): Promise<void> {
  // Dynamically determine code configuration from textarea attributes
  // This ensures the expandable textarea uses the current content type configuration
  // For APICall components, or falls back to the entry-provided configuration for other components
  const currentCodeConfig = getCurrentCodeConfig(originalTextarea, code, attributes);

  // Load required modules
  const { twModalDialog, setCodeEditor } = await getModalImports(!!currentCodeConfig);
  const hasCodeEditor = !!currentCodeConfig;

  // Get component UID for template variables - try multiple approaches

  // First, try to get it from the original textarea's data attribute (if it was stored)
  const compUid = originalTextarea.getAttribute('data-component-uid');

  // Create a mock component object with the UID for handleTemplateVars
  const currentComponent = compUid ? { _uid: compUid } : null;

  // Create modal content container
  const modalContainer = document.createElement('div');
  modalContainer.classList.add('h-full', 'flex', 'flex-col', 'form-group');

  // Create textarea wrapper for positioning buttons - this needs to be a form-group for vault button to work
  const textareaWrapper = document.createElement('div');
  textareaWrapper.classList.add('relative', 'form-group');
  textareaWrapper.style.position = 'relative';
  textareaWrapper.style.flex = '1';
  textareaWrapper.style.display = 'flex';
  textareaWrapper.style.flexDirection = 'column';
  textareaWrapper.style.overflow = 'hidden';

  // Create modal textarea
  const modalTextarea = document.createElement('textarea') as TextAreaWithEditor;
  modalTextarea.value = originalTextarea.value;
  modalTextarea.classList.add('form-control', 'flex-1', 'resize-none');
  modalTextarea.id = 'expanded-textarea';

  // Add Metro UI data-role for regular textareas (non-code editor)
  if (!hasCodeEditor) {
    modalTextarea.setAttribute('data-role', 'textarea');
    modalTextarea.setAttribute('data-auto-size', 'false');
  }

  // Copy validation attributes from original textarea for Metro UI validation
  const validateAttr = originalTextarea.getAttribute('data-validate');
  if (validateAttr) {
    modalTextarea.setAttribute('data-validate', validateAttr);
  }

  // Apply styles based on editor type
  applyTextareaStyles(modalTextarea, hasCodeEditor);

  // Add vault button to modal textarea if original textarea has vault attributes
  const hasVaultAttribute = originalTextarea.getAttribute('data-vault');

  if (hasVaultAttribute) {
    // Copy vault attribute to modal textarea
    modalTextarea.setAttribute('data-vault', hasVaultAttribute);

    // Mark this textarea as coming from expanded/modal view
    // This is used to hide the "Add Key" option in the vault dropdown
    modalTextarea.setAttribute('data-vault-from-modal', 'true');

    // Create vault button for modal
    const modalVaultButton = createVaultButton();
    textareaWrapper.appendChild(modalVaultButton);
  }

  // Add other action buttons from the original textarea
  const originalFormGroup = originalTextarea.closest('.form-group');
  if (originalFormGroup) {
    // Find all action buttons in the original form group
    const actionButtons = originalFormGroup.querySelectorAll(
      '.smyth-field-actions button, .button-group button',
    );

    actionButtons.forEach((button, index) => {
      // Skip vault button as we handle it separately
      if (button.classList.contains('vault-action-btn')) return;

      // Clone the button for the modal
      const modalActionButton = button.cloneNode(true) as HTMLButtonElement;

      // Add data attribute for later identification
      modalActionButton.setAttribute('data-action-index', index.toString());

      // Adjust positioning for modal context - stack buttons vertically
      modalActionButton.style.position = 'absolute';
      modalActionButton.style.top = `${2 + index * 32}px`; // Stack buttons with 32px spacing
      modalActionButton.style.right = '2px';
      modalActionButton.style.zIndex = '10';

      // Re-attach event listeners by finding the original button's click handler
      const originalClickHandler = (button as any).onclick;
      if (originalClickHandler) {
        modalActionButton.onclick = originalClickHandler;
      }

      // Also try to find and re-attach other event listeners
      const originalEvents = (button as any)._events || {};
      Object.keys(originalEvents).forEach((eventType) => {
        modalActionButton.addEventListener(eventType, originalEvents[eventType]);
      });

      textareaWrapper.appendChild(modalActionButton);
    });
  }

  // Create validation message element if provided
  let validationMessageElm: HTMLElement | null = null;
  if (validateMessage) {
    validationMessageElm = document.createElement('div');
    validationMessageElm.classList.add('mt-2', 'invalid_feedback');
    validationMessageElm.textContent = validateMessage;
  }

  // Create template variable buttons container
  const templateVarsContainer = document.createElement('div');
  templateVarsContainer.classList.add('template-var-buttons', 'mt-2');
  templateVarsContainer.style.display = 'none';

  textareaWrapper.appendChild(modalTextarea);
  if (validationMessageElm) {
    textareaWrapper.appendChild(validationMessageElm);
  }
  modalContainer.appendChild(textareaWrapper);
  modalContainer.appendChild(templateVarsContainer);

  // Open modal dialog (content must be HTML string, not element)
  await twModalDialog({
    title: label || 'Edit',
    content: modalContainer.outerHTML,
    size: {
      width: '80vw',
      height: '80vh',
      maxWidth: '1200px',
      maxHeight: '800px',
    },
    actions: [],
    onLoad: async (dialogElm: HTMLElement) => {
      const modalTextareaInDialog = dialogElm.querySelector('textarea') as TextAreaWithEditor;

      if (!modalTextareaInDialog) {
        return;
      }

      // Set initial value
      modalTextareaInDialog.value = originalTextarea.value;

      // Copy all relevant attributes from the original textarea to the modal textarea
      copyTextareaAttributes(originalTextarea, modalTextareaInDialog, attributes);

      // Initialize based on editor type
      if (hasCodeEditor && currentCodeConfig && setCodeEditor) {
        const mode = currentCodeConfig.mode || '';
        const theme = currentCodeConfig.theme || 'tomorrow';
        const disableWorker = currentCodeConfig.disableWorker;

        await initializeCodeEditor(
          modalTextareaInDialog,
          setCodeEditor,
          mode,
          theme,
          disableWorker,
          originalTextarea.value,
        );
      } else {
        initializeRegularTextarea(modalTextareaInDialog);

        // Setup bracket selection for Metro UI textareas
        await setupMetroUIBracketSelection(modalTextareaInDialog);
      }

      // Template variables setup (if enabled)
      setupTemplateVarsIfNeeded(dialogElm, modalTextareaInDialog, currentComponent);

      // Set up vault functionality if the textarea has vault attributes
      const hasVaultAttribute = modalTextareaInDialog.getAttribute('data-vault');

      if (hasVaultAttribute) {
        setupVaultInDialog(dialogElm, modalTextareaInDialog, vaultCondition, contentType);
      }

      // Re-attach other action buttons
      reattachActionButtons(dialogElm, originalTextarea, modalTextareaInDialog);

      // Simple validation: check maxlength and add .invalid class if exceeded
      const validateAttr = originalTextarea.getAttribute('data-validate');
      const maxLengthMatch = validateAttr?.match(/maxlength=(\d+)/);

      if (maxLengthMatch) {
        const maxLength = parseInt(maxLengthMatch[1], 10);
        const validateError = dialogElm.querySelector('.invalid_feedback') as HTMLElement;

        /**
         * Real-time validation on input
         */
        const checkValidation = (): void => {
          const formGroup = modalTextareaInDialog.closest('.form-group') as HTMLElement;
          if (modalTextareaInDialog?.value?.trim()?.length > maxLength) {
            formGroup?.classList.add('invalid');
            if (validateError) validateError.style.display = 'block';
            modalTextareaInDialog.style.setProperty('border', '1px solid #c50f1f', 'important');
          } else {
            formGroup?.classList.remove('invalid');
            if (validateError) validateError.style.display = 'none';
            modalTextareaInDialog.style.setProperty('border', '1px solid rgb(209, 213, 219)', 'important');
          }
        };

        modalTextareaInDialog.addEventListener('input', checkValidation);
        checkValidation(); // Check on load
      }
    },
    onCloseClick(dialogElm: HTMLElement) {
      const modalTextareaInDialog = dialogElm.querySelector('textarea') as TextAreaWithEditor;

      const existingDropdown = document.getElementById('vault-keys-dropdown-menu');
      if (existingDropdown) {
        // Dropdown is open, close it (toggle off)
        existingDropdown.remove();
      }

      if (modalTextareaInDialog) {
        syncTextareaValues(modalTextareaInDialog, originalTextarea, hasCodeEditor);
      }

      // Clean up any template variable wrappers within the modal
      const templateVarWrappers = dialogElm.querySelectorAll('.template-var-buttons');
      templateVarWrappers.forEach((wrapper) => wrapper.remove());
    },
  });
}

/**
 * Creates a textarea element with optional expand functionality and dynamic vault button
 * @param entry - Configuration object for the textarea
 * @param entry.value - Initial value for the textarea
 * @param entry.fieldCls - Additional CSS classes for the textarea
 * @param entry.autoSize - Whether to enable auto-size functionality
 * @param entry.expandable - Whether to show an expand button for modal editing
 * @param entry.label - Label for the modal title
 * @param entry.attributes - Additional attributes for the textarea
 * @param entry.code - Code editor configuration (mode, theme, disableWorker)
 * @param entry.contentType - Content type for backward compatibility
 * @param entry.validateMessage - Validation error message to display in the modal
 * @param entry.vaultCondition - Dynamic condition for showing vault button
 * @param entry.vaultCondition.property - Property name to check (e.g., 'contentType', 'mode', 'type')
 * @param entry.vaultCondition.value - Value that should trigger vault button display
 * @param entry.vaultCondition.getValue - Optional function to get current value dynamically
 * @returns Object containing the textarea element and optional container wrapper
 *
 */
export const createTextArea = (entry: {
  label?: string;
  value?: string;
  fieldCls?: string;
  autoSize?: boolean;
  expandable?: boolean;
  attributes?: Record<string, string>;
  code?: {
    mode?: string;
    theme?: string;
    disableWorker?: boolean;
  };
  contentType?: string;
  validateMessage?: string;
  vaultCondition?: {
    property: string;
    value: string;
    getValue?: () => string;
  };
}): HTMLTextAreaElement | { textarea: HTMLTextAreaElement; container: HTMLDivElement } => {
  const {
    value = '',
    fieldCls = '',
    autoSize = true,
    expandable,
    label,
    attributes,
    code,
    contentType,
    validateMessage,
    vaultCondition,
  } = entry;
  const textarea = document.createElement('textarea');
  textarea.setAttribute('data-role', 'textarea');
  textarea.innerHTML = value;
  textarea.classList.add('form-control');

  if (fieldCls) {
    textarea.setAttribute('data-cls-textarea', fieldCls);
  }

  textarea.setAttribute('data-auto-size', `${autoSize}`);

  // Apply all attributes and configurations to the textarea
  applyTextareaConfiguration(textarea, { attributes, code });

  // If expandable is true, wrap textarea with container and add expand button
  if (expandable) {
    const container = document.createElement('div');
    container.classList.add('relative');
    container.style.position = 'relative';

    // Create expand button with CSS-based hover effects
    const expandButton = createExpandButton();

    // Add click handler to open modal (async handler with error handling)
    expandButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        // Get current code configuration dynamically from textarea attributes
        const currentCodeConfig = getCurrentCodeConfig(textarea, code, attributes);
        await handleExpandTextarea(
          textarea,
          label,
          currentCodeConfig,
          attributes,
          contentType,
          vaultCondition,
          validateMessage,
        );
      } catch (error) {
        console.error('Error opening textarea modal:', error);
      }
    });

    container.appendChild(textarea);
    container.appendChild(expandButton);

    return { textarea, container };
  }

  return textarea;
};

export const createButton = (label: string, value: string): HTMLButtonElement => {
  const button = document.createElement('button');
  button.classList.add('button');
  button.innerHTML = label || value;

  return button;
};

export const createColorInput = (value: string): HTMLInputElement => {
  const colorInput = createInput(value);

  colorInput.setAttribute('data-clear-button', 'false');
  colorInput.setAttribute('type', 'text');
  colorInput.classList.add('coloris');

  return colorInput;
};

export function createInfoButton(
  text,
  {
    cls = '',
    clsHint = '',
    position,
    tooltipClasses = '',
    arrowClasses = '',
  }: {
    cls?: string;
    clsHint?: string;
    position?: string;
    tooltipClasses?: string;
    arrowClasses?: string;
  },
  entryIndex = 0,
) {
  // Calculate width based on text length, but allow more space for tooltips with links
  const hasLinks = text.includes('<a ');
  let estimatedWidth = text.length * 2 > 48 ? 48 : text.length * 2;

  // If tooltip contains links, use a more generous width calculation
  if (hasLinks) {
    estimatedWidth = Math.min(60, Math.max(40, text.length * 1.8));
  }
  // TODO: This is a temporary fix to avoid the tooltip being cutoff in the sidebar and showing it on the top.
  // if (entryIndex < 2) {
  //   position = position || 'bottom';
  // }

  // Enforce consistent tooltip placement above to avoid cutoff in the sidebar
  position = 'top';

  // Create a container for the React component
  const tooltipContainer = document.createElement('div');
  tooltipContainer.className = 'inline-block align-middle ' + cls;

  // Create the info icon as a React element
  const iconElement = React.createElement('img', {
    className: 'opacity-80 hover:opacity-100',
    style: {
      width: '16px',
      height: '16px',
    },
    src: '/img/icons/Info.svg',
  });

  // Sanitize the HTML content to prevent XSS attacks
  // DOMPurify's default configuration already allows all safe HTML tags
  // and blocks dangerous elements like <script>, event handlers, etc.
  const sanitizedText = DOMPurify.sanitize(text);

  // Render the Tooltip component
  const root = createRoot(tooltipContainer);
  root.render(
    React.createElement(
      Tooltip,
      {
        content: React.createElement('div', {
          dangerouslySetInnerHTML: { __html: sanitizedText },
        }),
        placement: position as any,
        className:
          clsHint +
          ' whitespace-normal text-xs ' +
          (tooltipClasses || (hasLinks ? `min-w-52 max-w-96` : `w-${estimatedWidth}`)) +
          ' [&_a]:whitespace-nowrap [&_a]:inline-block',
        style: 'dark',
        arrow: true,
      },
      iconElement,
    ),
  );

  // Add cleanup when the button is removed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach((node) => {
          // Check if the removed node is our specific info button
          if (node === tooltipContainer || node.contains(tooltipContainer)) {
            root.unmount();
            observer.disconnect();
          }
        });
      }
    });
  });

  // Find the sidebar container and start observing
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    observer.observe(sidebarContainer, {
      childList: true,
      subtree: true, // Enable subtree observation to catch nested removals
    });
  }

  return tooltipContainer;
}

type RangeEntry = {
  name: string;
  min: number;
  max: number;
  value: number;
  step?: number;
};
export function createRangeInput({ name, min, max, value, step }: RangeEntry) {
  // create range input
  const range = document.createElement('input');
  range.type = 'range';

  /* Set step if provided
       We must set the step before setting the value to keep fraction part */
  if (step) {
    range.step = `${step}`;
  }

  range.min = `${min}`;
  range.max = `${max}`;
  range.value = `${value}`; // value must be set after min, mix and step
  range.className = 'form-control w-[75%] h-2 cursor-pointer mx-2 my-3.5 rounded';

  // create number input
  const input = document.createElement('input');
  input.setAttribute('data-role', 'input');
  input.setAttribute('data-clear-button', 'false');
  input.type = 'number';

  /* Set step if provided
       We must set the step before setting the value to keep fraction part */
  if (step) {
    input.step = `${step}`;
  }

  input.min = `${min}`;
  input.max = `${max}`;
  input.value = `${value}`; // value must be set after min, mix and step
  input.setAttribute('data-rel', `#${name}`);
  input.className = 'form-control w-[30%] ml-1 rounded';

  // sync the number input with range
  range.addEventListener('input', (event) => {
    const elm = event.target as HTMLInputElement;

    input.value = elm.value;
  });

  // sync the range with number input
  input.addEventListener('keydown', async (event) => {
    const elm = event.target as HTMLInputElement;

    // Need to a slight delay get the updated value
    await delay(50);

    range.value = elm.value;
  });

  // sync the range with number input
  input.addEventListener('wheel', async (event) => {
    const elm = event.target as HTMLInputElement;

    // Need to a slight delay get the updated value
    await delay(50);

    range.value = elm.value;
  });

  return { rangeInput: range, numberInput: input };
}
/**
 * Creates a toggle switch input element with associated label
 * @param label - The label text for the toggle
 * @param value - The initial checked state of the toggle
 * @param hintOnSelect - Optional hint text to show when toggle is checked
 * @returns HTMLDivElement - The configured toggle input element with hint
 */
export function createToggle(label: string, value: boolean | string, hintOnSelect?: string) {
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';

  if (value) toggle.setAttribute('checked', '');
  else toggle.removeAttribute('checked');

  toggle.className = [
    'relative w-[35px] h-[20px] items-center',
    'bg-[#757575] border-transparent text-transparent rounded-3xl',
    'cursor-pointer transition-colors ease-in-out duration-200',
    'disabled:opacity-50 disabled:pointer-events-none',
    'checked:bg-none checked:text-blue-600 checked:border-blue-600 checked:bg-blue-600',
    'focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent',
    'before:inline-block before:w-4 before:h-4 before:bg-white',
    'before:rounded-full before:shadow before:transform before:ring-0',
    'before:transition before:ease-in-out before:duration-200 before:mt-[1px]',
    'before:ml-[1px] before:translate-x-px checked:before:translate-x-full',
    'checked:before:bg-blue-200 checked:before:ml-0',
  ].join(' ');

  return toggle;
}

export function createTagInput({ maxTags, value }: { maxTags: number; value: string }) {
  const input = document.createElement('input');
  input.setAttribute('data-role', 'taginput');
  input.setAttribute('data-max-tags', `${maxTags}`);
  input.value = value;

  return input;
}

/**
 * Creates a hint element with sanitized HTML content
 * @param text - The HTML text content to display in the hint
 * @returns HTMLElement - The hint element with sanitized content
 */
export function createHint(text: string) {
  const elm = document.createElement('small');
  elm.classList.add('field-hint');

  // Sanitize the HTML content to prevent XSS attacks
  // DOMPurify's default configuration already allows all safe HTML tags
  // and blocks dangerous elements like <script>, event handlers, etc.
  const sanitizedText = DOMPurify.sanitize(text);

  elm.innerHTML = sanitizedText;

  return elm;
}

type RadioOption = {
  value: string;
  text: string;
  icon?: string;
  captionPosition?: 'left' | 'right';
  classes?: {
    radio?: string;
    caption?: string;
    check?: string;
  };
};
/**
 * Creates a group of radio buttons with Metro UI styling and optional custom icons
 * @param options - Array of radio options with value and text
 * @param value - Currently selected value
 * @param name - Group name to link radio buttons together
 * @returns HTMLDivElement containing the radio buttons
 */
export function createRadio({
  options,
  name,
  value,
  events,
  fieldCls = '',
  readonly = false,
}: {
  options: Array<RadioOption>;
  name: string;
  value: string;
  events: Record<string, Function>;
  fieldCls?: string;
  readonly?: boolean;
}) {
  const container = document.createElement('div');
  container.className = 'radio-container form-control';

  options.forEach((option) => {
    const radio = document.createElement('input');
    radio.setAttribute('data-role', 'radio');
    radio.name = name;
    radio.value = option.value;
    radio.checked = option?.value === value || false;
    if (readonly) radio.disabled = readonly;
    radio.setAttribute('data-caption', option.text);

    if (option.captionPosition) {
      radio.setAttribute('data-caption-position', option.captionPosition);
    }

    // Apply classes with icon-specific modifications
    const classConfigs = {
      'data-cls-radio': (option.classes?.radio || '') + ' ' + fieldCls,
      'data-cls-caption': option.classes?.caption || '',
      'data-cls-check': option.classes?.check || '',
    };

    // Set class attributes if they exist
    for (const [attr, classes] of Object.entries(classConfigs)) {
      if (classes) {
        radio.setAttribute(attr, `${classes}`.trim());
      }
    }

    // Only append if no icon (fixing the logic error in original code)
    container.appendChild(radio);

    // Add events to the radio button
    for (const [type, listener] of Object.entries(events)) {
      radio.addEventListener(type, listener as EventListener);
    }
  });

  return container;
}
