/**
 * Generic dynamic header management with responsive behavior
 * Automatically handles tab overflow, dropdown menus, and resize events
 */

/**
 * Configuration for a single header/tab
 */
export interface HeaderConfig {
  id: string; // Unique identifier
  label: string; // Display text
  order: number; // Hierarchy position for sorting
  selected?: boolean; // Initial selected state
  className?: string; // Optional custom classes
  onClick?: (id: string) => void | Promise<void>; // Click handler
}

/**
 * Options for initializing DynamicHeaders
 */
export interface DynamicHeadersOptions {
  containerSelector: string; // Parent container (e.g., '.tab-container')
  navSelector: string; // Nav element selector
  headers: HeaderConfig[]; // Header configurations
  onResize?: () => void; // Callback on resize
  onSelectionChange?: (selectedId: string) => void; // Callback when selection changes
  moreButtonId?: string; // Custom more button ID (default: 'dynamic-header-more-button')
  dropdownId?: string; // Custom dropdown ID (default: 'dynamic-header-dropdown-menu')
  headerAttribute?: string; // Custom data attribute for header identification (default: 'data-header-id')
}

/**
 * Gets or creates UI elements (more button and dropdown)
 */
function getOrCreateUIElements(
  nav: HTMLElement,
  tabContainer: HTMLElement,
  moreButtonId: string,
  dropdownId: string,
): { moreButton: HTMLElement; dropdownMenu: HTMLElement } {
  // Clean up duplicate buttons
  Array.from(nav.querySelectorAll(`#${moreButtonId}`))
    .slice(1)
    .forEach((btn) => btn.remove());

  let moreButton = nav.querySelector(`#${moreButtonId}`) as HTMLElement;
  if (!moreButton) {
    moreButton = document.createElement('button');
    moreButton.id = moreButtonId;
    moreButton.className =
      'hidden absolute inline-flex items-center justify-center pt-2 pb-1 mb-1 text-lg font-bold text-gray-500 hover:text-gray-700 flex-shrink-0';
    moreButton.setAttribute('aria-label', 'More tabs');
    moreButton.innerHTML = '<span style="letter-spacing: -2px; line-height: 1;">&raquo;</span>';
    nav.appendChild(moreButton);
  }

  // Ensure correct positioning
  Object.assign(moreButton.style, { right: '26px' });
  (moreButton.classList.add('absolute'), moreButton.classList.remove('ml-2'));

  let dropdownMenu = tabContainer.querySelector(`#${dropdownId}`) as HTMLElement;
  if (!dropdownMenu) {
    dropdownMenu = document.createElement('div');
    dropdownMenu.id = dropdownId;
    dropdownMenu.className =
      'hidden absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] w-[120px]';
    dropdownMenu.innerHTML = '<div class="py-1" role="menu" aria-orientation="vertical"></div>';
    tabContainer.appendChild(dropdownMenu);
  }

  return { moreButton, dropdownMenu };
}

/**
 * Gets all tabs from nav and storage, deduplicates them
 */
function getAllTabs(
  nav: HTMLElement,
  hiddenTabStorage: HTMLElement,
  headerAttribute: string,
): HTMLElement[] {
  const allTabsMap = new Map<string, HTMLElement>();
  [
    ...Array.from(nav.querySelectorAll(`button[${headerAttribute}]`)),
    ...Array.from(hiddenTabStorage.querySelectorAll(`button[${headerAttribute}]`)),
  ].forEach((tab) => {
    const key = (tab as HTMLElement).getAttribute(headerAttribute);
    if (key && !allTabsMap.has(key)) allTabsMap.set(key, tab as HTMLElement);
  });
  return Array.from(allTabsMap.values());
}

/**
 * Sorts tabs by their hierarchical order
 */
