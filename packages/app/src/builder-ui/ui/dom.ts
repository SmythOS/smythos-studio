declare var ace: any;

declare global {
  interface window {
    ace: any;
  }
}

import { addBracketSelection } from './form/misc';

export function setCaratAtEnd(element) {
  // Place cursor at the end of a content editable div
  if (element.type !== 'textarea' && element.getAttribute('contenteditable') === 'true') {
    element.focus();
    window.getSelection().selectAllChildren(element);
    window.getSelection().collapseToEnd();
  } else {
    // Place cursor at the end of text areas and input elements
    element.focus();
    element.select();
    window.getSelection().collapseToEnd();
  }
}

export function makeInlineEditable(
  target,
  {
    callback = (value: string) => {},
    showButtons = true,
    editOnClick = true,
    editingClass = 'editing',
  } = {},
) {
  if (typeof target == 'string') target = document.querySelector(target);
  if (!target) return console.error('makeInlineEditable(): Target not found');

  const element = document.createElement('span');
  element.className = 'text';
  element.textContent = target.textContent;
  element.title = target.textContent;
  target.textContent = '';
  target.classList.add('inline-editable');
  target.appendChild(element);
  const button = document.createElement('button');
  button.className = 'btn-edit-inline button mini outline';
  button.innerHTML = '<span class="icon mif-pencil"></span>';
  if (showButtons) element.parentElement.appendChild(button);

  const saveValues = () => {
    element.removeEventListener('keydown', handleEnterKey);
    const value = element.textContent;
    button.querySelector('.icon').classList.remove('mif-checkmark');
    button.querySelector('.icon').classList.add('mif-pencil');
    element.removeAttribute('contenteditable');
    element.classList.remove(editingClass);
    button.classList.remove(editingClass);

    if (typeof callback == 'function') {
      callback(value);
    }
  };
  const handleEnterKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveValues();
    }
  };
  let x, y;
  const clickEventHandler = (event) => {
    //if the mouse position changed it means that the user dragged the element ==> don't edit
    if (Math.abs(event.clientX - x) > 5 || Math.abs(event.clientY - y) > 5) return;

    event.stopPropagation();
    const save = button.querySelector('.icon').classList.contains('mif-checkmark');
    if (!save) {
      element.setAttribute('contenteditable', 'true');
      element.addEventListener('keydown', handleEnterKey);
      element.classList.add(editingClass);
      button.classList.add(editingClass);
      element.focus();
      setCaratAtEnd(element);

      button.querySelector('.icon').classList.remove('mif-pencil');
      button.querySelector('.icon').classList.add('mif-checkmark');
      return;
    }
    saveValues();
  };
  const mouseDownEventHandler = (event) => {
    event.stopPropagation();
    //get mouse x, y
    x = event.clientX;
    y = event.clientY;
  };

  if (showButtons) button.addEventListener('mousedown', mouseDownEventHandler);
  if (editOnClick) target.addEventListener('mousedown', mouseDownEventHandler);
  else
    target.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
    });

  if (showButtons) button.addEventListener('click', clickEventHandler);
  if (editOnClick) target.addEventListener('click', clickEventHandler);
  else
    target.addEventListener('click', (event) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
    });
}

