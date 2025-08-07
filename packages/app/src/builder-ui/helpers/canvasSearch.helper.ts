import { Component } from '../components/Component.class';
import {
  RecentlyEditedComponent,
  SearchConfig,
  SearchEventData,
  SearchEventType,
  SearchResult
} from '../types/search.types';
import { Workspace } from '../workspace/Workspace.class';

/**
 * Canvas Search Helper
 * 
 * Provides comprehensive search functionality for the canvas builder interface.
 * Handles component searching, recently edited components tracking, and UI interactions.
 * 
 * Features:
 * - Real-time component search by title and description
 * - Recently edited components tracking
 * - Keyboard navigation support
 * - Type-based search for "Other Results"
 * - Event-driven architecture for extensibility
 * 
 */
export class CanvasSearchHelper {
  private static instance: CanvasSearchHelper;

  // DOM element references
  private searchContainer: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private searchResults: HTMLElement | null = null;
  private searchContent: HTMLElement | null = null;

  // Search state
  private currentResults: SearchResult[] = [];
  private currentSelectedIndex: number = -1;
  private recentlyEditedComponents: RecentlyEditedComponent[] = [];

  // Configuration
  private readonly config: SearchConfig = {
    maxMainResults: 5,
    maxTotalResults: 5,
    maxRecentComponents: 3
  };

  // Event listeners
  private eventListeners: Map<SearchEventType, Array<(data: SearchEventData) => void>> = new Map();

  // Bound function references for proper event listener removal
  private boundPerformSearch: ((e: Event) => void) | null = null;
  private boundShowRecent: ((e: Event) => void) | null = null;
  private boundKeyboardNav: ((e: KeyboardEvent) => void) | null = null;
  private boundClickOutside: ((e: Event) => void) | null = null;

  /**
   * Singleton pattern implementation
   * Ensures only one instance of the search helper exists
   */
  public static getInstance(): CanvasSearchHelper {
    if (!CanvasSearchHelper.instance) {
      CanvasSearchHelper.instance = new CanvasSearchHelper();
    }
    return CanvasSearchHelper.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.initializeEventListeners();
  }

  /**
   * Initialize the canvas search functionality
   * Sets up DOM references and event handlers
   * 
   * @param workspace - The workspace instance
   * @throws Error if required DOM elements are not found
   */
  public initialize(workspace: Workspace): void {
    this.validateWorkspace(workspace);
    this.setupDOMReferences();
    this.setupEventHandlers(workspace);
    this.initializeRecentComponentsTracking(workspace);

    this.emitEvent(SearchEventType.SEARCH_OPENED, {});
  }

  /**
   * Validate workspace instance
   * 
   * @param workspace - The workspace to validate
   * @throws Error if workspace is invalid
   */
  private validateWorkspace(workspace: Workspace): void {
    if (!workspace || typeof workspace !== 'object') {
      throw new Error('Invalid workspace instance provided to CanvasSearchHelper');
    }
  }

  /**
   * Setup DOM element references
   * 
   * @throws Error if required DOM elements are not found
   */
  private setupDOMReferences(): void {
    this.searchContainer = document.getElementById('canvas-search-container');
    this.searchInput = document.getElementById('canvas-search-input') as HTMLInputElement;
    this.searchResults = document.getElementById('canvas-search-results');
    this.searchContent = document.getElementById('canvas-search-content');

    if (!this.searchContainer || !this.searchInput || !this.searchResults) {
      throw new Error('Required DOM elements for canvas search not found');
    }
  }

  /**
   * Setup event handlers for search functionality
   * 
   * @param workspace - The workspace instance
   */
  private setupEventHandlers(workspace: Workspace): void {
    if (!this.searchInput || !this.searchContainer) return;

    // Search input handler
    this.boundPerformSearch = (e: Event) => {
      const query = (e.target as HTMLInputElement).value.trim();
      this.performSearch(workspace, query);
      this.emitEvent(SearchEventType.SEARCH_QUERY_CHANGED, { query });
    };
    this.searchInput.addEventListener('input', this.boundPerformSearch);

    // Focus handler - show recent components when clicked if empty
    this.boundShowRecent = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const query = input.value.trim();

      if (!query) {
        this.showRecentlyEditedComponents(workspace);
      }
    };
    this.searchInput.addEventListener('focus', this.boundShowRecent);

