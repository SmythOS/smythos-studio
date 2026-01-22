import { cn } from '@react/shared/utils/general';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Configuration for a single tab
 */
export interface CollapsibleTabConfig {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
}

/**
 * Props for the CollapsibleTabs component
 */
export interface CollapsibleTabsProps {
  /** Array of tab configurations */
  tabs: CollapsibleTabConfig[];
  /** Currently selected tab ID */
  selectedTab: string;
  /** Callback when a tab is selected */
  onTabChange: (tabId: string) => void;
  /** Additional class name for the container */
  className?: string;
  /** Additional class name for individual tab buttons */
  tabClassName?: string;
  /** Additional class name for the active tab */
  activeTabClassName?: string;
  /** Additional class name for inactive tabs */
  inactiveTabClassName?: string;
}

/** Width reserved for the more button and margin */
const MORE_BUTTON_RESERVED_WIDTH = 56;
/** Debounce delay for resize calculations */
const RESIZE_DEBOUNCE_MS = 50;
/** Default estimated tab width when not yet measured */
const DEFAULT_TAB_WIDTH = 80;

/**
 * CollapsibleTabs - A responsive tabs component that automatically handles overflow.
 *
 * When tabs exceed the available horizontal space, a ">>" button appears that reveals
 * a dropdown menu containing the hidden tabs.
 *
 * Features:
 * - Automatic overflow detection using ResizeObserver
 * - Responsive behavior on window/container resize
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Accessibility (ARIA labels, roles)
 */
