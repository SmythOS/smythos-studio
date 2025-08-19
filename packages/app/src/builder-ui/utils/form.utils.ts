
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