export function setCodeEditor(
  textAreaSelector,
  mode = 'json',
  theme = 'tomorrow',
  disableWorker = false,
) {
  const textAreas: any =
    typeof textAreaSelector == 'string'
      ? document?.querySelectorAll(textAreaSelector)
      : [textAreaSelector];

  const editors = [];
  textAreas?.forEach((textArea) => {
    if (textArea?.tagName !== 'TEXTAREA') return;
    const isReadOnly = textArea?.hasAttribute('readonly');
    const hasDataTempVarsTrue = textArea && textArea?.getAttribute('data-template-vars') === 'true';
    const dataAttr = textArea?.getAttribute('data-hide-line-numbers');
    const scrollMarginTop = textArea?.getAttribute('data-scroll-margin-top') || 20;
    const scrollMarginBottom = textArea?.getAttribute('data-scroll-margin-bottom') || 20;
    const scrollMarginLeft = textArea?.getAttribute('data-scroll-margin-left') || 20;
    const scrollMarginRight = textArea?.getAttribute('data-scroll-margin-right') || 0;
    const showLineNumbers = dataAttr !== null ? dataAttr === 'false' : true;
    const wrapLine = textArea?.getAttribute('data-wrap-line') === 'true';
    const div: any = document.createElement('div');
    div.id = 'ace-editor-styles';
    div.className = 'ace-editor ' + textArea?.className;
    textArea.parentNode.insertBefore(div, textArea?.nextSibling);
    textArea?.classList?.add('hidden');

    const editor = ace?.edit(div);
    editors.push(editor);
    editor?.setOptions({
      maxLines: Infinity,
      wrap: wrapLine, // enable horizontal scrolling
      showGutter: showLineNumbers,
      showLineNumbers,
    });
    // Remove fixed height and allow content to determine height
    editor.container.style.height = 'auto';
    editor.renderer.setScrollMargin(
      scrollMarginTop,
      scrollMarginBottom,
      scrollMarginLeft,
      scrollMarginRight,
    );
    // set editor readonly if true otherwise make it false
    isReadOnly ? editor?.setReadOnly(true) : editor?.setReadOnly(false);
    editor?.session?.setMode(`ace/mode/${mode}`);
    if (disableWorker) editor?.session?.setOption('useWorker', false);
    editor?.setTheme(`ace/theme/${theme}`);
    editor?.setValue(textArea.value);

    editor?.session?.on('change', function () {
      textArea.value = editor?.getValue();
    });

    let errorTooltips = {};

    function createTooltip(message, type) {
      const tooltip = document.createElement('div');
      tooltip.style.position = 'absolute';
      tooltip.style.display = 'none';

      switch (type) {
        case 'error':
          tooltip.className = 'ace_tooltip';
          message = `${message}`;
          break;
        case 'warning':
          tooltip.className = 'ace_tooltip';
          message = `${message}`;
          break;
        case 'info':
          tooltip.className = 'ace_tooltip';
          message = `${message}`;
          break;
        default:
          tooltip.className = 'ace_tooltip';
      }
      tooltip.textContent = message;
      document.body.appendChild(tooltip);
      return tooltip;
    }

    editor.session.on('changeAnnotation', function () {
      const annotations = editor.session.getAnnotations() || [];
      Object.values(errorTooltips).forEach((tooltip: any) => tooltip.remove());
      errorTooltips = {};
      //console.log({annotations})
      // Group annotations by row
      const groupedAnnotations = annotations.reduce((grouped, annotation) => {
        const { row } = annotation;
        if (!grouped[row]) {
          grouped[row] = [];
        }
        grouped[row].push(annotation);
        return grouped;
      }, {});

      // Create tooltips for each row with annotations
      Object.entries(groupedAnnotations).forEach(([row, annotations]: any) => {
        // Join multiple messages with a new line
        // Remove the last character if it's a full stop from each message
        const message = annotations
          .map((annot) => {
            return annot?.text?.replace?.(/\.$/, '');
          })
          ?.join('\n');
        const type = annotations[0].type; // Use the type of the first annotation as the tooltip type
        const tooltip = createTooltip(message, type);
        errorTooltips[row] = tooltip;
      });
    });

    editor.on('guttermousemove', function (e) {
      Object.values(errorTooltips).forEach((tooltip: any) => (tooltip.style.display = 'none'));

      const row = e.getDocumentPosition().row;
      const gutterRegion = e.domEvent.target.className;
      if (gutterRegion.includes('ace_gutter-cell') && errorTooltips.hasOwnProperty(row)) {
        const tooltip = errorTooltips[row];
        const editorCoords = editor.container.getBoundingClientRect();
        const lineHeight = editor.renderer.lineHeight;
        const pageWidth = window.innerWidth;
        const pageHeight = window.innerHeight;

        // Temporarily display the tooltip to measure its dimensions
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';

        // Measure the tooltip's dimensions
        const tooltipHeight = tooltip.offsetHeight;
        const tooltipWidth = tooltip.offsetWidth;

        // Calculate the top and left positions of the tooltip
        let tooltipTop = editorCoords.top + lineHeight * row - tooltipHeight - 5; // Adjust 5 pixels above the error line
        let tooltipLeft = editorCoords.left + 4; // Left align with gutter

        // Adjust if tooltip goes above the top of the window
        if (tooltipTop < window.scrollY) {
          tooltipTop = editorCoords.top + lineHeight * (row + 1) + 5;
        }

        // Adjust if tooltip goes below the bottom of the window
        if (tooltipTop + tooltipHeight > window.scrollY + pageHeight) {
          tooltipTop = editorCoords.top + lineHeight * row - tooltipHeight - 5;
        }

        // Adjust if tooltip goes beyond the right side of the window
        if (tooltipLeft + tooltipWidth > pageWidth) {
          tooltipLeft = pageWidth - tooltipWidth - 5; // 5 pixels from the right edge
        }

        // Set the tooltip's top and left positions to keep it on-screen
        tooltip.style.top = `${tooltipTop + 20}px`;
        tooltip.style.left = `${tooltipLeft}px`;
        tooltip.style.visibility = 'visible';
      }
    });

    editor.on('mousemove', function (e) {
      if (!e.domEvent.target.className.includes('ace_gutter-cell')) {
        Object.values(errorTooltips).forEach((tooltip: any) => (tooltip.style.display = 'none'));
      }
    });

    /*
     * Add a 'mouseout' event listener to the editor's container.
     * This is necessary because the editor itself doesn't inherently detect when the mouse leaves its area.
     * The event listener ensures that any active tooltips are removed when the mouse exits the editor,
     * preventing tooltips from lingering on the screen after the user has moved the cursor away.
     */
    const editorContainer = editor?.container;
    editorContainer?.addEventListener('mouseout', function (event) {
      // Check if the mouse has actually left the container
      if (!editorContainer.contains(event.relatedTarget)) {
        Object?.values(errorTooltips)?.forEach?.(
          (tooltip: any) => (tooltip.style.display = 'none'),
        );
      }
    });

    if (hasDataTempVarsTrue) {
      const aceContentElement = document?.querySelector('.ace_content') as HTMLElement;

      // inject bracket selection event to the ace editor element
      addBracketSelection(aceContentElement);

      aceContentElement.setAttribute('data-template-vars', 'true');
    }
    if (isReadOnly) {
      const aceContentElement = document?.querySelector('.ace_content');
      if (aceContentElement) {
        aceContentElement.setAttribute('readonly', 'readonly');
      }
    }
    div._textarea = textArea;
    textArea._editor = editor;
    editor.clearSelection();
  });

  return editors;
}

