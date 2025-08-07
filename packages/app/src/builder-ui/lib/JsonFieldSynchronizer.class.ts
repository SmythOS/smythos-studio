/**
 * JsonFieldSynchronizer class handles synchronization between JSON data fields in the DOM.
 * It manages parent-child relationships between form fields and keeps their values in sync.
 *
 * @class JsonFieldSynchronizer
 *
 * @property {HTMLElement} wrapper - The root DOM element containing all synchronized fields
 * @property {Object} options - Configuration options for the synchronizer
 * @property {number} options.debounceDelay - Delay in ms before processing input changes
 * @property {string} options.mutatingClass - CSS class added to elements being updated
 * @property {string} options.mutatingWrapperClass - CSS class added to wrapper during mutations
 * @property {number} options.mutationDuration - Duration in ms that mutation classes remain
 * @property {string} options.jsonFieldClass - CSS class identifying JSON fields
 * @property {Map<HTMLElement, Object>} parentMap - Maps parent elements to their data and children
 * @property {Map<HTMLElement, string>} previousValues - Caches previous field values
 * @property {NodeJS.Timeout} blurTimeout - Timer for handling blur events
 */

export class JsonFieldSynchronizer {
  private wrapper: HTMLElement;
  private options: {
    debounceDelay: number;
    mutatingClass: string;
    mutatingWrapperClass: string;
    mutationDuration: number;
    jsonFieldClass: string;
  };
  private parentMap: Map<HTMLElement, any>;
  private previousValues: Map<HTMLElement, string>;
  private blurTimeout: NodeJS.Timeout;

  constructor(wrapperElement, options = {}) {
    this.wrapper = wrapperElement;
    this.options = {
      debounceDelay: 300,
      mutatingClass: 'mutating',
      mutatingWrapperClass: 'jfs_has_mutating',
      mutationDuration: 300,
      jsonFieldClass: 'jfs_json_field',
      ...options,
    };
    this.parentMap = new Map();
    this.previousValues = new Map();

    // Safe initialization
    this.initializeStructure();
    this.bindEvents();
  }

  initializeStructure() {
    // Use class selector instead of element type selector
    const parents = Array.from(
      this.wrapper.querySelectorAll(`.${this.options.jsonFieldClass}[data-expression]`),
    ).filter((el: HTMLElement) => !/[\.\[\]]/.test(el.dataset.expression)) as HTMLElement[];

    parents.forEach((parent) => {
      const expr = parent.dataset.expression;
      const children = this.findChildren(expr);
      const isArray = children.some((c) => c.path.includes('['));

      this.parentMap.set(parent, {
        data: isArray ? [] : {},
        children,
        isArray,
      });
    });
  }

  findChildren(parentExpr) {
    // Use class selector instead of element type selector
    return Array.from(
      this.wrapper.querySelectorAll(
        `.${this.options.jsonFieldClass}[data-expression^="${parentExpr}["], .${this.options.jsonFieldClass}[data-expression^="${parentExpr}."]`,
      ),
    ).map((child: HTMLElement) => ({
      element: child,
      path: child.dataset.expression.replace(parentExpr, ''),
    }));
  }