function sortTabsByHierarchy(
  tabs: HTMLElement[],
  headerOrderMap: Map<string, number>,
  headerAttribute: string,
): HTMLElement[] {
  return [...tabs].sort((a, b) => {
    const getIndex = (tab: HTMLElement) =>
      headerOrderMap.get(tab.getAttribute(headerAttribute) || '') ?? Number.MAX_SAFE_INTEGER;
    return getIndex(a) - getIndex(b);
  });
}

/**
 * Restores all tabs to nav for measurement in hierarchical order
 */
function restoreTabsToNav(
  sortedTabs: HTMLElement[],
  nav: HTMLElement,
  hiddenTabStorage: HTMLElement,
  headerAttribute: string,
): void {
  const storedTabs = Array.from(
    hiddenTabStorage.querySelectorAll(`button[${headerAttribute}]`),
  ) as HTMLElement[];

  storedTabs.forEach((storedTab) => {
    const existingTab = sortedTabs.find(
      (t) => t.getAttribute(headerAttribute) === storedTab.getAttribute(headerAttribute),
    );
    if (!existingTab || !nav.contains(existingTab)) {
      hiddenTabStorage.removeChild(storedTab);
      if (existingTab) sortedTabs[sortedTabs.indexOf(existingTab)] = storedTab;
    }
  });

  // Insert tabs in hierarchical order
  sortedTabs.forEach((tab, index) => {
    if (!nav.contains(tab) && hiddenTabStorage.contains(tab)) hiddenTabStorage.removeChild(tab);

    // Find the correct position to insert this tab
    const nextTab = sortedTabs.slice(index + 1).find((t) => nav.contains(t));
    if (nextTab) {
      nav.insertBefore(tab, nextTab);
    } else {
      nav.appendChild(tab);
    }

    Object.assign(tab.style, { display: '', visibility: 'visible' });
    tab.classList.remove('hidden');
  });
}

/**
 * Measures tabs and returns measurement data
 */
function measureTabs(
  sortedTabs: HTMLElement[],
): Array<{ tab: HTMLElement; width: number; index: number }> {
  return sortedTabs.map((tab, index) => {
    const tabRect = tab.getBoundingClientRect();
    const tabStyle = window.getComputedStyle(tab);
    const width =
      Math.ceil(tabRect.width) +
      (parseFloat(tabStyle.marginLeft) || 0) +
      (parseFloat(tabStyle.marginRight) || 0) +
      1; // Add 1px safety buffer for sub-pixel rendering
    return { tab, width, index };
  });
}

/**
 * Calculates which tabs should be visible and which should be hidden
 */
function calculateTabVisibility(
  measuredTabs: Array<{ tab: HTMLElement; width: number; index: number }>,
  sortedTabs: HTMLElement[],
  selectedTabKey: string | null,
  availableWidth: number,
  headerAttribute: string,
): {
  visibleTabs: HTMLElement[];
  hiddenTabs: HTMLElement[];
  needsMoreButton: boolean;
} {
  let visibleTabs: HTMLElement[] = [];
  let hiddenTabs: HTMLElement[] = [];
  let currentWidth = 0;

  const selectedTabElement = selectedTabKey
    ? sortedTabs.find(
        (tab) => tab.getAttribute(headerAttribute)?.toLowerCase() === selectedTabKey.toLowerCase(),
      ) || null
    : null;

  // Add selected tab first if it exists
  const selectedTabData = selectedTabElement
    ? measuredTabs.find((t) => t.tab === selectedTabElement)
    : null;
  if (selectedTabData) {
    visibleTabs.push(selectedTabElement);
    currentWidth = selectedTabData.width;
  }

  // Process all tabs - stop at first tab that doesn't fit
  let foundFirstOverflow = false;
  for (const { tab, width } of measuredTabs) {
    if (tab === selectedTabElement) continue;
    // Use < instead of <= to be more conservative and prevent sub-pixel overflow
    if (!foundFirstOverflow && currentWidth + width < availableWidth) {
      visibleTabs.push(tab);
      currentWidth += width;
    } else {
      foundFirstOverflow = true;
      hiddenTabs.push(tab);
    }
  }

  // Maintain hierarchical order if selected tab was prioritized
  if (selectedTabElement) {
    visibleTabs.sort((a, b) => sortedTabs.indexOf(a) - sortedTabs.indexOf(b));
  }

  // Deduplicate hidden tabs
  const seen = new Set<string>();
  hiddenTabs = hiddenTabs.filter((tab) => {
    const key = tab.getAttribute(headerAttribute) || '';
    return key && !seen.has(key) && seen.add(key);
  });

  return { visibleTabs, hiddenTabs, needsMoreButton: hiddenTabs.length > 0 };
}

