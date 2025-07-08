//This library contains Tailwind based Dialogs
//it's aimed to replace dialogs.ts

import { PRIMARY_BUTTON_STYLE } from '@src/react/shared/constants/style';
import { delay, dispatchSubmitEvent } from '../utils';
import { createForm, handleTemplateVars, readFormValues, smythValidator } from './form';

interface DialogAction {
  label: string;
  requiresValidation?: boolean;
  cssClass?: string;
  callback: (data?: any, dialogElm?: any) => void;
}

interface FormDialogSettings {
  title?: string;
  content?: string;
  actions?: DialogAction[];
  fields?: any;
  onDOMReady?: (dialog: HTMLElement) => void; //callback when dialog is ready but not yet displayed
  onLoad?: (dialog: HTMLElement) => void; //callback when dialog is loaded
  onCloseClick?: (data?: any, dialog?: HTMLElement) => void; //callback when default dialog close buttons [X] is clicked, if this function is not defined, the dialog will not have a corner close button
  btnSaveLabel?: string;
  contentClasses?: string;
  dialogClasses?: string;
  showCloseButton?: boolean;
}

interface ContentDialogSettings {
  title?: string;
  content?: any;
  actions?: DialogAction[];
  onDOMReady?: (dialog: HTMLElement) => void; //callback when dialog is ready but not yet displayed
  onLoad?: (dialog: HTMLElement) => void; //callback when dialog is loaded
  onCloseClick?: (data?: any, dialog?: HTMLElement) => void; //callback when default dialog close buttons [X] is clicked, if this function is not defined, the dialog will not have a corner close button
}

export function editValuesDialog({
  title = '',
  content = '',
  fields = {},
  onDOMReady = null,
  btnSaveLabel = '',
  contentClasses = '',
  dialogClasses = '',
  showCloseButton = false,
}: FormDialogSettings) {
  return new Promise((resolve, reject) => {
    twEditValues({
      title,
      content,
      fields,
      onDOMReady: (dialog) => {
        const dialogElm = dialog.querySelector('.__dialog');

        handleTemplateVars(dialogElm);
        const sections = [...dialogElm.querySelectorAll('.form-section')];

        for (let section of sections) {
          //Hide sections that have no visible elements
          const formBoxes = [...section.querySelectorAll('.form-box')];
          const hiddenBoxes = formBoxes.filter((box) => box.classList.contains('hidden'));
          if (hiddenBoxes.length === formBoxes.length) {
            section.classList.add('hidden');
          }
        }

        if (typeof onDOMReady === 'function') {
          onDOMReady(dialog);
        }
      },
      actions: [
        ...(!showCloseButton
          ? [{ label: 'Cancel', cssClass: 'bg-gray-400', callback: (result) => resolve(null) }]
          : []),
        {
          label: btnSaveLabel || 'Save',
          cssClass: PRIMARY_BUTTON_STYLE,
          requiresValidation: true,
          callback: (result) => resolve(result),
        },
      ],
      ...(showCloseButton ? { onCloseClick: (result) => resolve(null) } : {}),
      contentClasses,
      dialogClasses,
    });
  });
}

export function popupValuesDialog({ title = '', fields = {}, onLoad }: FormDialogSettings) {
  return new Promise((resolve, reject) => {
    //apply custom style to the dialog before showing it
    const onDOMReady = (dialog: HTMLElement) => {
      const titleElm = dialog.querySelector('.__title').parentElement;
      titleElm.classList.remove(
        'py-2',
        'bg-gray-700',
        'bg-gradient-to-r',
        'from-emerald-800',
        'to-emerald-600',
      );
      titleElm.setAttribute('style', 'background:transparent !important');

      const dialogElm = dialog.querySelector('.__dialog');
      dialogElm.classList.remove('shadow-xl', 'border-2');

      const contentElm: HTMLElement = dialog.querySelector('.__content');
      contentElm.classList.remove('p-2');
    };

    twEditValues({
      title,
      fields,
      onDOMReady,
      onLoad,
      onCloseClick: (values) => {
        resolve(values);
        return;
      },
    });
  });
}

/**
 * Generic function to handle Values Editing Dialogs
 * @param param0
 * @returns
 */