    // Keyboard navigation handler
    this.boundKeyboardNav = (e: KeyboardEvent) => {
      this.handleKeyboardNavigation(e, workspace);
    };
    this.searchInput.addEventListener('keydown', this.boundKeyboardNav);

    // Click outside to close
    this.boundClickOutside = (e: Event) => {
      if (this.searchContainer &&
        !this.searchContainer.contains(e.target as Node) &&
        !this.searchContainer.classList.contains('hidden')) {
        this.closeSearch();
      }
    };
    document.addEventListener('click', this.boundClickOutside);
  }

  /**
   * Initialize recently edited components tracking
   * Only track settings saves and endpoint changes
   * 
   * @param workspace - The workspace instance
   */
  private initializeRecentComponentsTracking(workspace: Workspace): void {
    // Track component settings saves
    document.addEventListener('componentSettingsSaved', (event: CustomEvent) => {
      if (event.detail?.componentId) {
        this.updateRecentlyEdited(event.detail.componentId);
      }
    });

    // Track endpoint changes from Component.class
    document.addEventListener('componentEndpointChanged', (event: CustomEvent) => {
      if (event.detail?.componentId) {
        this.updateRecentlyEdited(event.detail.componentId);
      }
    });

    // Track title and description changes
    document.addEventListener('componentTitleChanged', (event: CustomEvent) => {
      if (event.detail?.componentId) {
        this.updateRecentlyEdited(event.detail.componentId);
      }
    });

    document.addEventListener('componentDescriptionChanged', (event: CustomEvent) => {
      if (event.detail?.componentId) {
        this.updateRecentlyEdited(event.detail.componentId);
      }
    });
  }

  /**
   * Update recently edited components list
   * 
   * @param componentId - The component ID to track
   */
  public updateRecentlyEdited(componentId: string): void {
    if (!componentId || typeof componentId !== 'string') {
      console.warn('Invalid componentId provided to updateRecentlyEdited:', componentId);
      return;
    }

    const now = Date.now();

    // Remove existing entry if it exists
    this.recentlyEditedComponents = this.recentlyEditedComponents.filter(
      item => item.id !== componentId
    );

    // Add to beginning of array with timestamp
    this.recentlyEditedComponents.unshift({
      id: componentId,
      timestamp: now
    });

    // Keep only the max number of recent components
    if (this.recentlyEditedComponents.length > this.config.maxRecentComponents) {
      this.recentlyEditedComponents = this.recentlyEditedComponents.slice(0, this.config.maxRecentComponents);
    }
  }

  /**
   * Open the canvas search interface
   * 
   * @param workspace - The workspace instance
   */
  public openSearch(workspace: Workspace): void {
    if (!this.searchContainer || !this.searchInput || !this.searchResults) {
      console.error('Search elements not initialized');
      return;
    }

    // Reset search state
    this.searchInput.value = '';
    this.searchInput.placeholder = 'Search Components and Integrations.';
    this.currentSelectedIndex = -1;
    this.currentResults = [];

    // Show container
    this.searchContainer.classList.remove('hidden');

    // Set initial styling for empty state
    this.updateSearchContentStyling(false);

    // Clear results initially
    this.searchResults.innerHTML = '';

    // Focus the search input
    setTimeout(() => {
      this.searchInput?.focus();
    }, 0);

    this.emitEvent(SearchEventType.SEARCH_OPENED, {});
  }

  /**
   * Close the canvas search interface
   */
  public closeSearch(): void {
    if (!this.searchContainer || !this.searchInput) return;

    // Clear input and reset placeholder
    this.searchInput.value = '';
    this.searchInput.placeholder = 'Search Components and Integrations.';
    this.searchInput.blur();

    // Hide container
    this.searchContainer.classList.add('hidden');

    // Reset state
    this.currentSelectedIndex = -1;
    this.currentResults = [];

    this.emitEvent(SearchEventType.SEARCH_CLOSED, {});
  }

  /**
   * Perform search through canvas components
   * 
   * @param workspace - The workspace instance
   * @param query - The search query
   */
  private performSearch(workspace: Workspace, query: string): void {
    if (!this.searchResults) return;

    // Update styling based on whether we have results
    this.updateSearchContentStyling(!!query);

    if (!query) {
      this.showRecentlyEditedComponents(workspace);
      return;
    }

    const allResults = this.searchComponents(workspace, query);

    if (allResults.length === 0) {
      this.showNoResultsFound();
      return;
    }

    this.displaySearchResults(workspace, allResults, query);
  }

  /**
   * Search through canvas components by title and description
   * 
   * @param workspace - The workspace instance
   * @param query - The search query
   * @returns Array of search results
   */
  private searchComponents(workspace: Workspace, query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const components = document.querySelectorAll('.component');
    const queryLower = query.toLowerCase();

    components.forEach((element) => {
      const control = (element as any)._control;
      if (!control) return;

      const title = control.title || '';
      const description = control.description ||
        control.drawSettings?.componentDescription ||
        control.drawSettings?.shortDescription || '';

      // Only match title or description (not type)
      if (title.toLowerCase().includes(queryLower) ||
        description.toLowerCase().includes(queryLower)) {
        results.push({
          id: element.id,
          name: title || control.drawSettings?.displayName || '',
          type: control.drawSettings?.displayName || '',
          description,
          element: element as HTMLElement,
          iconHTML: this.getComponentIconHTML(control)
        });
      }
    });

    return this.sortSearchResults(results, query);
  }

  /**
   * Search components by type for "Other Results"
   * 
   * @param workspace - The workspace instance
   * @param query - The search query
   * @param excludeIds - Component IDs to exclude from results
   * @returns Array of search results
   */
  private searchComponentsByType(workspace: Workspace, query: string, excludeIds: string[]): SearchResult[] {
    const results: SearchResult[] = [];
    const components = document.querySelectorAll('.component');
    const queryLower = query.toLowerCase();

    components.forEach((element) => {
      const control = (element as any)._control;
      if (!control || excludeIds.includes(element.id)) return;

      const title = control.title || '';
      const type = control.drawSettings?.displayName || '';
      const description = control.description ||
        control.drawSettings?.componentDescription ||
        control.drawSettings?.shortDescription || '';

      // Only match type AND ensure it's not already matched by title/description
      if (type.toLowerCase().includes(queryLower) &&
        !title.toLowerCase().includes(queryLower) &&
        !description.toLowerCase().includes(queryLower)) {
        results.push({
          id: element.id,
          name: title || type,
          type,
          description,
          element: element as HTMLElement,
          iconHTML: this.getComponentIconHTML(control)
        });
      }
    });

    return results;
  }

  /**
   * Sort search results by relevance
   * 
   * @param results - Array of search results
   * @param query - The search query
   * @returns Sorted array of search results
   */
  private sortSearchResults(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();

    return results.sort((a, b) => {
      const aTitleExact = (a.name || '').toLowerCase() === queryLower;
      const bTitleExact = (b.name || '').toLowerCase() === queryLower;
      const aDescExact = (a.description || '').toLowerCase() === queryLower;
      const bDescExact = (b.description || '').toLowerCase() === queryLower;

      if (aTitleExact && !bTitleExact) return -1;
      if (!aTitleExact && bTitleExact) return 1;
      if (aDescExact && !bDescExact) return -1;
      if (!aDescExact && bDescExact) return 1;

      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Display search results in the UI
   * 
   * @param workspace - The workspace instance
   * @param allResults - All search results
   * @param query - The search query
   */
  private displaySearchResults(workspace: Workspace, allResults: SearchResult[], query: string): void {
    if (!this.searchResults) return;

    const mainResults = allResults.slice(0, this.config.maxMainResults);
    let otherResults: SearchResult[] = [];

    // Get type-based results for "Other Results" if we have less than max results
    if (mainResults.length < this.config.maxMainResults) {
      const remainingSlots = this.config.maxMainResults - mainResults.length;
      otherResults = this.searchComponentsByType(
        workspace,
        query,
        mainResults.map(r => r.id)
      ).slice(0, remainingSlots);
    }

    const totalResults = [...mainResults, ...otherResults];
    this.currentResults = totalResults;
    this.currentSelectedIndex = totalResults.length > 0 ? 0 : -1;

    const resultsHTML = this.generateResultsHTML(mainResults, otherResults, query);
    this.searchResults.innerHTML = resultsHTML;

    this.addResultClickHandlers(workspace);
    this.updateSelection();
  }

  /**
   * Generate HTML for search results
   * 
   * @param mainResults - Main search results
   * @param otherResults - Other results (type-based)
   * @param query - The search query
   * @returns HTML string
   */
  private generateResultsHTML(mainResults: SearchResult[], otherResults: SearchResult[], query: string): string {
    let html = '';

    // Main results
    if (mainResults.length > 0) {
      html += mainResults.map((result, index) => `
        <div class="search-result self-stretch inline-flex justify-start items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded ${index === 0 ? 'bg-gray-50' : ''}"
             data-component-id="${result.id}">
          <div class="w-4 h-4 min-w-4 relative">
            ${result.iconHTML}
          </div>
          <div class="inline-flex flex-col justify-start items-start overflow-hidden flex-1 min-w-0">
            <div class="justify-center w-full">
              <span class="text-gray-900 text-xs font-normal font-['Inter'] truncate block">${this.highlightMatch(result.name, query)}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Other Results section
    if (otherResults.length > 0) {
      html += `
        <div class="self-stretch inline-flex justify-start items-center gap-2 mt-2">
          <div class="inline-flex flex-col justify-start items-start overflow-hidden">
            <div class="justify-center text-neutral-500 text-xs font-normal font-['Inter']">Other Results</div>
          </div>
        </div>
      `;

      html += otherResults.map((result) => `
        <div class="search-result self-stretch inline-flex justify-start items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
             data-component-id="${result.id}">
          <div class="w-4 h-4 min-w-4 relative">
            ${result.iconHTML}
          </div>
          <div class="inline-flex flex-col justify-start items-start overflow-hidden flex-1 min-w-0">
            <div class="justify-center w-full">
              <span class="text-gray-900 text-xs font-normal font-['Inter'] truncate block">${this.highlightMatch(result.name, query)}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    return html;
  }

  /**
   * Show recently edited components
   * 
   * @param workspace - The workspace instance
   */
  private showRecentlyEditedComponents(workspace: Workspace): void {
    if (!this.searchResults) return;

    const recentComponents = this.getRecentlyEditedComponents(workspace);

    if (recentComponents.length === 0) {
      this.searchResults.innerHTML = `
        <div class="self-stretch inline-flex justify-start items-center gap-2">
          <div class="inline-flex flex-col justify-start items-start overflow-hidden">
            <div class="justify-center text-neutral-500 text-xs font-normal font-['Inter']">No recently edited components</div>
          </div>
        </div>
      `;
      return;
    }

    const resultsHTML = this.generateRecentComponentsHTML(recentComponents);
    this.searchResults.innerHTML = resultsHTML;

    this.currentResults = recentComponents;
    this.currentSelectedIndex = 0;

    this.addResultClickHandlers(workspace);
  }

  /**
   * Generate HTML for recently edited components
   * 
   * @param components - Array of recently edited components
   * @returns HTML string
   */
  private generateRecentComponentsHTML(components: SearchResult[]): string {
    return `
      <div class="self-stretch inline-flex justify-start items-center gap-2">
        <div class="inline-flex flex-col justify-start items-start overflow-hidden">
          <div class="justify-center text-neutral-500 text-xs font-normal font-['Inter']">Recent Action</div>
        </div>
      </div>
      ${components.map((component, index) => `
        <div class="search-result self-stretch inline-flex justify-start items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
             data-component-id="${component.id}">
          <div class="w-4 h-4 min-w-4 relative">
            ${component.iconHTML}
          </div>
          <div class="inline-flex flex-col justify-start items-start overflow-hidden flex-1 min-w-0">
            <div class="justify-center w-full">
              <span class="text-gray-900 text-xs font-normal font-['Inter'] truncate block">${this.escapeHtml(component.name)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    `;
  }

  /**
   * Get recently edited components data
   * 
   * @param workspace - The workspace instance
   * @returns Array of recently edited components (most recent first)
   */
  private getRecentlyEditedComponents(workspace: Workspace): SearchResult[] {
    const components: SearchResult[] = [];

    // Sort by timestamp (most recent first) - though unshift should maintain this order
    const sortedItems = [...this.recentlyEditedComponents].sort((a, b) => b.timestamp - a.timestamp);

    for (const item of sortedItems) {
      const element = document.getElementById(item.id);
      if (element?.classList.contains('component')) {
        const control = (element as any)._control;
        if (control) {
          components.push({
            id: item.id,
            name: control.title || control.drawSettings?.displayName || '',
            type: control.drawSettings?.displayName || '',
            description: control.description || control.drawSettings?.componentDescription || '',
            element: element as HTMLElement,
            iconHTML: this.getComponentIconHTML(control)
          });
        }
      }
    }

    return components;
  }

  /**
   * Show no results found message
   */
  private showNoResultsFound(): void {
    if (!this.searchResults) return;

    this.searchResults.innerHTML = `
      <div class="self-stretch inline-flex justify-start items-center gap-2">
        <div class="justify-center">
          <span class="text-gray-900 text-xs font-normal font-['Inter']">No Results Found. </span>
          <span class="text-blue-500 text-xs font-normal font-['Inter'] underline cursor-pointer" data-action="add-skill">Click to add a skill</span>
        </div>
        <div class="w-6 h-4"></div>
      </div>
    `;

    this.currentResults = [];
    this.currentSelectedIndex = -1;

    // Add click handler for the "add skill" action
    this.addNoResultsClickHandlers();
  }

  /**
   * Handle keyboard navigation in search
   * 
   * @param e - Keyboard event
   * @param workspace - The workspace instance
   */
  private handleKeyboardNavigation(e: KeyboardEvent, workspace: Workspace): void {
    if (!this.searchResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (this.currentSelectedIndex < this.currentResults.length - 1) {
          this.currentSelectedIndex++;
          this.updateSelection();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (this.currentSelectedIndex > 0) {
          this.currentSelectedIndex--;
          this.updateSelection();
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (this.currentSelectedIndex >= 0 && this.currentResults[this.currentSelectedIndex]) {
          this.selectComponent(workspace, this.currentResults[this.currentSelectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.closeSearch();
        break;
    }
  }

  /**
   * Update visual selection in search results
   */
  private updateSelection(): void {
    if (!this.searchResults) return;

    const resultElements = this.searchResults.querySelectorAll('.search-result');
    resultElements.forEach((element, index) => {
      if (index === this.currentSelectedIndex) {
        element.classList.add('bg-gray-50');
      } else {
        element.classList.remove('bg-gray-50');
      }
    });
  }

  /**
   * Add click handlers to search results
   * 
   * @param workspace - The workspace instance
   */
  private addResultClickHandlers(workspace: Workspace): void {
    if (!this.searchResults) return;

    const resultElements = this.searchResults.querySelectorAll('.search-result');
    resultElements.forEach((element) => {
      element.addEventListener('click', () => {
        const componentId = element.getAttribute('data-component-id');
        if (componentId) {
          const result = this.currentResults.find(r => r.id === componentId);
          if (result) {
            this.selectComponent(workspace, result);
          }
        }
      });
    });
  }

  /**
   * Add click handlers for no results found actions
   */
  private addNoResultsClickHandlers(): void {
    if (!this.searchResults) return;

    const addSkillElement = this.searchResults.querySelector('[data-action="add-skill"]');
    if (addSkillElement) {
      addSkillElement.addEventListener('click', () => {
        (window as any).addAgentSkill?.();
      });
    }
  }

  /**
   * Select and navigate to a component
   * 
   * @param workspace - The workspace instance
   * @param result - The search result to select
   */
  private selectComponent(workspace: Workspace, result: SearchResult): void {
    // Close search
    this.closeSearch();

    // Navigate to component
    workspace.scrollToComponent(result.element);

    // Highlight the component temporarily
    result.element.classList.add('selected');
    setTimeout(() => {
      result.element.classList.remove('selected');
    }, 2000);

    // Emit selection event
    this.emitEvent(SearchEventType.COMPONENT_SELECTED, {
      componentId: result.id,
      result
    });
  }

  /**
   * Update search content styling based on state
   * 
   * @param hasResults - Whether there are search results
   */
  private updateSearchContentStyling(hasResults: boolean): void {
    if (!this.searchContent) return;

    if (hasResults) {
      this.searchContent.className = 'p-3 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex flex-col justify-center items-start gap-3';
    } else {
      this.searchContent.className = 'px-2 py-1 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex flex-col justify-center items-start';
    }
  }

  /**
   * Get component icon HTML with proper styling
   * 
   * @param control - The component control
   * @returns HTML string for the icon
   */
  private getComponentIconHTML(control: Component): string {
    const iconCSSClass = control.drawSettings?.iconCSSClass || '';
    const color = control.drawSettings?.color || '#000';

    // Handle SVG icons
    if (iconCSSClass.startsWith('<svg')) {
      let svgContent = iconCSSClass;
      svgContent = svgContent.replace(/fill="[^"]*"/g, '');
      svgContent = svgContent.replace('<svg', `<svg fill="${color}"`);
      return `<div class="w-4 h-4 min-w-4 relative">${svgContent}</div>`;
    }

    // Handle Font Awesome icons
    if (iconCSSClass.includes('fa-') || iconCSSClass.includes('tpl-fa-icon')) {
      const faClass = iconCSSClass.includes('tpl-fa-icon') ? iconCSSClass : `tpl-fa-icon ${iconCSSClass}`;
      return `<div class="w-4 h-4 min-w-4 relative"><i class="${faClass}" style="color: ${color};"></i></div>`;
    }

    // Handle CSS class icons
    if (iconCSSClass.includes('svg-icon')) {
      return `<div class="w-4 h-4 min-w-4 relative"><span class="${iconCSSClass}" style="background-color: ${color};"></span></div>`;
    }

    // Handle other icon classes
    if (iconCSSClass.includes('mif-')) {
      return `<div class="w-4 h-4 min-w-4 relative"><i class="${iconCSSClass}" style="color: ${color};"></i></div>`;
    }

    // Default fallback icon
    return `<div class="w-4 h-4 min-w-4 relative">
      <div class="w-1.5 h-1.5 left-[1.67px] top-[8.83px] absolute bg-gray-900"></div>
      <div class="w-1.5 h-1.5 left-[5.33px] top-[1.50px] absolute bg-gray-900"></div>
      <div class="w-1.5 h-1.5 left-[9px] top-[8.83px] absolute bg-gray-900"></div>
    </div>`;
  }

  /**
   * Highlight search matches in text
   * 
   * @param text - The text to highlight
   * @param query - The search query
   * @returns HTML string with highlighted matches
   */
  private highlightMatch(text: string, query: string): string {
    if (!query) return this.escapeHtml(text);

    const escapedText = this.escapeHtml(text);
    const escapedQuery = this.escapeHtml(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    return escapedText.replace(regex, '<span class="text-blue-500 font-medium">$1</span>');
  }

  /**
   * Escape HTML characters
   * 
   * @param text - The text to escape
   * @returns Escaped HTML string
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Initialize event listeners map
   */
  private initializeEventListeners(): void {
    Object.values(SearchEventType).forEach(eventType => {
      this.eventListeners.set(eventType, []);
    });
  }

  /**
   * Add event listener for search events
   * 
   * @param eventType - The event type to listen for
   * @param callback - The callback function
   */
  public addEventListener(eventType: SearchEventType, callback: (data: SearchEventData) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.push(callback);
    }
  }

  /**
   * Remove event listener for search events
   * 
   * @param eventType - The event type
   * @param callback - The callback function to remove
   */
  public removeEventListener(eventType: SearchEventType, callback: (data: SearchEventData) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit search event
   * 
   * @param eventType - The event type
   * @param payload - The event payload
   */
  private emitEvent(eventType: SearchEventType, payload: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const eventData: SearchEventData = { type: eventType, payload };
      listeners.forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          console.error('Error in search event listener:', error);
        }
      });
    }
  }

  /**
   * Get current search configuration
   * 
   * @returns Current search configuration
   */
  public getConfig(): SearchConfig {
    return { ...this.config };
  }

  /**
   * Update search configuration
   * 
   * @param newConfig - Partial configuration to update
   */
  public updateConfig(newConfig: Partial<SearchConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get current search results
   * 
   * @returns Current search results
   */
  public getCurrentResults(): SearchResult[] {
    return [...this.currentResults];
  }

  /**
   * Get recently edited components
   * 
   * @returns Recently edited components
   */
  public getRecentlyEditedComponentsList(): RecentlyEditedComponent[] {
    return [...this.recentlyEditedComponents];
  }

  /**
   * Clear recently edited components
   */
  public clearRecentlyEditedComponents(): void {
    this.recentlyEditedComponents = [];
  }

  /**
   * Destroy the search helper instance
   * Cleanup event listeners and reset state
   */
  public destroy(): void {
    // Remove event listeners
    if (this.searchInput && this.boundPerformSearch) {
      this.searchInput.removeEventListener('input', this.boundPerformSearch);
    }
    if (this.searchInput && this.boundShowRecent) {
      this.searchInput.removeEventListener('focus', this.boundShowRecent);
    }
    if (this.searchInput && this.boundKeyboardNav) {
      this.searchInput.removeEventListener('keydown', this.boundKeyboardNav);
    }
    if (this.boundClickOutside) {
      document.removeEventListener('click', this.boundClickOutside);
    }

    // Clear bound function references
    this.boundPerformSearch = null;
    this.boundShowRecent = null;
    this.boundKeyboardNav = null;
    this.boundClickOutside = null;

    // Clear event listeners map
    this.eventListeners.clear();

    // Reset state
    this.currentResults = [];
    this.currentSelectedIndex = -1;
    this.recentlyEditedComponents = [];

    // Clear DOM references
    this.searchContainer = null;
    this.searchInput = null;
    this.searchResults = null;
    this.searchContent = null;

    // Clear singleton instance
    CanvasSearchHelper.instance = null as any;
  }
}

/**
 * Add agent skill (APIEndpoint) to the builder
 * This function is called when user clicks "Click to add a skill" in no results
 * 
 * @global
 */
declare global {
  function addAgentSkill(): void;
}

// Make addAgentSkill globally available for the "no results" click handler
(window as any).addAgentSkill = async (): Promise<void> => {
  const workspace = (window as any).workspace;
  if (!workspace) {
    console.warn('Workspace not available');
    return;
  }

  // Close search bar first
  const searchHelper = CanvasSearchHelper.getInstance();
  searchHelper.closeSearch();

  // Prevent multiple rapid clicks from creating stacked components
  if ((window as any).addingSkill) {
    return;
  }
  (window as any).addingSkill = true;

  try {
    // Get all existing components to find the position for the new skill
    const existingComponents = workspace.agent?.data?.components || [];

    let newTop = 50; // Default starting position
    let newLeft = 50; // Always start from the very left

    if (existingComponents.length > 0) {
      // Find the component with the highest Y position (bottom-most)
      const bottomMostComponent = existingComponents.reduce((prev, current) => {
        const prevTop = Number(prev.top?.split('px')[0] || 0);
        const currentTop = Number(current.top?.split('px')[0] || 0);
        return currentTop > prevTop ? current : prev;
      });

      // Get the DOM element to calculate its height
      const bottomComponentElement = document.getElementById(bottomMostComponent.id);
      let componentHeight = 200; // Default height fallback

      if (bottomComponentElement) {
        const rect = bottomComponentElement.getBoundingClientRect();
        componentHeight = rect.height;
      }

      // Position new skill below the bottom-most component with a gap
      newTop = Number(bottomMostComponent.top?.split('px')[0] || 0) + componentHeight + 100;
    }

    const componentProperties = {
      top: `${newTop}px`,
      left: `${newLeft}px`,
      outputs: ['response'],
      inputs: [],
      data: {
        prompt: 'New skill prompt...',
        advancedModeEnabled: false
      },
      sender: null
    };

    const componentElement = await workspace.addComponent('APIEndpoint', componentProperties, true);
    if (componentElement) {
      workspace.scrollToComponent(componentElement);
      workspace.refreshComponentSelection(componentElement);
      searchHelper.updateRecentlyEdited(componentElement.id);

      setTimeout(() => {
        workspace.saveAgent();
      }, 100);
    }
  } catch (error) {
    console.error('Error adding APIEndpoint component:', error);
  } finally {
    (window as any).addingSkill = false;
  }
}; 