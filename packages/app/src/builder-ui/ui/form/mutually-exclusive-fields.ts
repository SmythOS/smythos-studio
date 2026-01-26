/**
 * Mutually Exclusive Fields System
 *
 * This utility provides a generic mechanism for defining groups of fields where
 * only one field can have a non-default value at a time. When a field in a group
 * is set to a non-default value, all other fields in the same group are reset
 * to their empty values (-1 for numbers, '' for strings, false for booleans).
 *
 * ## Field Registration
 * Add `data-mutually-exclusive` attribute with a JSON config object to field definitions.
 * Fields with the same group name will be mutually exclusive.
 *
 * Config object properties:
 * - group: string (required) - The group name for mutual exclusivity
 * - models: string[] (optional) - Whitelist of model IDs for which mutual exclusivity applies.
 *   If omitted or empty, applies to all models. The form must have a #model selector.
 * - reset: number (optional) - The value to reset to (e.g., -0.01 for Anthropic's "not set")
 * - reason: string (required) - User-friendly explanation shown as hint (should include why and what happens)
 *
 * Example in field definition:
 * ```typescript
 * temperature: {
 *   type: 'range',
 *   value: 1,
 *   attributes: {
 *     'data-mutually-exclusive': JSON.stringify({
 *       group: 'sampling-params',
 *       models: ['claude-3-opus', 'claude-3-sonnet'],
 *       reset: -0.01,
 *       reason: 'Anthropic models support either Temperature or Top P at a time. Setting Temperature will clear Top P.',
 *     }),
 *     // ... other attributes
 *   },
 * },
 * topP: {
 *   type: 'range',
 *   value: 1,
 *   attributes: {
 *     'data-mutually-exclusive': JSON.stringify({
 *       group: 'sampling-params',
 *       models: ['claude-3-opus', 'claude-3-sonnet'],
 *       reset: -0.01,
 *       reason: 'Anthropic models support either Temperature or Top P at a time. Setting Top P will clear Temperature.',
 *     }),
 *     // ... other attributes
 *   },
 * },
 * ```
 *
 * When temperature is changed, topP will be reset to its reset value (e.g., -0.01), and vice versa.
 * A hint message is displayed below each field explaining the mutual exclusivity.
 * Fields with negative/reset values appear dimmed until the user hovers over them.
 */

declare var Metro: any;

/**
 * CSS class applied to form-group when field is reset due to mutual exclusivity.
 * This creates a dimmed visual effect indicating the field is inactive.
 * The effect is removed on hover/focus, allowing the user to activate the field.
 */
const MUTUAL_EXCLUSIVE_INACTIVE_CLASS = 'mutual-exclusive-inactive';

/**
 * Registry to track mutually exclusive field groups within forms
 * Key: form element
 * Value: Map of group names to Set of field elements
 */
const formGroupRegistry = new WeakMap<HTMLFormElement, Map<string, Set<HTMLElement>>>();

/**
 * Flag to prevent re-entry during reset operations
 * This prevents infinite loops when resetting triggers change events
 */
let isResetting = false;

/**
 * Get the empty/cleared value for a field based on its type
 * - Numbers: Uses the 'reset' value from mutual exclusive config, or -1 as fallback, or min value for non-exclusive fields
 * - Strings: ''
 * - Booleans: false
 * - Select: first option value
 */
function getEmptyValue(fieldElement: HTMLElement): string | number | boolean {
  const tagName = fieldElement.tagName.toLowerCase();

  if (tagName === 'input') {
    const inputType = (fieldElement as HTMLInputElement).type;
    switch (inputType) {
      case 'checkbox':
        return false;
      case 'number':
      case 'range':
        // For mutually exclusive numeric fields, use the reset value from config
        const mutualExclusiveAttr = fieldElement.getAttribute('data-mutually-exclusive');
        if (mutualExclusiveAttr) {
          try {
            const config = JSON.parse(mutualExclusiveAttr);
            // Use the reset value from config if provided, otherwise fallback to -1
            if (config.reset !== undefined) {
              return config.reset;
            }
          } catch {
            // Ignore parse errors
          }
          return -1;
        }
        // For non-mutually-exclusive fields, use the min value (typically 0)
        return parseFloat(fieldElement.getAttribute('min') || '0');
      default:
        return '';
    }
  }

  if (tagName === 'select') {
    // For select, use the first option as the "empty" state
    const firstOption = (fieldElement as HTMLSelectElement).options?.[0];
    return firstOption?.value || '';
  }

  if (tagName === 'textarea') {
    return '';
  }

  return '';
}

