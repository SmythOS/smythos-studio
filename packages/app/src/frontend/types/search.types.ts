
/**
 * Represents a search result item in the canvas search
 */
export interface SearchResult {
  /** Unique identifier of the component */
  id: string;
  /** Display name/title of the component */
  name: string;
  /** Component type (e.g., 'APIEndpoint', 'Code', etc.) */
  type: string;
  /** Component description */
  description: string;
  /** DOM element reference */
  element: HTMLElement;
  /** HTML string for the component icon */
  iconHTML: string;
}

/**
 * Configuration for canvas search functionality
 */
export interface SearchConfig {
  /** Maximum number of main search results to display */
  maxMainResults: number;
  /** Maximum total results including "Other Results" */
  maxTotalResults: number;
  /** Maximum number of recent components to track */
  maxRecentComponents: number;
}

/**
 * Recently edited component tracking item
 */
export interface RecentlyEditedComponent {
  /** Component ID */
  id: string;
  /** Timestamp when the component was last edited */
  timestamp: number;
}

/**
 * Search event types for type-safe event handling
 */
export enum SearchEventType {
  COMPONENT_SELECTED = 'componentSelected',
  SEARCH_OPENED = 'searchOpened',
  SEARCH_CLOSED = 'searchClosed',
  SEARCH_QUERY_CHANGED = 'searchQueryChanged'
}

/**
 * Search event data structure
 */
export interface SearchEventData {
  type: SearchEventType;
  payload?: {
    componentId?: string;
    query?: string;
    result?: SearchResult;
  };
} 