/**
 * Updates tab visibility in the DOM while maintaining hierarchical order
 */
function updateTabVisibility(
  sortedTabs: HTMLElement[],
  visibleTabs: HTMLElement[],
  hiddenTabs: HTMLElement[],
  nav: HTMLElement,
  hiddenTabStorage: HTMLElement,
  headerAttribute: string,
): void {
  const visibleTabKeys = new Set(visibleTabs.map((tab) => tab.getAttribute(headerAttribute) || ''));

  sortedTabs.forEach((tab, index) => {
    const shouldBeVisible = visibleTabKeys.has(tab.getAttribute(headerAttribute) || '');
    const isVisible =
      nav.contains(tab) && tab.style.display !== 'none' && !tab.classList.contains('hidden');

    if (shouldBeVisible && !isVisible) {
      if (hiddenTabStorage.contains(tab)) hiddenTabStorage.removeChild(tab);

      // Insert in correct hierarchical position
      if (!nav.contains(tab)) {
        const nextTab = sortedTabs.slice(index + 1).find((t) => nav.contains(t));
        if (nextTab) {
          nav.insertBefore(tab, nextTab);
        } else {
          nav.appendChild(tab);
        }
      }

      Object.assign(tab.style, { display: '' });
      tab.classList.remove('hidden');
    } else if (!shouldBeVisible && isVisible) {
      nav.contains(tab) && (nav.removeChild(tab), hiddenTabStorage.appendChild(tab));
      Object.assign(tab.style, { display: 'none' });
      tab.classList.add('hidden');
    }
  });
}

/**
 * Builds the dropdown menu content
 */
function buildDropdownMenu(
  dropdownContent: HTMLElement,
  hiddenTabKeys: Array<string | null>,
  sortedTabs: HTMLElement[],
  hiddenTabStorage: HTMLElement,
  nav: HTMLElement,
  tabContainer: HTMLElement,
  dropdownMenu: HTMLElement,
  headerAttribute: string,
): void {
  dropdownContent.innerHTML = '';
  const added = new Set<string>();

  hiddenTabKeys.forEach((tabKey) => {
    if (!tabKey || added.has(tabKey)) return;

    const tab =
      (Array.from(hiddenTabStorage.querySelectorAll(`button[${headerAttribute}]`)).find(
        (t) => (t as HTMLElement).getAttribute(headerAttribute) === tabKey,
      ) as HTMLElement) || sortedTabs.find((t) => t.getAttribute(headerAttribute) === tabKey);
    if (!tab || !added.add(tabKey)) return;

    const item = Object.assign(document.createElement('button'), {
      className: `w-full text-left px-4 py-2 text-sm font-medium ${tab.classList.contains('border-b-2') && tab.classList.contains('border-v2-blue') ? 'text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`,
      textContent: tab.textContent || '',
    });
    item.setAttribute(headerAttribute, tabKey);
    item.addEventListener('click', (e) => {
      (e.preventDefault(), e.stopPropagation());
      const original =
        nav.querySelector(`button[${headerAttribute}="${tabKey}"]`) ||
        hiddenTabStorage.querySelector(`button[${headerAttribute}="${tabKey}"]`) ||
        tabContainer.querySelector(`button[${headerAttribute}="${tabKey}"]`);
      (original && (original as HTMLElement).click(), dropdownMenu.classList.add('hidden'));
    });
    dropdownContent.appendChild(item);
  });
}