/**
 * Clear a field to its empty state (not its default value)
 * - Numbers reset to 0 (or min value for range)
 * - Strings reset to ''
 * - Booleans reset to false
 * Does NOT dispatch events to avoid triggering handlers
 */
function clearField(fieldElement: HTMLElement): void {
  const emptyValue = getEmptyValue(fieldElement);
  const tagName = fieldElement.tagName.toLowerCase();

  if (tagName === 'input') {
    const inputElement = fieldElement as HTMLInputElement;
    const inputType = inputElement.type;

    switch (inputType) {
      case 'checkbox':
        inputElement.checked = false;
        break;
      case 'number':
      case 'range':
        inputElement.value = String(emptyValue);
        // For range inputs, also update the associated number input if it exists
        updateRangeCompanion(inputElement);
        break;
      default:
        inputElement.value = '';
    }
  } else if (tagName === 'select') {
    const selectElement = fieldElement as HTMLSelectElement;
    selectElement.value = String(emptyValue);

    // Handle MetroUI select component
    try {
      const metroSelect = Metro.getPlugin(selectElement, 'select');
      if (metroSelect?.val) {
        metroSelect.val(String(emptyValue));
      }
    } catch {
      // MetroUI not available or not a MetroUI select
    }
  } else if (tagName === 'textarea') {
    (fieldElement as HTMLTextAreaElement).value = '';
  }

  // Apply visual inactive effect to the form-group container
  applyInactiveEffect(fieldElement);

  // Note: We intentionally do NOT dispatch events here to avoid infinite loops
  // The visual update is sufficient for the reset behavior
}

/**
 * Update the companion number input for a range slider
 */
function updateRangeCompanion(rangeInput: HTMLInputElement): void {
  const wrapper = rangeInput.closest('.flex');
  if (wrapper) {
    const numberInput = wrapper.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    if (numberInput && numberInput !== rangeInput) {
      numberInput.value = rangeInput.value;
    }
  }
}

/**
 * Check if a field has a negative value (representing "not set")
 */
export function hasNegativeValue(fieldElement: HTMLElement): boolean {
  const tagName = fieldElement.tagName.toLowerCase();
  if (tagName === 'input') {
    const inputType = (fieldElement as HTMLInputElement).type;
    if (inputType === 'number' || inputType === 'range') {
      const value = parseFloat((fieldElement as HTMLInputElement).value);
      return value < 0;
    }
  }
  return false;
}

/**
 * Apply visual inactive effect to a field's form-group container.
 * Adds dimmed styling and sets up hover/focus listeners to temporarily show the field.
 * The field stays inactive (blurred) as long as it has a negative value.
 */
export function applyInactiveEffect(fieldElement: HTMLElement): void {
  const formGroup = fieldElement.closest('.form-group');
  if (!formGroup) return;

  // Add the inactive class for visual dimming
  formGroup.classList.add(MUTUAL_EXCLUSIVE_INACTIVE_CLASS);

  // Set up listeners for hover behavior
  // Store references to allow cleanup
  if (!(fieldElement as any)._inactiveEffectListeners) {
    const onMouseEnter = () => {
      // Temporarily remove inactive effect on hover
      formGroup.classList.remove(MUTUAL_EXCLUSIVE_INACTIVE_CLASS);
    };

    const onMouseLeave = () => {
      // Re-apply inactive effect if field still has negative value
      if (hasNegativeValue(fieldElement)) {
        formGroup.classList.add(MUTUAL_EXCLUSIVE_INACTIVE_CLASS);
      }
    };

    const onFocus = () => {
      // Temporarily remove inactive effect on focus
      formGroup.classList.remove(MUTUAL_EXCLUSIVE_INACTIVE_CLASS);
    };

    const onBlur = () => {
      // Re-apply inactive effect if field still has negative value
      if (hasNegativeValue(fieldElement)) {
        formGroup.classList.add(MUTUAL_EXCLUSIVE_INACTIVE_CLASS);
      }
    };

    // Listen on the form-group for hover (covers label, input, etc.)
    formGroup.addEventListener('mouseenter', onMouseEnter);
    formGroup.addEventListener('mouseleave', onMouseLeave);
    // Also listen for focus/blur on the field itself
    fieldElement.addEventListener('focus', onFocus);
    fieldElement.addEventListener('blur', onBlur);

    // Store references for cleanup
    (fieldElement as any)._inactiveEffectListeners = {
      formGroup,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
    };
  }
}