export async function twEditValues({
  title = '',
  content = '',
  actions = [],
  fields = {},
  onDOMReady,
  onLoad,
  onCloseClick,
  contentClasses = '',
  dialogClasses = '',
}: FormDialogSettings) {
  const dialoTpl = document.querySelector('#editValuesDialogTpl');
  if (!dialoTpl) return;
  const dialog = dialoTpl.cloneNode(true) as HTMLElement;
  dialog.removeAttribute('id');

  const dialogOverlay = dialog.querySelector('.__overlay');
  const dialogDialog = dialog.querySelector('.__dialog');

  const dialogTitle = dialog.querySelector('.__title');
  const dialogContent: HTMLElement = dialog.querySelector('.__content');

  const dialogActions = dialog.querySelector('.__actions');

  const dialogCloseBtn = dialog.querySelector('.__btnClose') as HTMLButtonElement;

  dialogTitle.innerHTML = title;

  const form = createForm(fields, 'inline');
  form._init();
  if (content) dialogContent.innerHTML = content;

  // dialogContent.style.minHeight = '350px';
  dialogContent.appendChild(form);

  if (dialogClasses) {
    dialogDialog.className = dialogDialog.className + ' ' + dialogClasses;
  }

  if (contentClasses) {
    dialogContent.className = dialogContent.className + ' ' + contentClasses;
  }

  const buttons = [];

  if (actions.length === 0) {
    dialogActions.remove();
  }
  if (typeof onCloseClick === 'function') {
    buttons.push({ button: dialogCloseBtn, action: { callback: onCloseClick } });
  } else {
    dialogCloseBtn.remove();
  }

  for (let action of actions) {
    const button = document.createElement('button');
    dialogActions.appendChild(button);
    button.className = `px-4 py-2 text-white transition-opacity rounded w-full sm:w-auto ${
      action.cssClass || PRIMARY_BUTTON_STYLE
    }`;
    button.innerHTML = action.label;
    buttons.push({ button, action });
  }

  for (let buttonElement of buttons) {
    const button = buttonElement.button;
    const action: DialogAction = buttonElement.action;
    button.onclick = async (event) => {
      if (action.requiresValidation) {
        dispatchSubmitEvent(form); // to trigger validation

        await delay(30);

        //#region smyth validator
        const _this = event.target as HTMLButtonElement;
        const btnText = _this.textContent;
        _this.textContent = 'Validating...';
        _this.disabled = true;

        const isValid = await smythValidator.validateInputs(form);

        _this.textContent = btnText;
        _this.disabled = false;

        if (!isValid) {
          return;
        }
        //#endregion

        const invalid = form.querySelector('.invalid');

        if (invalid) {
          console.log('invalid');
          return;
        }
      }

      const result = readFormValues(form, fields);

      if (typeof action.callback === 'function') action.callback(result);

      dialogOverlay.classList.remove('opacity-100');
      dialogOverlay.classList.remove('opacity-0');

      dialogDialog.classList.remove('scale-100');
      dialogDialog.classList.add('scale-0');
      await delay(300);
      dialog.remove();
    };
    if (action.requiresValidation) {
      // add event listener to form for enter key press
      form.addEventListener('keypress', function (e: KeyboardEvent) {
        if (e.key === 'Enter') {
          const target = e.target;
          if (target instanceof HTMLElement && target.tagName === 'TEXTAREA') return;
          e.preventDefault();
          button.click();
        }
      });
    }
  }

  document.body.appendChild(dialog);
  if (typeof onDOMReady === 'function') onDOMReady(dialog);

  dialog.classList.remove('hidden');

  await delay(100);
  dialogOverlay.classList.remove('opacity-25');

  dialogDialog.classList.remove('scale-0');

  if (typeof onLoad === 'function') onLoad(dialog);
  return dialog;
}

export async function twModalDialog({
  title,
  content,
  actions,
  onDOMReady,
  onLoad,
  onCloseClick,
}: ContentDialogSettings) {
  const dialoTpl = document.querySelector('#editValuesDialogTpl');
  if (!dialoTpl) return;
  const dialog = dialoTpl.cloneNode(true) as HTMLElement;
  dialog.removeAttribute('id');

  const dialogOverlay = dialog.querySelector('.__overlay');
  const dialogDialog = dialog.querySelector('.__dialog');

  const dialogTitle = dialog.querySelector('.__title');
  const dialogContent = dialog.querySelector('.__content');

  const dialogActions = dialog.querySelector('.__actions');

  const dialogCloseBtn = dialog.querySelector('.__btnClose') as HTMLButtonElement;

  dialogTitle.innerHTML = title;

  dialogContent.innerHTML = content;

  const buttons = [];

  if (actions.length === 0) {
    dialogActions.remove();
  }
  if (typeof onCloseClick === 'function') {
    buttons.push({ button: dialogCloseBtn, action: { callback: onCloseClick } });
  } else {
    dialogCloseBtn.remove();
  }

  for (let action of actions) {
    const button = document.createElement('button');
    dialogActions.appendChild(button);
    button.className = `flex items-center justify-center font-normal border border-solid text-base px-4 py-2 text-center rounded transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none ${
      action.cssClass || PRIMARY_BUTTON_STYLE
    }`;
    button.innerHTML = action.label;
    buttons.push({ button, action });
  }

  for (let buttonElement of buttons) {
    const button = buttonElement.button;
    const action: DialogAction = buttonElement.action;
    button.onclick = async () => {
      if (typeof action.callback === 'function') action.callback(dialog);

      dialogOverlay.classList.remove('opacity-100');
      dialogOverlay.classList.remove('opacity-0');

      dialogDialog.classList.remove('scale-100');
      dialogDialog.classList.add('scale-0');
      await delay(300);
      dialog.remove();
    };
  }

  document.body.appendChild(dialog);
  if (typeof onDOMReady === 'function') onDOMReady(dialog);

  dialog.classList.remove('hidden');

  await delay(100);
  dialogOverlay.classList.remove('opacity-25');

  dialogDialog.classList.remove('scale-0');

  if (typeof onLoad === 'function') onLoad(dialog);
  return dialog;
}