/**
 * Main class for managing dynamic headers with responsive behavior
 */
export class DynamicHeaders {
  private options: DynamicHeadersOptions;
  private container: HTMLElement | null = null;
  private nav: HTMLElement | null = null;
  private moreButtonId: string;
  private dropdownId: string;
  private headerAttribute: string;
  private headerOrderMap: Map<string, number> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private navMutationObserver: MutationObserver | null = null;
  private sidebarStateHandler: (() => void) | null = null;
  private isRunning: boolean = false;
  private isPending: boolean = false;

  constructor(options: DynamicHeadersOptions) {
    this.options = options;
    this.moreButtonId = options.moreButtonId || 'dynamic-header-more-button';
    this.dropdownId = options.dropdownId || 'dynamic-header-dropdown-menu';
    this.headerAttribute = options.headerAttribute || 'data-header-id';

    // Build order map from headers
    this.options.headers.forEach((header) => {
      this.headerOrderMap.set(header.id, header.order);
    });

    this.initialize();
  }

  /**
   * Initialize the dynamic headers system
   */
  initialize(): void {
    // Find container and nav
    this.container = document.querySelector(this.options.containerSelector) as HTMLElement;
    if (!this.container) {
      console.error(`Container not found: ${this.options.containerSelector}`);
      return;
    }

    this.nav = this.container.querySelector(this.options.navSelector) as HTMLElement;
    if (!this.nav) {
      console.error(`Nav not found: ${this.options.navSelector}`);
      return;
    }

    // Create header buttons
    this.createHeaders();

    // Setup responsive behavior
    this.setupResponsiveObserver();

    // Run initial responsive calculation
    requestAnimationFrame(() => {
      this.manageResponsiveTabs();
    });
  }

  /**
   * Create header buttons in the nav
   */
  private createHeaders(): void {
    if (!this.nav) return;

    // Clear existing headers
    const existingHeaders = this.nav.querySelectorAll(`button[${this.headerAttribute}]`);
    existingHeaders.forEach((header) => header.remove());

    // Create new headers
    this.options.headers.forEach((header) => {
      const button = document.createElement('button');
      button.className = `inline-flex items-center first:ml-0 mx-3 pt-2 pb-1 mb-1 text-sm font-medium text-gray-500 hover:text-gray-700 ${
        header.selected ? 'border-b-2 border-v2-blue' : ''
      } ${header.className || ''}`;
      button.setAttribute('aria-current', 'page');
      button.setAttribute(this.headerAttribute, header.id);
      button.textContent = header.label;

      // Add click handler
      button.addEventListener('click', async () => {
        // Remove active state from all tabs (including those in hidden storage)
        const hiddenTabStorage = this.container?.querySelector('.hidden-tab-storage');
        this.nav?.querySelectorAll('button').forEach((btn) => {
          btn.classList.remove('text-gray-900', 'border-b-2', 'border-v2-blue');
          btn.classList.add('text-gray-500');
        });
        hiddenTabStorage?.querySelectorAll('button').forEach((btn) => {
          btn.classList.remove('text-gray-900', 'border-b-2', 'border-v2-blue');
          btn.classList.add('text-gray-500');
        });

        // Add active state to clicked tab
        button.classList.remove('text-gray-500');
        button.classList.add('text-gray-900', 'border-b-2', 'border-v2-blue');

        // Set selected attribute on container
        this.container?.setAttribute('selected-header', header.id.toLowerCase());

        // Update responsive tabs after selection
        requestAnimationFrame(() => {
          this.manageResponsiveTabs();
        });

        // Call selection change callback
        if (this.options.onSelectionChange) {
          this.options.onSelectionChange(header.id);
        }

        // Call header's onClick callback
        if (header.onClick) {
          await header.onClick(header.id);
        }
      });

      this.nav?.appendChild(button);
    });
  }

