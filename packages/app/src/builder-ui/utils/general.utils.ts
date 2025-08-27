import { jsonrepair } from 'jsonrepair';

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function uid() {
  return (Date.now() + Math.random()).toString(36).replace('.', '').toUpperCase();
}

export function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
export function isValidJson(str: string): boolean {
  if (!str) return false;

  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export function getUrlParams(url: string): Record<string, string> {
  if (!url) return {};

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    let allParams = {};

    for (const [key, value] of params) {
      allParams[key] = value;
    }

    return allParams;
  } catch {
    console.warn('Invalid URL', url);
    return {};
  }
}

export const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

export function injectScript(url, selector = null, callback?) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;

  // Optional: Call a callback function once the script is loaded
  if (typeof callback === 'function') {
    script.onload = () => callback(null);
    script.onerror = (error) => callback(error);
  }
  let parent = document.head;
  if (selector) parent = document.querySelector(selector);
  parent.appendChild(script);
}

export const kebabToCapitalize = (input) => {
  if (!input || typeof input !== 'string') return input;

  return input
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const isURL = (str: string): boolean => {
  // This regex checks for protocol, hostname, domain, port (optional), path (optional), and query string (optional)
  const regex = /^(https?:\/\/)([^\s.]+\.[^\s]{2,})(:[0-9]{1,5})?(\/[^\s]*)?(\?[^\s]*)?$/i;
  return regex.test(str);
};

export const getLinkHeader = (linkHeader: string): Record<string, string> => {
  if (!linkHeader) return {};

  const links = {};
  const linkArray = linkHeader.split(',');

  linkArray.forEach((link) => {
    const parts = link.split(';');
    const url = parts[0].trim().slice(1, -1); // Removing angle brackets around the URL
    const rel = parts[1].trim().split('=')[1].slice(1, -1); // Removing quotes around the relation

    links[rel] = url;
  });

  return links;
};

export interface LocalStorageArrayRetriever {
  get: (childKey: string) => any;
  set: (childKey: string, value: any) => void;
  remove: (childKey: string) => void;
}
export const createLocalStorageArrayRetriever = (parentKey: string): LocalStorageArrayRetriever => {
  return {
    get(childKey: string) {
      const parent = localStorage.getItem(parentKey);

      if (!parent) return null;

      const parsed = JSON.parse(parent);

      return parsed[childKey] || null;
    },
    set(childKey: string, value: any) {
      const parent = localStorage.getItem(parentKey);

      if (!parent) {
        const newParent = { [childKey]: value };
        localStorage.setItem(parentKey, JSON.stringify(newParent));
      } else {
        const parsed = JSON.parse(parent);
        parsed[childKey] = value;
        localStorage.setItem(parentKey, JSON.stringify(parsed));
      }
    },

    remove(childKey: string) {
      const parent = localStorage.getItem(parentKey);

      if (!parent) return;

      const parsed = JSON.parse(parent);
      delete parsed[childKey];
      localStorage.setItem(parentKey, JSON.stringify(parsed));
    },
  };
};

type ChangeCallback<T> = (target: T) => void;

export class ChangeObserver<T extends object> {
  static create<T extends object>(target: T, onChange: ChangeCallback<T>): T {
    return new Proxy(target, {
      set: (target: T, property: PropertyKey, value: any, receiver: any): boolean => {
        // Reflect.set ensures the property is set correctly
        const result = Reflect.set(target, property, value, receiver);

        // Call the onChange callback
        onChange(target);

        // Return the result of the Reflect.set operation
        return result;
      },
    });
  }
}

export const createSpinner = (color = 'white', classes = '') => {
  const spinner = document.createElement('span');
  spinner.className = `${color} smyth-spinner smyth-spinner-sm ml-1${classes ? ' ' + classes : ''}`;
  spinner.setAttribute('data-role', 'btn-icon');
  spinner.style.marginTop = '-2px';

  return spinner;
};

export const createTypingLoader = (
  text,
  {
    color = 'dark',
    animationName = 'typewriter-140px',
    textClasses = 'smyth-typing-text',
    duration = 1000 /* in milliseconds */,
  } = {},
) => {
  const loader = document.createElement('div');
  loader.className = 'smyth-typing-loader';
  loader.style.animation = `${animationName} ${duration}ms steps(${
    text?.length || 0
  }) infinite alternate,
    blink-${color} ${duration / 2}ms steps(${text?.length || 0}) infinite`;

  const loaderText = document.createElement('span');
  loaderText.className = `${textClasses ? ' ' + textClasses : ''}`;
  loaderText.textContent = text;

  loader.appendChild(loaderText);

  return loader;
};

export const getSelectedText = (fieldElm: HTMLInputElement | HTMLTextAreaElement) => {
  const selectedText = fieldElm.value.substring(fieldElm.selectionStart, fieldElm.selectionEnd);
  return selectedText;
};

export function isTemplateVariable(str: string = ''): boolean {
  if (!str || typeof str !== 'string') return false;

  const pattern = /{{(.*?)}}/;

  const match = str.match(pattern);

  if (!match) return false;

  return true;
}

export function isKeyTemplateVar(str: string = ''): boolean {
  if (!str || typeof str !== 'string') return false;
  return (str?.match(/{{KEY\((.*?)\)}}/g) ?? []).length > 0;
}

export function getFileCategory(mimetype: string): string {
  if (!mimetype) return 'unknown';

  // Categorize based on the start of the MIME type
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('audio/')) {
    return 'audio';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype.startsWith('text/')) {
    return 'text';
  } else if (mimetype.startsWith('application/')) {
    // Might need more refined checking for applications
    return mimetype.split('/')[1];
  } else {
    return 'other';
  }
}

