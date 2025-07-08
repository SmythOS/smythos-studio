import {
  NetworkRequest,
  useDebugLogMenuCtx,
} from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC, useEffect, useRef } from 'react';
import { FaCheck } from 'react-icons/fa';
/**
 * Props for the network tab context menu
 */
export interface ContextMenuProps {
  /**
   * X position for the menu
   */
  x: number;
  /**
   * Y position for the menu
   */
  y: number;
  /**
   * Callback to close the menu
   */
  onClose: () => void;
  /**
   * Whether the waterfall view is currently shown
   */
  showWaterfall: boolean;
  /**
   * Callback to toggle waterfall visibility
   */
  toggleWaterfall: () => void;
  /**
   * The request item that was right-clicked on, if any
   */
  targetRequest?: NetworkRequest;
  /**
   * Callback to navigate to a component
   */
}

/**
 * Context menu component for the network tab
 * Appears on right-click and provides options for the network view
 */
export const ContextMenu: FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  showWaterfall,
  toggleWaterfall,
  targetRequest,
}) => {
  // Reference to the menu element for click-outside detection
  const menuRef = useRef<HTMLDivElement>(null);

  const { workspace } = useDebugLogMenuCtx();

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle waterfall toggle
  const handleWaterfallToggle = () => {
    console.log('Menu item clicked, toggling waterfall');
    toggleWaterfall();
    setTimeout(() => {
      onClose();
    }, 50); // Small delay to ensure the toggle happens before closing
  };

  // Handle navigate to component
  const handleNavigateToComponent = () => {
    if (targetRequest) {
      let componentId = targetRequest.componentId;
      const compItem = document.querySelector(`.component#${componentId}`);
      if (compItem) {
        workspace.scrollToComponent(compItem);
        workspace.refreshComponentSelection(compItem as HTMLElement);
        console.log('Navigated to component:', componentId);
      }
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute bg-white shadow-md rounded-md py-1 z-50 w-48 border border-gray-200 animate-fadeIn text-sm"
      style={{ top: y, left: x }}
      data-context-menu="true"
    >
      <div
        className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
        onClick={handleWaterfallToggle}
      >
        <span>Waterfall View</span>
        {showWaterfall && <FaCheck className="text-blue-500 text-xs" />}
      </div>

      {/* Show Navigate option only when a request is targeted */}
      {targetRequest && (
        <div
          className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer flex items-center justify-between border-t border-gray-100"
          onClick={handleNavigateToComponent}
        >
          <span className="flex items-center gap-2">
            <span>Navigate To Component</span>
          </span>
        </div>
      )}
    </div>
  );
};
