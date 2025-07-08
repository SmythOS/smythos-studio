import { ServerStatus } from '@src/react/features/builder/components/debug-log-menu/ServerStatus';
import { DebugMenuTab, useDebugLogMenuCtx } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC } from 'react';

interface UnreadBadgeProps {
  count: number;
  isActive: boolean;
}

export const UnreadBadge: FC<UnreadBadgeProps> = ({ count, isActive }) => {
  if (count === 0 || isActive) return null;

  return (
    <div
      className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse duration-1000"
      data-testid="unread-badge"
    />
  );
};

/**
 * Navigation component for debug log menu tabs
 * Handles tab switching, unread counts, and menu expansion
 */
export const TabNavigation: FC = () => {
  const { activeTab, setActiveTab, isExpanded, toggleExpanded, unreadLogsCount, markLogsAsRead } =
    useDebugLogMenuCtx();

  /**
   * Returns the appropriate classes for a tab based on its active state
   */
  const getTabClasses = (tab: DebugMenuTab): string => {
    const baseClasses =
      'px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 relative select-none';
    const activeClasses =
      'bg-white text-gray-900 rounded-t-lg border-t border-x border-gray-200 shadow-[0_-1px_2px_rgba(0,0,0,0.05)]';
    const inactiveClasses = 'text-gray-600 hover:text-gray-900';

    return `${baseClasses} ${activeTab === tab ? activeClasses : inactiveClasses}`;
  };

  /**
   * Handles tab click events
   * Updates active tab and manages expanded state
   */
  const handleTabClick = (tab: DebugMenuTab) => {
    setActiveTab(tab);
    if (!isExpanded) {
      toggleExpanded();
    }
    // Clear notification when switching to logs tab
    if (tab === DebugMenuTab.LOGS) {
      markLogsAsRead();
    }
  };

  // Toggles the visibility of the bottom bar
  const toggleBottomBar = () => {
    const bottomBar = document.getElementById('bottom-bar');
    if (bottomBar) bottomBar.classList.toggle('hidden');
  };

  return (
    <nav
      className="flex justify-between items-center bg-gray-100 rounded-t-lg"
      data-testid="tab-navigation"
    >
      <div className="flex gap-1 px-2 pt-1">
        <div className="relative">
          <div
            className={getTabClasses(DebugMenuTab.LOGS)}
            onClick={() => handleTabClick(DebugMenuTab.LOGS)}
            role="tab"
            aria-selected={activeTab === DebugMenuTab.LOGS}
            tabIndex={0}
            data-testid="logs-tab"
          >
            Logs
            <UnreadBadge count={unreadLogsCount} isActive={activeTab === DebugMenuTab.LOGS} />
          </div>
        </div>
        <div
          className={getTabClasses(DebugMenuTab.NETWORK)}
          onClick={() => handleTabClick(DebugMenuTab.NETWORK)}
          role="tab"
          aria-selected={activeTab === DebugMenuTab.NETWORK}
          tabIndex={0}
          data-testid="network-tab"
        >
          Network
        </div>
        <div
          className={getTabClasses(DebugMenuTab.SOURCE)}
          onClick={() => handleTabClick(DebugMenuTab.SOURCE)}
          role="tab"
          aria-selected={activeTab === DebugMenuTab.SOURCE}
          tabIndex={0}
          data-testid="source-tab"
        >
          Source
        </div>
      </div>

      <div className="flex items-center gap-2 px-4">
        <ServerStatus />

        <button
          type="button"
          className="p-0.5 rounded-full"
          onClick={toggleBottomBar}
          data-testid="close-button"
          aria-label="Close debug menu"
        >
          <svg
            className="w-6 h-6 text-[#757575]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
};