export function CollapsibleTabs({
  tabs,
  selectedTab,
  onTabChange,
  className,
  tabClassName,
  activeTabClassName,
  inactiveTabClassName,
}: CollapsibleTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabWidthsRef = useRef<Map<string, number>>(new Map());
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [visibleTabs, setVisibleTabs] = useState<string[]>(() => tabs.map((t) => t.id));
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedDropdownIndex, setFocusedDropdownIndex] = useState(-1);

  const showMoreButton = hiddenTabs.length > 0;

  /** Memoized tab label lookup */
  const tabLabelMap = useMemo(() => {
    return new Map(tabs.map((t) => [t.id, t.label]));
  }, [tabs]);

  /** Memoized tab index lookup for ordering */
  const tabIndexMap = useMemo(() => {
    return new Map(tabs.map((t, i) => [t.id, i]));
  }, [tabs]);

  /**
   * Measures tab widths from the DOM
   */
  const measureTabs = useCallback(() => {
    if (!navRef.current) return;

    navRef.current.querySelectorAll<HTMLButtonElement>('[data-tab-id]').forEach((button) => {
      const tabId = button.getAttribute('data-tab-id');
      if (tabId) {
        const style = window.getComputedStyle(button);
        const width =
          button.getBoundingClientRect().width +
          parseFloat(style.marginLeft || '0') +
          parseFloat(style.marginRight || '0') +
          1; // Sub-pixel buffer
        tabWidthsRef.current.set(tabId, width);
      }
    });
  }, []);

  /**
   * Calculates which tabs should be visible based on available width
   */
  const calculateVisibility = useCallback(() => {
    const container = containerRef.current;
    const nav = navRef.current;
    if (!container || !nav) return;

    const containerWidth = container.getBoundingClientRect().width;
    if (containerWidth === 0) return;

    const containerStyle = window.getComputedStyle(container);
    const containerPadding =
      parseFloat(containerStyle.paddingLeft || '0') +
      parseFloat(containerStyle.paddingRight || '0');

    // Calculate total width of all tabs
    let totalWidth = 0;
    for (const tab of tabs) {
      totalWidth += tabWidthsRef.current.get(tab.id) ?? DEFAULT_TAB_WIDTH;
    }

    const availableWidthFull = containerWidth - containerPadding;

    // If all tabs fit, show them all
    if (totalWidth <= availableWidthFull) {
      setVisibleTabs(tabs.map((t) => t.id));
      setHiddenTabs([]);
      return;
    }

    // Calculate with space reserved for more button
    const availableWidth = availableWidthFull - MORE_BUTTON_RESERVED_WIDTH;
    const visible: string[] = [];
    const hidden: string[] = [];
    let currentWidth = 0;

    // Always include selected tab first
    if (tabs.some((t) => t.id === selectedTab)) {
      visible.push(selectedTab);
      currentWidth = tabWidthsRef.current.get(selectedTab) ?? DEFAULT_TAB_WIDTH;
    }

    // Add remaining tabs in order until overflow
    for (const tab of tabs) {
      if (tab.id === selectedTab) continue;

      const tabWidth = tabWidthsRef.current.get(tab.id) ?? DEFAULT_TAB_WIDTH;

      if (currentWidth + tabWidth < availableWidth) {
        visible.push(tab.id);
        currentWidth += tabWidth;
      } else {
        hidden.push(tab.id);
      }
    }

    // Sort by original order
    const sortByOriginalOrder = (a: string, b: string) =>
      (tabIndexMap.get(a) ?? 999) - (tabIndexMap.get(b) ?? 999);

    setVisibleTabs(visible.sort(sortByOriginalOrder));
    setHiddenTabs(hidden.sort(sortByOriginalOrder));
  }, [tabs, selectedTab, tabIndexMap]);

  /**
   * Debounced recalculation
   */
  const recalculate = useCallback(() => {
    clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = setTimeout(() => {
      measureTabs();
      calculateVisibility();
    }, RESIZE_DEBOUNCE_MS);
  }, [measureTabs, calculateVisibility]);

  // Handle tab click
  const handleTabClick = useCallback(
    (tabId: string) => {
      onTabChange(tabId);
      setIsDropdownOpen(false);
    },
    [onTabChange],
  );

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
    setFocusedDropdownIndex(-1);
  }, []);

  // Keyboard navigation for dropdown
  const handleDropdownKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isDropdownOpen || hiddenTabs.length === 0) return;

      const key = event.key;
      if (key === 'ArrowDown') {
        event.preventDefault();
        setFocusedDropdownIndex((prev) => (prev < hiddenTabs.length - 1 ? prev + 1 : 0));
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        setFocusedDropdownIndex((prev) => (prev > 0 ? prev - 1 : hiddenTabs.length - 1));
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (focusedDropdownIndex >= 0) {
          handleTabClick(hiddenTabs[focusedDropdownIndex]);
        }
      } else if (key === 'Escape') {
        event.preventDefault();
        setIsDropdownOpen(false);
        moreButtonRef.current?.focus();
      } else if (key === 'Tab') {
        setIsDropdownOpen(false);
      }
    },
    [isDropdownOpen, hiddenTabs, focusedDropdownIndex, handleTabClick],
  );

  // Keyboard navigation for more button
  const handleMoreButtonKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleDropdown();
      } else if (event.key === 'ArrowDown' && !isDropdownOpen) {
        event.preventDefault();
        setIsDropdownOpen(true);
        setFocusedDropdownIndex(0);
      }
    },
    [toggleDropdown, isDropdownOpen],
  );

  // Setup ResizeObserver and initial measurement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement after render
    requestAnimationFrame(() => {
      measureTabs();
      calculateVisibility();
    });

    const resizeObserver = new ResizeObserver(recalculate);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeoutRef.current);
    };
  }, [measureTabs, calculateVisibility, recalculate]);

  // Recalculate when tabs or selection changes
  useEffect(() => {
    recalculate();
  }, [tabs, selectedTab, recalculate]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !dropdownRef.current?.contains(target) &&
        !moreButtonRef.current?.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen]);

  // Focus dropdown item on index change
  useEffect(() => {
    if (isDropdownOpen && focusedDropdownIndex >= 0) {
      dropdownRef.current?.querySelectorAll<HTMLButtonElement>('button')[focusedDropdownIndex]?.focus();
    }
  }, [isDropdownOpen, focusedDropdownIndex]);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex', className)}
      role="tablist"
      aria-label="Settings tabs"
    >
      {/* Visible tabs */}
      <div ref={navRef} className="flex flex-1 justify-around overflow-hidden">
        {visibleTabs.map((tabId) => {
          const isActive = selectedTab === tabId;
          return (
            <button
              key={tabId}
              data-tab-id={tabId}
              role="tab"
              id={`tab-${tabId}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tabId}`}
              className={cn(
                'text-sm font-medium px-2 py-1 after:content-["_"] after:w-0 after:border-b-2 after:border-v2-blue after:block after:mt-1 whitespace-nowrap',
                isActive
                  ? cn('text-gray-900 after:w-full', activeTabClassName)
                  : cn('text-gray-500 hover:text-gray-700', inactiveTabClassName),
                tabClassName,
              )}
              onClick={() => handleTabClick(tabId)}
            >
              {tabLabelMap.get(tabId) ?? tabId}
            </button>
          );
        })}
      </div>

      {/* More button */}
      {showMoreButton && (
        <button
          ref={moreButtonRef}
          className="inline-flex items-center justify-center px-2 py-1 text-lg font-bold text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="More tabs"
          aria-expanded={isDropdownOpen}
          aria-haspopup="menu"
          onClick={toggleDropdown}
          onKeyDown={handleMoreButtonKeyDown}
        >
          <span className="pb-2" style={{ letterSpacing: '-2px', lineHeight: 1 }}>
            &raquo;
          </span>
        </button>
      )}

      {/* Dropdown menu */}
      {showMoreButton && isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]"
          role="menu"
          aria-orientation="vertical"
          aria-label="Hidden tabs menu"
          onKeyDown={handleDropdownKeyDown}
        >
          <div className="py-1">
            {hiddenTabs.map((tabId, index) => {
              const isActive = selectedTab === tabId;
              return (
                <button
                  key={tabId}
                  role="menuitem"
                  tabIndex={focusedDropdownIndex === index ? 0 : -1}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm font-medium',
                    isActive
                      ? 'text-gray-900 bg-gray-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                  )}
                  onClick={() => handleTabClick(tabId)}
                >
                  {tabLabelMap.get(tabId) ?? tabId}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollapsibleTabs;
