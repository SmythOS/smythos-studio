import { Tooltip } from 'flowbite-react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { delay } from '../../utils';

declare var Metro;

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

export const createTextArea = ({
  value = '',
  fieldCls = '',
  autoSize = true,
}): HTMLTextAreaElement => {
  const textarea = document.createElement('textarea');
  textarea.setAttribute('data-role', 'textarea');
  textarea.innerHTML = value;
  textarea.classList.add('form-control');

  if (fieldCls) {
    textarea.setAttribute('data-cls-textarea', fieldCls);
  }

  textarea.setAttribute('data-auto-size', `${autoSize}`);

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

  // Render the Tooltip component
  const root = createRoot(tooltipContainer);
  root.render(
    React.createElement(
      Tooltip,
      {
        content: React.createElement('div', {
          dangerouslySetInnerHTML: { __html: text },
        }),
        placement: position as any,
        className:
          clsHint + ' whitespace-normal text-xs ' + (tooltipClasses || (hasLinks ? `min-w-52 max-w-96` : `w-${estimatedWidth}`)) + ' [&_a]:whitespace-nowrap [&_a]:inline-block',
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
    'checked:before:bg-blue-200 before:translate-x-0 checked:before:translate-x-full',
    'before:rounded-full before:shadow before:transform before:ring-0',
    'before:transition before:ease-in-out before:duration-200 before:mt-[1px]',
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

export function createHint(text: string) {
  const elm = document.createElement('small');
  elm.classList.add('field-hint');
  elm.innerHTML = text;

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