export function destroyCodeEditor(textAreaSelector) {
  const textAreas: any =
    typeof textAreaSelector == 'string'
      ? document.querySelectorAll(textAreaSelector)
      : [textAreaSelector];
  textAreas.forEach((textArea) => {
    if (textArea?.tagName !== 'TEXTAREA') return;
    if (!textArea?._editor) return;
    textArea.value = textArea._editor.getValue();
    textArea._editor.destroy();
    textArea._editor = null;
    textArea.style.display = 'block';

    const aceEditor =
      textArea.parentNode.querySelector('.ace-editor') ||
      textArea.closest('.form-group').querySelector('.ace-editor');
    aceEditor?.remove();
  });
}

/**
 * @domOrSelector String OR Selector for the DOM element.
 * IMPORTANT: Include proper symbol ('.' for class, '#' for id) in case of string.
 */
export function toggleMode(domOrSelector, isChecked) {
  const elements =
    typeof domOrSelector === 'string' ? document?.querySelectorAll(domOrSelector) : [domOrSelector];
  elements?.forEach((el) => {
    if (el?.tagName !== 'TEXTAREA') return; // Ensure it's a textarea

    // Initialize Ace Editor if not done yet
    if (!el?._editor) {
      setCodeEditor(`#${el.id}`);
    }

    let targetMode = null,
      targetClass = null,
      removeClass = null;

    if (isChecked) {
      targetMode = 'json';
      targetClass = 'json-editor';
      removeClass = 'text-editor';
    } else {
      targetMode = 'plain_text';
      targetClass = 'text-editor';
      removeClass = 'json-editor';
    }
    if (
      el?._editor &&
      el?._editor?.session &&
      typeof el?._editor?.session?.setMode === 'function'
    ) {
      el._editor.session.setMode(`ace/mode/${targetMode}`);
    }

    if (el?._editor && el?._editor.container && 'classList' in el?._editor.container) {
      el?._editor?.container?.classList?.add(targetClass);
      el?._editor?.container?.classList?.remove(removeClass);
    }

    if ('classList' in el) {
      el?.classList?.add(targetClass);
      el?.classList?.remove(removeClass);
    }
  });
}