  /**
   * Manages responsive tab visibility based on available width
   */
  private manageResponsiveTabs(): void {
    if (!this.container || !this.nav) return;

    // Check if already running to prevent concurrent execution
    if (this.isRunning) {
      this.isPending = true;
      return;
    }
    this.isRunning = true;
    this.isPending = false;

    const { moreButton, dropdownMenu } = getOrCreateUIElements(
      this.nav,
      this.container,
      this.moreButtonId,
      this.dropdownId,
    );
    const dropdownContent = dropdownMenu?.querySelector('.py-1') as HTMLElement;

    // Helper function to handle early returns with pending check
    const handleEarlyReturn = () => {
      this.isRunning = false;
      if (this.isPending) {
        this.isPending = false;
        requestAnimationFrame(() => this.manageResponsiveTabs());
      }
    };

    // Early return if any required elements are missing
    if (!dropdownContent) {
      handleEarlyReturn();
      return;
    }

    // Get or create hidden tab storage
    let hiddenTabStorage = this.container.querySelector('.hidden-tab-storage') as HTMLElement;
    if (!hiddenTabStorage) {
      hiddenTabStorage = Object.assign(document.createElement('div'), {
        className: 'hidden-tab-storage',
      });
      hiddenTabStorage.style.display = 'none';
      this.container.appendChild(hiddenTabStorage);
    }

    // Get all tabs and sort by hierarchy
    const allTabButtons = getAllTabs(this.nav, hiddenTabStorage, this.headerAttribute);
    if (allTabButtons.length === 0) {
      handleEarlyReturn();
      return;
    }

    const sortedTabs = sortTabsByHierarchy(
      allTabButtons,
      this.headerOrderMap,
      this.headerAttribute,
    );

    // Get currently selected tab
    const selectedTab =
      allTabButtons.find(
        (btn) => btn.classList.contains('border-b-2') && btn.classList.contains('border-v2-blue'),
      ) ||
      (this.container.getAttribute('selected-header') &&
        allTabButtons.find(
          (btn) =>
            btn.getAttribute(this.headerAttribute)?.toLowerCase() ===
            this.container?.getAttribute('selected-header')?.toLowerCase(),
        ));
    const selectedTabKey = selectedTab?.getAttribute(this.headerAttribute) || null;

    // Restore all tabs to nav for accurate measurement
    restoreTabsToNav(sortedTabs, this.nav, hiddenTabStorage, this.headerAttribute);

    // Force reflows and check if tabs have rendered widths - retry if not
    (void this.container.offsetHeight, void this.nav.offsetHeight);
    if (sortedTabs.some((tab) => tab.offsetWidth === 0 && this.nav?.contains(tab))) {
      handleEarlyReturn();
      setTimeout(() => this.manageResponsiveTabs(), 50);
      return;
    }

    // Calculate available width
    const containerStyle = window.getComputedStyle(this.container);
    const containerPadding =
      (parseFloat(containerStyle.paddingLeft) || 16) +
      (parseFloat(containerStyle.paddingRight) || 16);

    // Measure more button
    moreButton.classList.remove('hidden');
    moreButton.style.display = '';
    const moreButtonWidth =
      moreButton.getBoundingClientRect().width || moreButton.offsetWidth || 40;
    moreButton.classList.add('hidden');
    moreButton.style.display = 'none';

    // Measure all tabs
    const measuredTabs = measureTabs(sortedTabs);

    // First pass: Calculate with full width (no more button reserved)
    const fullAvailableWidth = this.container.getBoundingClientRect().width - containerPadding;
    let result = calculateTabVisibility(
      measuredTabs,
      sortedTabs,
      selectedTabKey,
      fullAvailableWidth,
      this.headerAttribute,
    );

    // If we need more button, recalculate with space reserved for it
    if (result.needsMoreButton) {
      const availableWidthWithButton =
        fullAvailableWidth - moreButtonWidth - 8; /* 8px for ml-2 left margin on more button */
      result = calculateTabVisibility(
        measuredTabs,
        sortedTabs,
        selectedTabKey,
        availableWidthWithButton,
        this.headerAttribute,
      );
    }

    const { visibleTabs, hiddenTabs, needsMoreButton } = result;

    // Store keys before DOM manipulation
    const hiddenTabCount = hiddenTabs.length;
    const hiddenTabKeys = hiddenTabs
      .map((tab) => tab.getAttribute(this.headerAttribute))
      .filter((k) => k);

    // Update DOM based on visibility
    updateTabVisibility(
      sortedTabs,
      visibleTabs,
      hiddenTabs,
      this.nav,
      hiddenTabStorage,
      this.headerAttribute,
    );

    // Ensure more button is at the end of nav
    if (moreButton) this.nav.appendChild(moreButton);

    // Show/hide more button and build dropdown
    const isCurrentlyVisible =
      !moreButton.classList.contains('hidden') && moreButton.style.display !== 'none';
    if (needsMoreButton && hiddenTabCount > 0) {
      !isCurrentlyVisible &&
        (moreButton.classList.remove('hidden'), (moreButton.style.display = ''));
      buildDropdownMenu(
        dropdownContent,
        hiddenTabKeys,
        sortedTabs,
        hiddenTabStorage,
        this.nav,
        this.container,
        dropdownMenu,
        this.headerAttribute,
      );
    } else if (isCurrentlyVisible) {
      (moreButton.classList.add('hidden'),
        (moreButton.style.display = 'none'),
        dropdownMenu.classList.add('hidden'));
    }

    this.isRunning = false;

    // If another run was requested while we were executing, run again
    if (this.isPending) {
      this.isPending = false;
      requestAnimationFrame(() => this.manageResponsiveTabs());
    }

    // Setup event handlers
    (moreButton as any).__moreClickHandler &&
      moreButton.removeEventListener('click', (moreButton as any).__moreClickHandler);
    const clickHandler = (e: MouseEvent) => {
      (e.preventDefault(), e.stopPropagation(), dropdownMenu.classList.toggle('hidden'));
      !dropdownMenu.classList.contains('hidden') &&
        document
          .querySelectorAll(`#${this.dropdownId}:not(.hidden)`)
          .forEach((m) => m !== dropdownMenu && m.classList.add('hidden'));
    };
    moreButton.addEventListener('click', ((moreButton as any).__moreClickHandler = clickHandler));

    (document as any).__dynamicHeaderDropdownClickOutsideHandler &&
      document.removeEventListener(
        'click',
        (document as any).__dynamicHeaderDropdownClickOutsideHandler,
      );
    document.addEventListener(
      'click',
      ((document as any).__dynamicHeaderDropdownClickOutsideHandler = (e: MouseEvent) =>
        !dropdownMenu.contains(e.target as Node) &&
        !moreButton.contains(e.target as Node) &&
        dropdownMenu.classList.add('hidden')),
    );
  }

