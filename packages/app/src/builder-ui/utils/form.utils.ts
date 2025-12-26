export const focusField = (elm: HTMLInputElement) => {
  if (!elm) return;

  elm?.focus();

  // Set the cursor at the end of the input
  const len = elm.value.length || 0;
  elm.setSelectionRange(len, len);
};

export const dispatchSubmitEvent = (form: HTMLFormElement): void => {
  // KEEP THE PREVIOUS CODE FOR FUTURE REFERENCE, IN CASE WE HAVE ANY ISSUE WITH THE DISPATCH APPROACH
  // * Button click to submit form affects UI part like select box, dropdown, and template variables
  /* const formBtn = form.querySelector('button.submit') as HTMLFormElement;
                formBtn.click(); */

  const submitEvent = new Event('submit', {
    bubbles: true,
    cancelable: true,
  });
  form.dispatchEvent(submitEvent);
};

export const dispatchInputEvent = (elm: HTMLInputElement | HTMLTextAreaElement): void => {
  const changeEvent = new Event('input', {
    bubbles: true,
    cancelable: true,
  });
  elm.dispatchEvent(changeEvent);
};

/**
 * Checks if template variables are enabled based on the element's data-template-vars attribute.
 * Supports both simple boolean string ("true") and JSON object format ({"enabled": true, "singleOnly": true}).
 *
 * @example
 * // Pass element directly
 * isTemplateVarsEnabled(inputElement) // returns true if enabled
 *
 * // Works with any HTMLElement that has data-template-vars attribute
 * const formField = document.querySelector('.my-field');
 * isTemplateVarsEnabled(formField) // returns true if enabled
 *
 * @param element - The HTML element to check for data-template-vars attribute
 * @returns true if template vars are enabled, false otherwise
 */
export function isTemplateVarsEnabled(element: HTMLElement | null | undefined): boolean {
  if (!element) return false;

  const attributeValue = element.getAttribute('data-template-vars');
  if (!attributeValue) return false;
  if (attributeValue === 'true') return true;

  try {
    const config = JSON.parse(attributeValue);
    return config.enabled === true;
  } catch {
    // Fallback: check for "enabled":true or "enabled": true in string
    return attributeValue.includes('"enabled":true') || attributeValue.includes('"enabled": true');
  }
}
