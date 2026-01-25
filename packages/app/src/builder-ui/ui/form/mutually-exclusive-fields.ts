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
 * - with: string (optional) - Display name of the related field(s) for the hint message
 * - reason: string (optional) - Explanation of why the fields are mutually exclusive
 *
 * Example in field definition:
 * ```typescript
 * temperature: {
 *   type: 'range',
 *   value: 1,
 *   attributes: {
 *     'data-mutually-exclusive': JSON.stringify({
 *       group: 'sampling-params',
 *       with: 'Top P',
 *       reason: 'The selected model supports either Temperature or Top P',
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
 *       with: 'Temperature',
 *       reason: 'The selected model supports either Temperature or Top P',
 *     }),
 *     // ... other attributes
 *   },
 * },
 * ```
 *
 * When temperature is changed from its default, topP will be reset to -1, and vice versa.
 * A hint message will be displayed below each field explaining the mutual exclusivity.
 *
 * ## Data Serialization
 * **IMPORTANT**: Before sending form data to the backend API, you must normalize the values
 * to convert -1 sentinel values to undefined:
 *
 * ```typescript
 * import { normalizeMutuallyExclusiveParams } from './form';
 *
 * // When collecting form data:
 * const formData = {
 *   temperature: 0.7,
 *   topP: -1,        // This was reset by mutual exclusivity
 *   maxTokens: 1000
 * };
 *
 * // Normalize before sending to backend:
 * const normalizedData = normalizeMutuallyExclusiveParams(formData);
 * // Result: { temperature: 0.7, topP: undefined, maxTokens: 1000 }
 *
 * // The backend will then exclude undefined values automatically:
 * // if (params?.topP !== undefined) body.top_p = params.topP;
 * ```
 *
 * This approach keeps the backend simple - no changes needed to parameter handling!
 */

declare var Metro: any;

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
 * Get the default value for a field element based on its type
 */
function getFieldDefaultValue(fieldElement: HTMLElement): string | number | boolean {
  const defaultValueAttr = fieldElement.getAttribute('data-default-value');
  if (defaultValueAttr !== null) {
    // Try to parse as JSON for complex types, otherwise use as string
    try {
      return JSON.parse(defaultValueAttr);
    } catch {
      return defaultValueAttr;
    }
  }

  // Fallback defaults based on field type
  const fieldType = fieldElement.getAttribute('type') || fieldElement.tagName.toLowerCase();

  switch (fieldType) {
    case 'checkbox':
      return false;
    case 'number':
    case 'range':
      return parseFloat(fieldElement.getAttribute('min') || '0');
    case 'select':
    case 'select-one':
      const firstOption = (fieldElement as HTMLSelectElement).options?.[0];
      return firstOption?.value || '';
    default:
      return '';
  }
}

/**
 * Get the current value of a field element
 */
function getFieldValue(fieldElement: HTMLElement): string | number | boolean {
  const tagName = fieldElement.tagName.toLowerCase();

  if (tagName === 'input') {
    const inputElement = fieldElement as HTMLInputElement;
    const inputType = inputElement.type;

    switch (inputType) {
      case 'checkbox':
        return inputElement.checked;
      case 'number':
      case 'range':
        return parseFloat(inputElement.value) || 0;
      default:
        return inputElement.value;
    }
  }

  if (tagName === 'select') {
    return (fieldElement as HTMLSelectElement).value;
  }

  if (tagName === 'textarea') {
    return (fieldElement as HTMLTextAreaElement).value;
  }

  return '';
}

/**
 * Get the empty/cleared value for a field based on its type
 * - Numbers: -1 for mutually exclusive fields (to distinguish from valid 0 values), or min value otherwise
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
        // For mutually exclusive numeric fields, use -1 as sentinel value
        // This allows distinguishing "unset" from valid 0 values in backend
        const hasMutualExclusive = fieldElement.getAttribute('data-mutually-exclusive');
        if (hasMutualExclusive) {
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
 * Check if a field's current value differs from its default value
 */