export function setReadonlyMode(element, excludeClasses?) {
  // Convert the excludeClasses array to a selector string
  const excludeSelector = excludeClasses ? excludeClasses.map((cls) => `.${cls}`).join(',') : null;

  // Find all form elements within the element
  const formElements = element?.querySelectorAll('input, textarea, select, button, a');

  formElements?.forEach((el) => {
    // If the element matches the exclude selector, skip it
    if (excludeSelector && el.matches(excludeSelector)) return;

    const disabled = el?.hasAttribute('disabled');
    const readonly = el?.hasAttribute('readonly');
    // For elements that inherently cannot be readonly (like checkboxes, radios, and selects), disable them
    if (
      ['checkbox', 'radio', 'select-one', 'select-multiple'].includes(el.type) ||
      ['SELECT', 'BUTTON', 'A'].includes(el.tagName)
    ) {
      //remember previous state
      if (disabled) el.setAttribute('prev-disabled', '');
      el.setAttribute('disabled', '');
    }
    // For other input types, textarea, and button, set readonly or disable
    if (['INPUT', 'TEXTAREA'].includes(el.tagName)) {
      //remember previous state
      if (readonly) el.setAttribute('prev-readonly', '');
      el.setAttribute('readonly', '');
    }
  });
}

export function unsetReadonlyMode(element, excludeClasses?) {
  // Convert the excludeClasses array to a selector string
  const excludeSelector = excludeClasses ? excludeClasses.map((cls) => `.${cls}`).join(',') : null;

  // Find all form elements within the element
  const formElements = element?.querySelectorAll('input, textarea, select, button, a');

  formElements?.forEach((el) => {
    // If the element matches the exclude selector, skip it
    if (excludeSelector && el.matches(excludeSelector)) return;

    // For elements that inherently cannot be readonly (like checkboxes, radios, and selects), disable them
    if (
      ['checkbox', 'radio', 'select-one', 'select-multiple'].includes(el.type) ||
      ['SELECT', 'BUTTON', 'A'].includes(el.tagName)
    ) {
      //remember previous state
      const disabled = el.hasAttribute('disabled');
      const prevDisabled = el.hasAttribute('prev-disabled');

      el.removeAttribute('disabled');
      if (prevDisabled) el.setAttribute('disabled', '');

      el.removeAttribute('prev-disabled');

      // delete el.disabled;
      // el.removeAttribute('disabled');
      // if (el._previousDisabled === true) el.disabled = el._previousDisabled;
      // delete el._previousDisabled;
    }
    // For other input types, textarea, and button, set readonly or disable
    if (['INPUT', 'TEXTAREA'].includes(el.tagName)) {
      //remember previous state
      const readonly = el.hasAttribute('readonly');
      const prevReadonly = el.hasAttribute('prev-readonly');

      el.removeAttribute('readonly');
      if (prevReadonly) el.setAttribute('readonly', '');

      el.removeAttribute('prev-readonly');
    }
  });
}