export async function twEditValuesWithCallback(
  {
    title = '',
    content = '',
    actions = [],
    fields = {},
    contentClasses = '',
    dialogClasses = '',
    onDOMReady,
    onLoad,
    onCloseClick,
  }: FormDialogSettings,
  dialogHeight = '', // before it was '400px'
  minContentHeight = '', // before it was '300px'
  overflowY = 'auto',
  minWidth = '550px',
  maxWidth = '42rem',
) {
  const dialoTpl = document.querySelector('#tweditValuesDialogTpl');
  if (!dialoTpl) return;
  const dialog = dialoTpl.cloneNode(true) as HTMLElement;
  dialog.removeAttribute('id');

  const dialogOverlay = dialog.querySelector('.__overlay');
  const dialogDialog: HTMLDivElement = dialog.querySelector('.__dialog');

  const dialogTitle = dialog.querySelector('.__title');
  const dialogContent: HTMLElement = dialog.querySelector('.__content');
  const dialogActions = dialog.querySelector('.__actions');
  const dialogCloseBtn = dialog.querySelector('.__btnClose') as HTMLButtonElement;

  dialogTitle.innerHTML = title;

  const form = createForm(fields, 'inline');
  form._init();
  if (content) dialogContent.innerHTML = content;

  // Remove conflicting classes
  if (overflowY === 'none') {
    dialogContent.classList.remove('max-h-96', 'max-h-[60vh]', 'overflow-y-auto');
  }
  // Set the minimum height and overflow property of the content
  if (minContentHeight) dialogContent.style.minHeight = minContentHeight;
  dialogContent.style.overflowY = overflowY;
  dialogContent.appendChild(form);

  // Set the height of the dialog
  if (dialogHeight) dialogDialog.style.height = dialogHeight;
  dialogDialog.style.setProperty('min-width', minWidth, 'important');
  dialogDialog.style.setProperty('max-width', maxWidth, 'important');

  if (dialogClasses) dialogDialog.className = dialogDialog.className + ' ' + dialogClasses;
  if (contentClasses) dialogContent.className = dialogContent.className + ' ' + contentClasses;

  const buttons = [];

  if (actions.length === 0) {
    dialogActions.remove();
  }

  if (typeof onCloseClick === 'function') {
    buttons.push({ button: dialogCloseBtn, action: { callback: onCloseClick } });
  } else {
    dialogCloseBtn.onclick = closeDialog;
  }

  for (let action of actions) {
    const button = document.createElement('button');
    dialogActions.appendChild(button);
    // button.className = `py-2 text-white transition-opacity rounded-md w-[340px] hover:opacity-75 ${
    //   action.cssClass || 'bg-blue-500'
    // }`;
    button.className = `flex items-center justify-center font-normal border border-solid text-base px-4 py-2 text-center rounded transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none ${
      action.cssClass || PRIMARY_BUTTON_STYLE
    }`;
    button.innerHTML = action.label;
    buttons.push({ button, action });
  }

  for (let buttonElement of buttons) {
    const button = buttonElement.button;
    const action: DialogAction = buttonElement.action;
    button.onclick = async (event) => {
      if (action.requiresValidation) {
        dispatchSubmitEvent(form);

        await delay(30);

        //#region smyth validator
        const thisBtnElm = event.target as HTMLButtonElement;
        const btnText = thisBtnElm.textContent;
        thisBtnElm.textContent = 'Validating...';
        thisBtnElm.disabled = true;

        const isValidInputs = await smythValidator.validateInputs(form);

        thisBtnElm.textContent = btnText;
        thisBtnElm.disabled = false;
        //#endregion

        // has invalid element means the form has invalid input
        const hasInvalidElm = !!form.querySelector('.invalid');

        if (!isValidInputs || hasInvalidElm) return;
      }

      const result = readFormValues(form, fields);

      try {
        await action.callback(result, dialog);
      } catch (error) {
        console.error('API call failed:', error);
        closeDialog();
      }
    };
  }

  function closeDialog() {
    dialogOverlay.classList.remove('opacity-100');
    dialogOverlay.classList.remove('opacity-0');

    dialogDialog.classList.remove('scale-100');
    dialogDialog.classList.add('scale-0');
    delay(300).then(() => dialog.remove());
  }

  document.body.appendChild(dialog);
  if (typeof onDOMReady === 'function') onDOMReady(dialog);

  dialog.classList.remove('hidden');

  await delay(100);
  dialogOverlay.classList.remove('opacity-25');

  dialogDialog.classList.remove('scale-0');

  if (typeof onLoad === 'function') onLoad(dialog);
  return dialog;
}

export function closeTwDialog(dialog) {
  const dialogOverlay = dialog.querySelector('.__overlay');
  const dialogDialog: HTMLDivElement = dialog.querySelector('.__dialog');

  dialogOverlay.classList.remove('opacity-100');
  dialogOverlay.classList.remove('opacity-0');

  dialogDialog.classList.remove('scale-100');
  dialogDialog.classList.add('scale-0');

  delay(300).then(() => dialog.remove());
}
