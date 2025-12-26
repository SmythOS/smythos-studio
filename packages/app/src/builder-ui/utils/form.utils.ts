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
 * Checks if template variables are enabled based on the data-template-vars attribute value.
 * Supports both simple boolean string ("true") and JSON object format ({"enabled": true, "singleOnly": true}).
 *
 * @example
 * // String format
 * isTemplateVarsEnabled("true") // returns true
 *
 * // Object format
 * isTemplateVarsEnabled('{"enabled": true, "singleOnly": true}') // returns true
 *
 * // From element
 * const attr = element.getAttribute('data-template-vars');
 * isTemplateVarsEnabled(attr) // returns true if enabled
 *
 * @param attributeValue - The value of data-template-vars attribute
 * @returns true if template vars are enabled, false otherwise
 */
export function isTemplateVarsEnabled(attributeValue: string | null | undefined): boolean {
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
