import { ContextMenu } from '@src/react/features/builder/components/debug-log-menu/tabs/network/components/ContextMenu';
import { RequestDetailPanel } from '@src/react/features/builder/components/debug-log-menu/tabs/network/components/RequestDetailPanel';
import { RequestList } from '@src/react/features/builder/components/debug-log-menu/tabs/network/components/RequestList';
import { Toolbar } from '@src/react/features/builder/components/debug-log-menu/tabs/network/components/Toolbar';
import { WaterfallView } from '@src/react/features/builder/components/debug-log-menu/tabs/network/components/WaterfallView';
import {
  NetworkRequest,
  useDebugLogMenuCtx,
} from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Network tab content showing component API calls
 */
export const NetworkContent: FC = () => {
  const {
    networkRequestsArray,
    clearNetworkRequests,
    isNetworkRecording,
    toggleNetworkRecording,
    networkUIState,
    updateNetworkUIState,
    workspace,
  } = useDebugLogMenuCtx();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0]);

  // State for context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetRequest?: NetworkRequest;
  } | null>(null);

  // Container ref for right-click handling
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter requests based on search term and time range
  const filteredRequests = useMemo(() => {
    // First filter by time range
    const timeFiltered = networkRequestsArray.filter((req) => {
      const start = req.startTime;
      const end = req.endTime || start + (req.duration || 0);

      // Include if any part of the request is within the range
      return start <= timeRange[1] && end >= timeRange[0];
    });

    // Then filter by component name
    const componentFiltered = timeFiltered.filter((req) =>
      networkUIState.filters.selectedComponentNames.includes(req.componentName),
    );

    // Then filter by search term
    if (!searchTerm) return componentFiltered;

    return componentFiltered.filter(
      (req) =>
        req.componentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.componentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.url.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [networkRequestsArray, searchTerm, timeRange, networkUIState.filters.selectedComponentNames]);

  // Get the selected request object
  const selectedRequestObj = useMemo(() => {
    if (!selectedRequest) return null;
    return networkRequestsArray.find((req) => req.eventId === selectedRequest) || null;
  }, [selectedRequest, networkRequestsArray]);

  const handleCopyRequests = () => {
    const requestsText = JSON.stringify(filteredRequests, null, 2);
    navigator.clipboard.writeText(requestsText);
  };

  const handleDownloadRequests = () => {
    const requestsText = JSON.stringify(filteredRequests, null, 2);
    const blob = new Blob([requestsText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-requests-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequest(selectedRequest === requestId ? null : requestId);
  };

  const handleRangeChange = (range: [number, number]) => {
    setTimeRange(range);
  };

  // Toggle waterfall view
  const toggleWaterfall = useCallback(() => {
    console.log(
      'Toggling waterfall from',
      networkUIState.showWaterfall,
      'to',
      !networkUIState.showWaterfall,
    );
    updateNetworkUIState({ showWaterfall: !networkUIState.showWaterfall });
  }, [networkUIState.showWaterfall, updateNetworkUIState]);

  // Find the request element that was clicked
  const findTargetRequest = (e: MouseEvent): NetworkRequest | undefined => {
    // Find the closest request item element
    const requestElement = (e.target as HTMLElement).closest('[data-request-id]');
    if (requestElement) {
      const requestId = requestElement.getAttribute('data-request-id');
      if (requestId) {
        return networkRequestsArray.find((req) => req.eventId === requestId);
      }
    }
    return undefined;
  };

  // Handle right-click for context menu
  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Stop event propagation

      // Get container's bounding rect to calculate relative position
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate position relative to the container
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;

      // Ensure menu stays within container bounds
      const maxX = containerRect.width - 160; // 160px is menu width
      const maxY = containerRect.height - 80; // 80px is approximate menu height

      const adjustedX = Math.min(x, maxX);
      const adjustedY = Math.min(y, maxY);

      // Find if we're right-clicking on a request item
      const targetRequest = findTargetRequest(e);

      console.log(
        'Right click detected at:',
        adjustedX,
        adjustedY,
        'Target request:',
        targetRequest?.componentName,
      );
      setContextMenu({
        x: adjustedX,
        y: adjustedY,
        targetRequest,
      });
    },
    [networkRequestsArray],
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    console.log('Closing context menu');
    setContextMenu(null);
  }, []);

  // Add click handler to close context menu when clicking anywhere in the container
  useEffect(() => {
    const handleClick = (e) => {
      // Don't close if clicking on the context menu itself
      const contextMenuElement = document.querySelector('[data-context-menu="true"]');
      if (contextMenu && contextMenuElement && !contextMenuElement.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => {
        document.removeEventListener('click', handleClick);
      };
    }
  }, [contextMenu, closeContextMenu]);

  return (
    <div
      className="flex flex-col h-full relative"
      ref={containerRef}
      onContextMenu={handleContextMenu}
      title="Right-click for options"
    >
      {/* Toolbar */}
      <Toolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onCopy={handleCopyRequests}
        onDownload={handleDownloadRequests}
        onClear={clearNetworkRequests}
        isRecording={isNetworkRecording}
        toggleRecording={toggleNetworkRecording}
        filters={networkUIState.filters}
        updateFilters={(selectedNames) => {
          updateNetworkUIState({
            filters: {
              ...networkUIState.filters,
              selectedComponentNames: selectedNames,
            },
          });
        }}
      />

      {/* Recording Status Banner (when not recording) */}
      {!isNetworkRecording && (
        <div className="bg-red-50 text-red-600 text-xs px-4 py-1 border-b border-red-200">
          Network recording is paused. Click the record button to resume capturing network activity.
        </div>
      )}

      {/* Waterfall View - with animation */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden cursor-context-menu ${
          networkUIState.showWaterfall ? 'max-h-[150px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        data-waterfall-visible={networkUIState.showWaterfall ? 'true' : 'false'}
      >
        {networkRequestsArray.length > 0 && (
          <WaterfallView
            requests={networkRequestsArray}
            selectedRequest={selectedRequest}
            onSelectRequest={handleSelectRequest}
            onRangeChange={handleRangeChange}
          />
        )}
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Request List - only show requests in the selected time range */}
        <div className={`${selectedRequestObj ? 'w-1/4' : 'w-full'} transition-all duration-300 `}>
          <RequestList
            requests={filteredRequests}
            selectedRequest={selectedRequest}
            onSelectRequest={handleSelectRequest}
            isDetailOpen={!!selectedRequestObj}
          />
        </div>

        {/* Detail Panel */}
        {selectedRequestObj && (
          <div className="w-3/4 overflow-hidden animate-fadeIn">
            <RequestDetailPanel
              request={selectedRequestObj}
              onClose={() => setSelectedRequest(null)}
            />
          </div>
        )}
      </div>

      {/* Context Menu - Render as a portal to avoid containment issues */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          showWaterfall={networkUIState.showWaterfall}
          toggleWaterfall={toggleWaterfall}
          targetRequest={contextMenu.targetRequest}
        />
      )}
    </div>
  );
};