/**
 * Remove the visual inactive effect from a field's form-group container.
 * Called when the field becomes active (gets a valid non-negative value).
 */
export function removeInactiveEffect(fieldElement: HTMLElement): void {
  const formGroup = fieldElement.closest('.form-group');
  if (formGroup) {
    formGroup.classList.remove(MUTUAL_EXCLUSIVE_INACTIVE_CLASS);
  }

  // Clean up all listeners
  const listeners = (fieldElement as any)._inactiveEffectListeners;
  if (listeners) {
    listeners.formGroup.removeEventListener('mouseenter', listeners.onMouseEnter);
    listeners.formGroup.removeEventListener('mouseleave', listeners.onMouseLeave);
    fieldElement.removeEventListener('focus', listeners.onFocus);
    fieldElement.removeEventListener('blur', listeners.onBlur);
    delete (fieldElement as any)._inactiveEffectListeners;
  }
}

/**
 * Update the visual state of a field based on its current value.
 * If the field has a negative value, apply the inactive effect.
 * If the field has a non-negative value, remove the inactive effect.
 * Call this after programmatically changing a field's value.
 */
export function updateInactiveEffectState(fieldElement: HTMLElement): void {
  if (hasNegativeValue(fieldElement)) {
    applyInactiveEffect(fieldElement);
  } else {
    removeInactiveEffect(fieldElement);
  }
}

/**
 * Check if the current model matches the models whitelist in the mutual exclusive config.
 * Returns true if mutual exclusivity should be applied.
 */
function isModelInWhitelist(fieldElement: HTMLElement, form: HTMLFormElement): boolean {
  const mutualExclusiveAttr = fieldElement.getAttribute('data-mutually-exclusive');
  if (!mutualExclusiveAttr) return true; // No config, apply to all

  try {
    const config = JSON.parse(mutualExclusiveAttr);
    const whitelistedModels = config.models;

    // If no models specified, apply to all models
    if (!whitelistedModels || !Array.isArray(whitelistedModels) || whitelistedModels.length === 0) {
      return true;
    }

    // Get the current model from the form's model selector
    const modelSelector = form.querySelector('#model') as HTMLSelectElement;
    if (!modelSelector) return true; // No model selector found, apply to all

    const currentModel = modelSelector.value?.toLowerCase();
    if (!currentModel) return true;

    // Check if current model is in the whitelist (case-insensitive)
    return whitelistedModels.some(
      (model: string) => model.toLowerCase() === currentModel,
    );
  } catch {
    return true; // On error, apply to all
  }
}

/**
 * Handle field change within a mutually exclusive group
 */
function handleFieldChange(
  changedField: HTMLElement,
  groupName: string,
  form: HTMLFormElement,
): void {
  // Prevent re-entry during reset operations
  if (isResetting) return;

  // Check if mutual exclusivity applies to the current model
  if (!isModelInWhitelist(changedField, form)) return;

  const groupRegistry = formGroupRegistry.get(form);
  if (!groupRegistry) return;

  const groupFields = groupRegistry.get(groupName);
  if (!groupFields) return;

  // Check if the changed field now has a non-negative value (user is activating it)
  // If the field still has a negative value, don't reset other fields
  if (hasNegativeValue(changedField)) return;

  // Remove inactive effect from the field being changed (it's now active)
  removeInactiveEffect(changedField);

  // Set flag to prevent re-entry
  isResetting = true;

  try {
    // Reset all other fields in the group to their empty/reset values
    // This clears other fields regardless of their current value
    groupFields.forEach((field) => {
      if (field !== changedField) {
        clearField(field);
      }
    });
  } finally {
    // Always reset the flag, even if an error occurs
    isResetting = false;
  }
}