  bindEvents() {
    this.parentMap.forEach((config, parent) => {
      // Parent input handler with debounce
      let timeout;
      parent.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(
          () => this.handleParentUpdate(parent, config),
          this.options.debounceDelay,
        );
      });

      // Child input handlers
      config.children.forEach((child) => {
        child.element.addEventListener('input', () =>
          this.handleChildUpdate(parent, child, config),
        );

        // Add focus/blur handlers for child
        child.element.addEventListener('focus', () => this.handleFocus(child.element, parent));
        child.element.addEventListener('blur', () => this.handleBlur(child.element, parent));
      });

      // Add focus/blur handlers for parent
      parent.addEventListener('focus', () => this.handleFocus(parent, parent));
      parent.addEventListener('blur', () => this.handleBlur(parent, parent));
    });
  }

  handleParentUpdate(parent, config) {
    const rawValue = parent.value?.trim() || '';
    try {
      let parsed;
      let structureValid = true;

      // Check if existing data matches expected structure
      if (config.data) {
        if (config.isArray && !Array.isArray(config.data)) {
          structureValid = false;
        }
        if (!config.isArray && typeof config.data !== 'object') {
          structureValid = false;
        }
      }

      if (!structureValid) {
        // Reset data structure if type mismatch
        config.data = config.isArray ? [] : {};
      }

      if (rawValue) {
        try {
          // First try standard JSON.parse for properly quoted JSON
          parsed = JSON.parse(rawValue);
        } catch (e) {
          // If JSON parse fails, use a safer approach to evaluate JS object notation
          try {
            // Use a safer approach that handles both objects and arrays with JS notation
            const safeEval = (code) => {
              try {
                // First try to parse directly with JSON
                return JSON.parse(code);
              } catch (e) {
                // If that fails, try to handle JS object notation
                try {
                  // First, validate balanced quotes and brackets
                  const isValid = validateSyntax(code);
                  if (!isValid) {
                    // If syntax is invalid, return default value
                    return code.startsWith('[') ? [] : {};
                  }

                  // Step 1: Convert single-quoted strings to double-quoted strings
                  // Replace single quotes with double quotes, but not inside already double-quoted strings
                  let processedCode = code;

                  // First replace all escaped double quotes temporarily
                  processedCode = processedCode.replace(/\\"/g, '___ESCAPED_DOUBLE_QUOTE___');

                  // Then handle single quotes outside of double-quoted strings
                  let inDoubleQuotes = false;
                  let inSingleQuotes = false;
                  let result = '';

                  for (let i = 0; i < processedCode.length; i++) {
                    const char = processedCode[i];

                    if (char === '"' && (i === 0 || processedCode[i - 1] !== '\\')) {
                      if (!inSingleQuotes) {
                        inDoubleQuotes = !inDoubleQuotes;
                      }
                      result += char;
                    } else if (char === "'" && (i === 0 || processedCode[i - 1] !== '\\')) {
                      if (!inDoubleQuotes) {
                        inSingleQuotes = !inSingleQuotes;
                        // Replace single quotes with double quotes when not inside double quotes
                        result += '"';
                      } else {
                        // Keep single quotes inside double quotes
                        result += char;
                      }
                    } else {
                      result += char;
                    }
                  }

                  // Restore escaped double quotes
                  processedCode = result.replace(/___ESCAPED_DOUBLE_QUOTE___/g, '\\"');

                  // Step 2: Quote unquoted property names
                  // This regex works for both direct objects and objects inside arrays
                  const jsonified = processedCode.replace(/({|\[|\,)\s*?(\w+)\s*?:/g, '$1"$2":');

                  // Try to parse the fixed JSON
                  return JSON.parse(jsonified);
                } catch (err) {
                  // Return default object/array based on input
                  return code.startsWith('[') ? [] : {};
                }
              }
            };

            // Add a function to validate balanced quotes and brackets
            const validateSyntax = (code) => {
              // Check for balanced quotes
              let inDoubleQuotes = false;
              let inSingleQuotes = false;
              let stack = [];

              for (let i = 0; i < code.length; i++) {
                const char = code[i];
                const prev = i > 0 ? code[i - 1] : '';

                // Handle quotes
                if (char === '"' && prev !== '\\') {
                  if (!inSingleQuotes) {
                    inDoubleQuotes = !inDoubleQuotes;
                  }
                } else if (char === "'" && prev !== '\\') {
                  if (!inDoubleQuotes) {
                    inSingleQuotes = !inSingleQuotes;
                  }
                }

                // Skip brackets inside quotes
                if (inDoubleQuotes || inSingleQuotes) continue;

                // Handle brackets
                if (char === '{' || char === '[') {
                  stack.push(char);
                } else if (char === '}') {
                  if (stack.length === 0 || stack.pop() !== '{') {
                    return false;
                  }
                } else if (char === ']') {
                  if (stack.length === 0 || stack.pop() !== '[') {
                    return false;
                  }
                }
              }

              // Check if we have unclosed quotes or brackets
              return !inDoubleQuotes && !inSingleQuotes && stack.length === 0;
            };

            parsed = safeEval(rawValue);
          } catch (e2) {
            // Silent fail and use defaults
            parsed = config.isArray ? [] : {};
          }
        }
      } else {
        parsed = config.isArray ? [] : {};
      }

      // Store the original value
      config.data = parsed;

      // If parent is a primitive (string, number, boolean), clear all child fields
      if (typeof parsed !== 'object' || parsed === null) {
        config.children.forEach((child) => {
          child.element.value = '';
        });
      } else {
        // Otherwise update children normally
        this.updateChildren(config, parent);
      }

      // Mark parent as mutating
      parent.classList.add(this.options.mutatingClass);
      this.wrapper.classList.add(this.options.mutatingWrapperClass);
    } catch (error) {
      // Reset data structure to empty when invalid
      config.data = config.isArray ? [] : {};

      config.children.forEach((child) => {
        child.element.value = '';
      });
    }
  }

  handleChildUpdate(parent, child, config) {
    let rawValue = child.element.value?.trim() || '';
    try {
      // Attempt to preserve existing parent data if valid
      let parentData;
      try {
        parentData = JSON.parse(parent.value);
        if (config.isArray && !Array.isArray(parentData)) {
          throw new Error('Parent data structure mismatch');
        }
        if (!config.isArray && typeof parentData !== 'object') {
          throw new Error('Parent data structure mismatch');
        }
      } catch {
        // Reset to empty structure if invalid
        parentData = config.isArray ? [] : {};
      }

      config.data = parentData;
      const path = this.parsePath(child.path, config.isArray);

      // Clear previous mutations
      this.clearAllMutations();

      // Mark elements
      parent.classList.add(this.options.mutatingClass);
      child.element.classList.add(this.options.mutatingClass);
      this.wrapper.classList.add(this.options.mutatingWrapperClass);

      // IMPROVED APPROACH: Safely evaluate JS objects without using invalid parameter names
      let processedValue = rawValue;

      if (
        rawValue &&
        ((rawValue.startsWith('{') && rawValue.endsWith('}')) ||
          (rawValue.startsWith('[') && rawValue.endsWith(']')))
      ) {
        try {
          // First try standard JSON.parse for properly quoted JSON
          processedValue = JSON.parse(rawValue);
        } catch (e) {
          // If JSON parse fails, use safer approach to evaluate JS object notation
          try {
            // Use a safer approach that handles both objects and arrays with JS notation
            const safeEval = (code) => {
              try {
                // First try to parse directly with JSON
                return JSON.parse(code);
              } catch (e) {
                // If that fails, try to handle JS object notation
                try {
                  // Step 1: Convert single-quoted strings to double-quoted strings
                  // Replace single quotes with double quotes, but not inside already double-quoted strings
                  let processedCode = code;

                  // First replace all escaped double quotes temporarily
                  processedCode = processedCode.replace(/\\"/g, '___ESCAPED_DOUBLE_QUOTE___');

                  // Then handle single quotes outside of double-quoted strings
                  let inDoubleQuotes = false;
                  let inSingleQuotes = false;
                  let result = '';

                  for (let i = 0; i < processedCode.length; i++) {
                    const char = processedCode[i];
                    const nextChar = processedCode[i + 1] || '';

                    if (char === '"' && (i === 0 || processedCode[i - 1] !== '\\')) {
                      if (!inSingleQuotes) {
                        inDoubleQuotes = !inDoubleQuotes;
                      }
                      result += char;
                    } else if (char === "'" && (i === 0 || processedCode[i - 1] !== '\\')) {
                      if (!inDoubleQuotes) {
                        inSingleQuotes = !inSingleQuotes;
                        // Replace single quotes with double quotes when not inside double quotes
                        result += '"';
                      } else {
                        // Keep single quotes inside double quotes
                        result += char;
                      }
                    } else {
                      result += char;
                    }
                  }

                  // Restore escaped double quotes
                  processedCode = result.replace(/___ESCAPED_DOUBLE_QUOTE___/g, '\\"');

                  // Step 2: Quote unquoted property names
                  // This regex works for both direct objects and objects inside arrays
                  const jsonified = processedCode.replace(/({|\[|\,)\s*?(\w+)\s*?:/g, '$1"$2":');

                  // Try to parse the fixed JSON
                  return JSON.parse(jsonified);
                } catch (err) {
                  // Return original code on failure
                  return code;
                }
              }
            };

            processedValue = safeEval(rawValue);
          } catch (e2) {
            // Keep as string if evaluation fails
          }
        }
      }

      // Update the value in the data structure
      this.updateValue(config.data, path, processedValue);

      // Important: Update parent textarea with stringified result
      parent.value = JSON.stringify(config.data, null, 2);

      // Store the processed value for future comparison
      if (typeof processedValue === 'object' && processedValue !== null) {
        this.previousValues.set(child.element, JSON.stringify(processedValue));
      } else {
        this.previousValues.set(child.element, String(processedValue));
      }

      // Clear mutations after timeout
      setTimeout(() => this.clearAllMutations(), this.options.mutationDuration);
    } catch (error) {
      // Don't show errors to user, just silently reset
    }
  }

  updateValue(data, path, value) {
    if (path.isArray) {
      // Handle multiple array indices
      let target = data;

      // Navigate through each array index except the last one
      for (let i = 0; i < path.indices.length - 1; i++) {
        const index = path.indices[i];

        // Ensure array exists at this level
        while (target.length <= index) {
          target.push(i === path.indices.length - 2 ? [] : {});
        }

        // If the next level doesn't exist or isn't an array, create it
        if (!Array.isArray(target[index])) {
          target[index] = [];
        }

        // Move to the next level
        target = target[index];
      }

      // Get the last index
      const lastIndex = path.indices[path.indices.length - 1];

      // Ensure the array is big enough
      while (target.length <= lastIndex) {
        target.push({});
      }

      if (path.props.length > 0) {
        // If there are property names after the indices
        let targetObject = target[lastIndex];

        // Ensure path to the final property exists
        for (let i = 0; i < path.props.length - 1; i++) {
          const prop = path.props[i];
          if (!targetObject[prop] || typeof targetObject[prop] !== 'object') {
            targetObject[prop] = {};
          }
          targetObject = targetObject[prop];
        }

        // Set the final property
        targetObject[path.props[path.props.length - 1]] = value;
      } else {
        // If no props, replace the array element directly
        target[lastIndex] = value;
      }
    } else {
      // Object path handling
      let target = data;

      // For deep paths, ensure each level exists
      if (path.props.length > 0) {
        path.props.slice(0, -1).forEach((prop) => {
          if (!target[prop] || typeof target[prop] !== 'object') {
            target[prop] = {};
          }
          target = target[prop];
        });

        // Set the final property
        target[path.props[path.props.length - 1]] = value;
      }
    }
  }

  parsePath(path, isArray) {
    // Match all array indices in the path
    const indices = [...path.matchAll(/\[(\d+)\]/g)].map((match) => parseInt(match[1]));

    if (indices.length > 0) {
      // Get the remaining path after all array indices
      const remainingPath = path.replace(/\[\d+\]/g, '').replace(/^\./, '');
      const props = remainingPath ? remainingPath.split('.').filter(Boolean) : [];

      return {
        isArray: true,
        indices, // Now we store all indices as an array
        props,
      };
    }

    return {
      isArray: false,
      props: path.replace(/^\./, '').split('.').filter(Boolean),
    };
  }

  updateChildren(config, parent) {
    // Clear all mutation states first
    this.clearAllMutations();

    // Skip if parent data is primitive
    if (typeof config.data !== 'object' || config.data === null) {
      config.children.forEach((child) => {
        child.element.value = '';
      });
      return;
    }

    // Track which children actually changed
    let anyChildChanged = false;

    // Check each child
    config.children.forEach((child) => {
      try {
        const path = this.parsePath(child.path, config.isArray);
        const previousValue = this.previousValues.get(child.element) || '';
        const newValue = this.getValue(config.data, path);

        // Compare values consistently - handle object comparisons properly
        let valueHasChanged = false;

        if (newValue.startsWith('{') || newValue.startsWith('[')) {
          try {
            // For object/array values, compare their parsed JSON equivalents
            const parsedPrev = previousValue ? JSON.parse(previousValue) : null;
            const parsedNew = newValue ? JSON.parse(newValue) : null;
            valueHasChanged = JSON.stringify(parsedPrev) !== JSON.stringify(parsedNew);
          } catch {
            // Fallback to string comparison if parsing fails
            valueHasChanged = newValue !== previousValue;
          }
        } else {
          valueHasChanged = newValue !== previousValue;
        }

        // Only mark as mutating if value actually changes
        if (valueHasChanged) {
          child.element.classList.add(this.options.mutatingClass);
          anyChildChanged = true;
          this.previousValues.set(child.element, newValue);
        }

        child.element.value = newValue;
      } catch (error) {
        console.error('Child update error:', error);
        child.element.value = '';
      }
    });

    // Only mark parent as mutating if any child changed
    if (anyChildChanged) {
      parent.classList.add(this.options.mutatingClass);
      this.wrapper.classList.add(this.options.mutatingWrapperClass);

      // Clear mutations after timeout
      setTimeout(() => this.clearAllMutations(), this.options.mutationDuration);
    }
  }

  getValue(data, path) {
    // Initial validation
    if (!data || typeof data !== 'object') return '';

    let current = data;

    if (path.isArray) {
      // Handle multiple array indices
      for (const index of path.indices) {
        // Check array validity
        if (!Array.isArray(current)) return '';

        // Check index bounds
        if (index >= current.length) return '';

        // Get the array element
        current = current[index];
      }

      // Handle properties after array indices
      for (const prop of path.props) {
        if (!current || typeof current !== 'object') return '';

        // Access the property
        current = current[prop];

        // If we reached undefined
        if (current === undefined) return '';
      }

      return this.formatValueForDisplay(current);
    } else {
      // Handle object properties
      for (let i = 0; i < path.props.length; i++) {
        const prop = path.props[i];
        if (!current || typeof current !== 'object') return '';

        // Access the property
        current = current[prop];

        // If we reached the end of our path or found undefined
        if (current === undefined) return '';
      }

      return this.formatValueForDisplay(current);
    }
  }

  formatValueForDisplay(value) {
    if (value === null || value === undefined) return '';

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  handleFocus(element, parent) {
    clearTimeout(this.blurTimeout);
    this.wrapper.classList.add('jfs_has_focused');

    // Clear all previous focused states
    this.wrapper.querySelectorAll('.focused').forEach((el) => el.classList.remove('focused'));

    // Add focused class to directly connected pair
    element.classList.add('focused');
    if (element === parent) {
      // When focusing parent, highlight all children
      this.parentMap.get(parent).children.forEach((c) => c.element.classList.add('focused'));
    } else {
      // When focusing child, highlight only its parent
      parent.classList.add('focused');
    }
  }

  handleBlur(element, parent) {
    this.blurTimeout = setTimeout(() => {
      // Only remove focus if no element in the group has focus
      const group = [parent, ...this.parentMap.get(parent).children.map((c) => c.element)];
      if (!group.some((el) => el.matches(':focus'))) {
        group.forEach((el) => el.classList.remove('focused'));
        if (!this.wrapper.querySelector('.focused')) {
          this.wrapper.classList.remove('jfs_has_focused');
        }
      }
    }, 50);
  }

  clearAllMutations() {
    this.wrapper
      .querySelectorAll(`.${this.options.mutatingClass}`)
      .forEach((el) => el.classList.remove(this.options.mutatingClass));
    this.wrapper.classList.remove(this.options.mutatingWrapperClass);
  }
}