export const generateAgentTemplateId = (agentName: string): string => {
  let cleanedName = agentName
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');

  if (cleanedName?.length > 50) cleanedName = cleanedName.slice(0, 50);

  return `${cleanedName}-${uid()}`.toLowerCase();
};

export function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();

  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'xml':
      return 'SITEMAP';
    case 'html':
    case 'htm':
    case 'txt':
      return 'WEBPAGE';
    case 'doc':
    case 'docx':
      return 'WORD';
    default:
      return null;
  }
}

/**
 * Ensures a valid JSON string, repairing if necessary.
 * @param input The input string to validate or repair.
 * @returns The original input if valid JSON, a repaired JSON string if possible, or the original input.
 */
export function ensureValidJsonString(input: string): string {
  if (!input) return input;

  if (typeof input === 'object') {
    return JSON.stringify(input, null, 2);
  }

  const tryParse = (str: string): string | false => {
    try {
      const parsedJson = JSON.parse(str);
      return JSON.stringify(parsedJson, null, 2); // pretty print
    } catch {
      return false;
    }
  };

  const parsedJson = tryParse(input);
  if (parsedJson) return parsedJson;

  try {
    const repairedJson = jsonrepair(input);
    const parsedJson = tryParse(repairedJson);
    return parsedJson ? parsedJson : input;
  } catch {
    return input;
  }
}

/**
 * Fetches the MIME type of a resource from its URL.
 * @param resourceUrl The URL of the resource to check.
 * @returns A promise that resolves to an object containing the MIME type or an error.
 */
export async function getMimeTypeFromUrl(resourceUrl: string): Promise<string> {
  try {
    const response = await fetch(resourceUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');

    if (!contentType) {
      return '';
    }

    // Extract the MIME type without charset information
    const mimetype = contentType.split(';')[0].trim();

    return mimetype;
  } catch (error) {
    console.warn('Error getting MIME type from URL', error);

    return '';
  }
}

export async function renderDropdown(targetElm: HTMLElement, dropdownElm: HTMLElement) {
  // Initial setup with basic positioning
  dropdownElm.style.cssText = `
    position: fixed;
    z-index: 1000;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    max-height: 300px;
    overflow-y: auto;
    right: auto;
    visibility: hidden; // Hide initially to prevent flicker
  `;

  // delay to ensure proper positioning
  await delay(10);

  // Function to position the dropdown
  const targetRect = targetElm.getBoundingClientRect();
  const dropdownRect = dropdownElm.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  let top = targetRect.bottom;
  let left = targetRect.right - dropdownRect.width;

  // Viewport boundary checks
  if (left + dropdownRect.width > viewportWidth - 5) {
    left = viewportWidth - dropdownRect.width - 5;
  }
  if (left < 5) {
    left = 5;
  }
  if (top + dropdownRect.height > viewportHeight - 5) {
    top = targetRect.top - dropdownRect.height;
  }
  top = Math.max(5, top);

  dropdownElm.style.top = `${top}px`;
  dropdownElm.style.left = `${left + 2}px`;
  dropdownElm.style.visibility = 'visible';

  document.body.appendChild(dropdownElm);

  // show overlay to avoid scrolling of the parent element
  const overlay = document.createElement('div');
  overlay.setAttribute('data-role', 'dropdown-overlay');
  overlay.classList.add('fixed', 'top-0', 'left-0', 'w-full', 'h-full', 'z-[500]');

  document.body.appendChild(overlay);

  overlay.addEventListener('click', () => {
    overlay.remove();
  });

  dropdownElm.addEventListener('click', () => {
    overlay.remove();
  });

  dropdownElm.classList.remove('invisible');
  dropdownElm.classList.add('visible');
}

export const safe = (fn: () => void, name: string) => {
  try {
    fn();
  } catch (err) {
    console.error(`[${name}] failed:`, err);
  }
};
