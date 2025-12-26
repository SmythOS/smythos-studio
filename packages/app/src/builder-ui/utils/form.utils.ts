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
 * Checks if template variables are enabled from attribute value.
 * Supports both simple boolean string ("true") and JSON object format ({"enabled": true, "singleOnly": true}).
 * Returns true only if explicitly enabled, false for everything else.
 *
 * @example
 * const attrValue = element.getAttribute('data-template-vars');
 * if (isTemplateVarsEnabled(attrValue)) {
 *   // Show template variable buttons
 * }
 *
 * isTemplateVarsEnabled('true') // returns true
 * isTemplateVarsEnabled('{"enabled": true, "singleOnly": true}') // returns true
 * isTemplateVarsEnabled('false') // returns false
 * isTemplateVarsEnabled('{"enabled": false}') // returns false
 * isTemplateVarsEnabled(null) // returns false
 *
 * @param attributeValue - The data-template-vars attribute value string
 * @returns true if explicitly enabled, false otherwise
 */
export function isTemplateVarsEnabled(attributeValue: string | null | undefined): boolean {
  if (!attributeValue) return false;

  // Simple boolean string
  if (attributeValue === 'true') return true;

  // Try to parse as JSON object
  try {
    const config = JSON.parse(attributeValue);
    // Check if enabled property is explicitly true
    return config.enabled === true;
  } catch {
    // Not valid JSON - return false
    return false;
  }
}