/**
 * Register a field element with a mutually exclusive group
 * This function is called from createFormField when a field has the
 * data-mutually-exclusive attribute.
 *
 * @param fieldElement - The input/select/textarea element
 * @param groupName - The name of the mutually exclusive group
 * @param defaultValue - The default value for this field (optional, will be stored as data attribute)
 */
export function registerMutuallyExclusiveField(
  fieldElement: HTMLElement,
  groupName: string,
  defaultValue?: string | number | boolean,
): void {
  // Store the default value as a data attribute if provided
  if (defaultValue !== undefined) {
    fieldElement.setAttribute('data-default-value', JSON.stringify(defaultValue));
  }

  // Find the parent form
  const form = fieldElement.closest('form') as HTMLFormElement;
  if (!form) {
    // If no form yet, defer registration until the field is added to a form
    const observer = new MutationObserver((mutations, obs) => {
      const parentForm = fieldElement.closest('form') as HTMLFormElement;
      if (parentForm) {
        obs.disconnect();
        registerFieldWithForm(fieldElement, groupName, parentForm);
      }
    });

    // Observe the document body for when the field gets added to a form
    observer.observe(document.body, { childList: true, subtree: true });

    // Set a timeout to clean up the observer if it's not needed
    setTimeout(() => observer.disconnect(), 5000);
    return;
  }

  registerFieldWithForm(fieldElement, groupName, form);
}

/**
 * Internal function to register a field with a form's group registry
 */
function registerFieldWithForm(
  fieldElement: HTMLElement,
  groupName: string,
  form: HTMLFormElement,
): void {
  // Get or create the group registry for this form
  let groupRegistry = formGroupRegistry.get(form);
  if (!groupRegistry) {
    groupRegistry = new Map();
    formGroupRegistry.set(form, groupRegistry);
  }

  // Get or create the set of fields for this group
  let groupFields = groupRegistry.get(groupName);
  if (!groupFields) {
    groupFields = new Set();
    groupRegistry.set(groupName, groupFields);
  }

  // Add this field to the group
  groupFields.add(fieldElement);

  // Add change listener to handle mutual exclusivity
  // Only listen to 'input' event for immediate feedback (not both to avoid double-triggering)
  const changeHandler = () => handleFieldChange(fieldElement, groupName, form);

  fieldElement.addEventListener('input', changeHandler);

  // Store handler reference for potential cleanup
  (fieldElement as any)._mutuallyExclusiveHandler = changeHandler;

  // Apply blur effect on initial load if field already has a negative value
  // This handles cases where saved configuration has a "not set" value
  if (hasNegativeValue(fieldElement)) {
    applyInactiveEffect(fieldElement);
  }
}

/**
 * Update the visibility of mutual exclusive hint messages based on the current model.
 * Hints with a `data-mutual-exclusive-models` attribute are only shown when the
 * current model is in the whitelist.
 *
 * Call this function when the model selection changes to ensure hints are only
 * visible for models that support mutual exclusivity (e.g., Anthropic models).
 *
 * @param form The form element containing the hints and model selector
 */
export function updateMutualExclusiveHintsVisibility(form: HTMLFormElement): void {
  // Get the current model from the form's model selector
  const modelSelector = form.querySelector('#model') as HTMLSelectElement;
  if (!modelSelector) return;

  const currentModel = modelSelector.value?.toLowerCase();
  if (!currentModel) return;

  // Find all hints with model whitelist
  const hints = form.querySelectorAll('.mutual-exclusive-hint[data-mutual-exclusive-models]');

  hints.forEach((hint: HTMLElement) => {
    const modelsAttr = hint.getAttribute('data-mutual-exclusive-models');
    if (!modelsAttr) return;

    try {
      const whitelistedModels: string[] = JSON.parse(modelsAttr);
      const shouldShow = whitelistedModels.some(
        (model) => model.toLowerCase() === currentModel,
      );
      hint.style.display = shouldShow ? '' : 'none';
    } catch {
      // On parse error, hide the hint
      hint.style.display = 'none';
    }
  });
}
