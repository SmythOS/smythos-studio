/**
 * Creates a simple, user-friendly multi-select with checkboxes and visual chips
 * This uses native HTML5 elements without Metro UI
 * Features:
 * - Search input to filter options
 * - Checkboxes for easy selection (simple click, no Ctrl/Cmd needed)
 * - Visual chips showing selected items
 * - Hidden select element for form compatibility
 * @param options - Array of option objects with text and value properties
 * @param value - Array of selected values
 * @param dropdownHeight - Optional height for the options list in pixels
 * @returns HTMLDivElement containing the complete multi-select UI
 */
export const createMultiSelectBox = (
  options: Array<{ value: string; text: string }> | any,
  value: string[],
  dropdownHeight?: number,
): HTMLDivElement => {
  /**
   * Main container - position relative for absolute positioning of dropdown
   */
  const container = document.createElement('div');
  container.classList.add('multi-select-container');
  container.style.cssText = 'display: flex; flex-direction: column; gap: 8px; position: relative;';

  /**
   * Selected items display area (chips/tags) with caret
   */
  const selectedChipsWrapper = document.createElement('div');
  selectedChipsWrapper.style.cssText = 'position: relative; display: flex; align-items: center;';

  const selectedChips = document.createElement('div');
  selectedChips.classList.add('multi-select-chips');
  selectedChips.style.cssText =
    'display: flex; flex-wrap: wrap; gap: 6px; min-height: 36px; padding: 6px 32px 6px 6px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb; flex: 1; cursor: pointer; transition: background-color 0.15s ease;';
  selectedChips.innerHTML =
    '<span style="color: #9ca3af; font-size: 14px;">No items selected</span>';

  /**
   * Add hover effect to chips area
   */
  selectedChips.addEventListener('mouseenter', () => {
    selectedChips.style.backgroundColor = '#f3f4f6';
  });
  selectedChips.addEventListener('mouseleave', () => {
    selectedChips.style.backgroundColor = '#f9fafb';
  });

  /**
   * Caret/dropdown icon (inside selected chips area)
   */
  const caretIcon = document.createElement('span');
  caretIcon.classList.add('multi-select-caret');
  caretIcon.innerHTML = '▼';
  caretIcon.style.cssText =
    'position: absolute; right: 10px; font-size: 12px; color: #6b7280; pointer-events: none; transition: transform 0.2s ease;';

  /**
   * Dropdown wrapper - contains search input and options list
   * Positioned absolutely to float over other content
   */
  const dropdownWrapper = document.createElement('div');
  dropdownWrapper.classList.add('multi-select-dropdown');
  dropdownWrapper.style.cssText =
    'position: absolute; top: 100%; left: 0; right: 0; z-index: 1000; margin-top: 4px; display: none; flex-direction: column; gap: 8px; background: white; border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); padding: 8px;';

  /**
   * Search input for filtering options
   */
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search options...';
  searchInput.classList.add('multi-select-search', 'form-control');
  searchInput.style.cssText =
    'padding: 8px; border-radius: 6px; border: 1px solid #d1d5db; width: 100%;';

  /**
   * Options list container with checkboxes
   */
  const optionsList = document.createElement('div');
  optionsList.classList.add('multi-select-options');
  const height = dropdownHeight || 200;
  optionsList.style.cssText = `max-height: ${height}px; overflow-y: auto; border-radius: 6px; background: white;`;

  /**
   * Hidden select element for form compatibility
   * This stores the actual selected values for form submission
   */
  const hiddenSelect = document.createElement('select');
  hiddenSelect.setAttribute('multiple', 'multiple');
  hiddenSelect.style.display = 'none';
  hiddenSelect.classList.add('multi-select-native');

  /**
   * Store all options and selected values
   */
  let allOptions: Array<{ value: string; text: string }> = [];
  const selectedValues = new Set<string>(Array.isArray(value) ? value : []);

  /**
   * Create a chip element for a selected item
   */
  const createChip = (optionValue: string, optionText: string): HTMLElement => {
    const chip = document.createElement('span');
    chip.style.cssText =
      'display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #3b82f6; color: white; border-radius: 4px; font-size: 14px;';
    chip.innerHTML = `
      ${optionText}
      <button type="button" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; line-height: 1; padding: 0; margin-left: 4px;" data-value="${optionValue}">&times;</button>
    `;

    // Remove chip on click
    const removeBtn = chip.querySelector('button') as HTMLButtonElement;
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const val = removeBtn.getAttribute('data-value');
      if (val) {
        selectedValues.delete(val);
        updateUI();
        // Trigger change event
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    return chip;
  };

  /**
   * Update the UI based on selected values
   */
  const updateUI = (): void => {
    // Update chips display
    selectedChips.innerHTML = '';
    if (selectedValues.size === 0) {
      selectedChips.innerHTML =
        '<span style="color: #9ca3af; font-size: 14px;">No items selected</span>';
    } else {
      selectedValues.forEach((val) => {
        const option = allOptions.find((opt) => opt.value === val);
        if (option) {
          selectedChips.appendChild(createChip(option.value, option.text));
        }
      });
    }

    // Update hidden select
    hiddenSelect.innerHTML = '';
    selectedValues.forEach((val) => {
      const option = document.createElement('option');
      option.value = val;
      option.selected = true;
      hiddenSelect.appendChild(option);
    });

    // Update checkmark icons in the options list
    const optionItems = optionsList.querySelectorAll('[data-value]');
    optionItems.forEach((item) => {
      const value = item.getAttribute('data-value');
      const checkmark = item.querySelector('.checkmark-icon') as HTMLElement;
      if (checkmark && value) {
        checkmark.style.display = selectedValues.has(value) ? 'inline-block' : 'none';
      }
    });
  };

  /**
   * Create option element with checkmark icon
   */
  const createOptionElement = (option: { value: string; text: string }): HTMLElement => {
    const isSelected = selectedValues.has(option.value);

    const label = document.createElement('div');
    label.style.cssText =
      'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; user-select: none; border-bottom: 1px solid #f3f4f6;';
    label.setAttribute('data-value', option.value);

    label.innerHTML = `
      <span style="font-size: 14px;">${option.text}</span>
      <span class="checkmark-icon" style="font-size: 18px; color: #10b981; font-weight: bold; display: ${isSelected ? 'inline-block' : 'none'};">✓</span>
    `;

    // Handle click to toggle selection
    label.addEventListener('click', () => {
      const value = label.getAttribute('data-value');
      if (!value) return;

      const checkmark = label.querySelector('.checkmark-icon') as HTMLElement;

      if (selectedValues.has(value)) {
        selectedValues.delete(value);
        checkmark.style.display = 'none';
      } else {
        selectedValues.add(value);
        checkmark.style.display = 'inline-block';
      }

      updateUI();
      // Trigger change event on hidden select
      hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Hover effect
    label.addEventListener('mouseenter', () => {
      label.style.background = '#f3f4f6';
    });
    label.addEventListener('mouseleave', () => {
      label.style.background = 'white';
    });

    return label;
  };

  /**
   * Populate options list with optional filtering
   */
  const populateOptions = (filterText: string = ''): void => {
    optionsList.innerHTML = '';

    const filtered = filterText
      ? allOptions.filter(
          (option) =>
            option.text.toLowerCase().includes(filterText.toLowerCase()) ||
            option.value.toLowerCase().includes(filterText.toLowerCase()),
        )
      : allOptions;

    if (filtered.length === 0) {
      optionsList.innerHTML =
        '<div style="padding: 12px; text-align: center; color: #9ca3af;">No options found</div>';
    } else {
      filtered.forEach((option) => {
        optionsList.appendChild(createOptionElement(option));
      });
    }
  };

  /**
   * Toggle dropdown visibility
   */
  let isOpen = false;
  const toggleDropdown = (): void => {
    isOpen = !isOpen;
    dropdownWrapper.style.display = isOpen ? 'flex' : 'none';
    caretIcon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';

    // Focus search input when opening
    if (isOpen) {
      setTimeout(() => searchInput.focus(), 100);
    } else {
      searchInput.value = '';
      populateOptions('');
    }
  };

  /**
   * Set up selected chips click handler to toggle dropdown
   */
  selectedChips.addEventListener('click', (e) => {
    // Don't toggle if clicking on remove button
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    e.stopPropagation();
    toggleDropdown();
  });

  /**
   * Set up search input for filtering
   */
  searchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    populateOptions(target.value);
  });

  /**
   * Prevent closing when clicking on search input
   */
  searchInput.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  /**
   * Close dropdown when clicking outside
   */
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target as Node) && isOpen) {
      toggleDropdown();
    }
  });

  /**
   * Handle async or sync options
   */
  if (typeof options === 'function') {
    setTimeout(() => {
      const formBox = container.closest('.form-box');
      if (formBox) formBox.classList.add('loading');
    }, 300);

    options().then((data: Array<{ value: string; text: string }>) => {
      allOptions = data;
      populateOptions();
      updateUI();

      const formBox = container.closest('.form-box');
      if (formBox) {
        setTimeout(() => {
          formBox.classList.remove('loading');
        }, 300);
      }
    });
  } else {
    allOptions = options;
    populateOptions();
    updateUI();
  }

  /**
   * Assemble the selected chips wrapper
   */
  selectedChipsWrapper.appendChild(selectedChips);
  selectedChipsWrapper.appendChild(caretIcon);

  /**
   * Assemble the dropdown wrapper (floating)
   */
  dropdownWrapper.appendChild(searchInput);
  dropdownWrapper.appendChild(optionsList);

  /**
   * Assemble the container
   */
  container.appendChild(selectedChipsWrapper);
  container.appendChild(dropdownWrapper);
  container.appendChild(hiddenSelect);

  /**
   * Store reference to the hidden select element for form handling
   */
  (container as any)._selectElement = hiddenSelect;

  return container;
};