function hasNonDefaultValue(fieldElement: HTMLElement): boolean {
  const currentValue = getFieldValue(fieldElement);
  const defaultValue = getFieldDefaultValue(fieldElement);

  // Handle floating point comparison for numbers
  if (typeof currentValue === 'number' && typeof defaultValue === 'number') {
    return Math.abs(currentValue - defaultValue) > 0.0001;
  }

  return currentValue !== defaultValue;
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

  const groupRegistry = formGroupRegistry.get(form);
  if (!groupRegistry) return;

  const groupFields = groupRegistry.get(groupName);
  if (!groupFields) return;

  // Only reset other fields if this field has a non-default value
  if (!hasNonDefaultValue(changedField)) return;

  // Set flag to prevent re-entry
  isResetting = true;

  try {
    // Reset all other fields in the group to their defaults
    groupFields.forEach((field) => {
      if (field !== changedField && hasNonDefaultValue(field)) {
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
}

/**
 * Unregister a field from its mutually exclusive group
 * Call this when a field is removed from the DOM
 */
export function unregisterMutuallyExclusiveField(fieldElement: HTMLElement): void {
  const form = fieldElement.closest('form') as HTMLFormElement;
  if (!form) return;

  const groupRegistry = formGroupRegistry.get(form);
  if (!groupRegistry) return;

  const groupName = fieldElement.getAttribute('data-mutually-exclusive');
  if (!groupName) return;

  const groupFields = groupRegistry.get(groupName);
  if (groupFields) {
    groupFields.delete(fieldElement);

    // Clean up empty groups
    if (groupFields.size === 0) {
      groupRegistry.delete(groupName);
    }
  }

  // Remove event listeners
  const handler = (fieldElement as any)._mutuallyExclusiveHandler;
  if (handler) {
    fieldElement.removeEventListener('input', handler);
    delete (fieldElement as any)._mutuallyExclusiveHandler;
  }
}

/**
 * Get all fields in a mutually exclusive group within a form
 */
export function getMutuallyExclusiveGroup(
  form: HTMLFormElement,
  groupName: string,
): HTMLElement[] {
  const groupRegistry = formGroupRegistry.get(form);
  if (!groupRegistry) return [];

  const groupFields = groupRegistry.get(groupName);
  if (!groupFields) return [];

  return Array.from(groupFields);
}

/**
 * Reset all fields in a mutually exclusive group to their defaults
 */
export function resetMutuallyExclusiveGroup(
  form: HTMLFormElement,
  groupName: string,
): void {
  isResetting = true;
  try {
    const fields = getMutuallyExclusiveGroup(form, groupName);
    fields.forEach((field) => clearField(field));
  } finally {
    isResetting = false;
  }
}

/**
 * Check if any field in a mutually exclusive group has a non-default value
 */
export function hasGroupNonDefaultValue(
  form: HTMLFormElement,
  groupName: string,
): boolean {
  const fields = getMutuallyExclusiveGroup(form, groupName);
  return fields.some((field) => hasNonDefaultValue(field));
}

/**
 * Get the field in a group that currently has a non-default value
 * Returns null if all fields have default values
 */
export function getActiveFieldInGroup(
  form: HTMLFormElement,
  groupName: string,
): HTMLElement | null {
  const fields = getMutuallyExclusiveGroup(form, groupName);
  return fields.find((field) => hasNonDefaultValue(field)) || null;
}

/**
 * Normalize a field value for serialization/API submission
 * Converts -1 sentinel values to undefined for mutually exclusive numeric fields
 * 
 * @param value The raw field value
 * @param fieldElement Optional field element to check if it has mutually exclusive behavior
 * @returns The normalized value (undefined if it's a -1 sentinel, otherwise the original value)
 */
export function normalizeMutuallyExclusiveValue(
  value: any,
  fieldElement?: HTMLElement,
): any {
  // If value is exactly -1 and field has mutually exclusive attribute, return undefined
  if (value === -1 || value === '-1') {
    if (fieldElement) {
      const hasMutualExclusive = fieldElement.getAttribute('data-mutually-exclusive');
      if (hasMutualExclusive) {
        return undefined;
      }
    } else {
      // If no field element provided, assume -1 should be treated as undefined
      // This is safe because -1 is our sentinel value for "unset"
      return undefined;
    }
  }
  
  return value;
}

/**
 * Normalize an object of field values, converting -1 sentinel values to undefined
 * This should be called before sending data to the backend API
 * 
 * @param data Object containing field names and values
 * @param form Optional form element to check field attributes
 * @returns Normalized object with -1 values converted to undefined
 * 
 * @example
 * const formData = { temperature: 0.7, topP: -1, maxTokens: 1000 };
 * const normalized = normalizeMutuallyExclusiveParams(formData);
 * // Result: { temperature: 0.7, topP: undefined, maxTokens: 1000 }
 */
export function normalizeMutuallyExclusiveParams(
  data: Record<string, any>,
  form?: HTMLFormElement,
): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    let fieldElement: HTMLElement | null = null;
    
    // Try to find the field element if form is provided
    if (form) {
      // Try common field selectors
      fieldElement =
        form.querySelector(`#${key}`) ||
        form.querySelector(`[name="${key}"]`) ||
        null;
    }
    
    normalized[key] = normalizeMutuallyExclusiveValue(value, fieldElement || undefined);
  }
  
  return normalized;
}