  /**
   * Sets up resize observer for responsive tab management
   */
  private setupResponsiveObserver(): void {
    if (!this.container || !this.nav) return;

    // Debounce resize handler to avoid too many recalculations
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const debouncedResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        this.manageResponsiveTabs();
        if (this.options.onResize) {
          this.options.onResize();
        }
      }, 50); // Debounce for 50ms
    };

    // Use ResizeObserver to watch for width changes
    this.resizeObserver = new ResizeObserver(debouncedResize);
    this.resizeObserver.observe(this.container);

    // Also listen for sidebar state changes
    this.sidebarStateHandler = () => {
      setTimeout(() => {
        this.manageResponsiveTabs();
      }, 100);
    };
    window.addEventListener('sidebarStateChanged', this.sidebarStateHandler);

    // CRITICAL: Watch for tab additions/removals in the nav (DOM changes)
    this.navMutationObserver = new MutationObserver((mutations) => {
      // Check if we should ignore this mutation (if it's from our own responsive logic)
      if (this.isRunning) {
        return; // Ignore mutations while we're making our own changes
      }

      // Check if any mutations involve REAL tab changes (not our internal moves)
      const hasRealTabChanges = mutations.some((mutation) => {
        if (mutation.type === 'childList') {
          // Get all added/removed nodes that are tab buttons
          const addedTabs = Array.from(mutation.addedNodes).filter(
            (node) =>
              node.nodeName === 'BUTTON' &&
              (node as HTMLElement).hasAttribute(this.headerAttribute) &&
              (node as HTMLElement).id !== this.moreButtonId,
          );

          const removedTabs = Array.from(mutation.removedNodes).filter(
            (node) =>
              node.nodeName === 'BUTTON' &&
              (node as HTMLElement).hasAttribute(this.headerAttribute) &&
              (node as HTMLElement).id !== this.moreButtonId,
          );

          // Check if these tabs are being moved to/from hiddenTabStorage
          const hiddenTabStorage = this.container?.querySelector('.hidden-tab-storage');

          // If tabs are being moved to storage, ignore (it's our responsive logic)
          const isMovingToStorage =
            addedTabs.length === 0 && removedTabs.length > 0 && hiddenTabStorage;
          const isMovingFromStorage =
            removedTabs.length === 0 && addedTabs.length > 0 && hiddenTabStorage;

          if (isMovingToStorage || isMovingFromStorage) {
            return false; // This is our internal operation
          }

          // Real change: tabs added/removed from external source
          return addedTabs.length > 0 || removedTabs.length > 0;
        }
        return false;
      });

      if (hasRealTabChanges) {
        // Use requestAnimationFrame to ensure DOM is settled
        requestAnimationFrame(() => {
          this.manageResponsiveTabs();
        });
      }
    });

    // Observe the nav for child additions/removals
    this.navMutationObserver.observe(this.nav, {
      childList: true, // Watch for direct children being added/removed
      subtree: false, // Don't watch nested elements
    });
  }

  /**
   * Update headers dynamically
   */
  updateHeaders(headers: HeaderConfig[]): void {
    this.options.headers = headers;

    // Rebuild order map
    this.headerOrderMap.clear();
    headers.forEach((header) => {
      this.headerOrderMap.set(header.id, header.order);
    });

    // Recreate headers
    this.createHeaders();

    // Recalculate responsive layout
    requestAnimationFrame(() => {
      this.manageResponsiveTabs();
    });
  }

  /**
   * Set selected header programmatically
   */
  setSelected(id: string): void {
    if (!this.nav) return;

    const button = this.nav.querySelector(`button[${this.headerAttribute}="${id}"]`) as HTMLElement;
    if (button) {
      button.click();
    }
  }

  /**
   * Cleanup observers and event listeners
   */
  destroy(): void {
    // Disconnect observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.navMutationObserver) {
      this.navMutationObserver.disconnect();
      this.navMutationObserver = null;
    }

    // Remove event listeners
    if (this.sidebarStateHandler) {
      window.removeEventListener('sidebarStateChanged', this.sidebarStateHandler);
      this.sidebarStateHandler = null;
    }

    // Remove document click handler
    if ((document as any).__dynamicHeaderDropdownClickOutsideHandler) {
      document.removeEventListener(
        'click',
        (document as any).__dynamicHeaderDropdownClickOutsideHandler,
      );
      delete (document as any).__dynamicHeaderDropdownClickOutsideHandler;
    }

    // Clear references
    this.container = null;
    this.nav = null;
    this.headerOrderMap.clear();
  }
}
