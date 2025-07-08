import { NetworkRequest } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { formatDuration } from '@src/react/features/builder/utils/formatters';
import { FC, MouseEvent, useEffect, useMemo, useRef, useState, WheelEvent } from 'react';
import { FiZoomIn } from 'react-icons/fi';

interface WaterfallViewProps {
  requests: NetworkRequest[];
  onSelectRequest: (requestId: string) => void;
  selectedRequest: string | null;
  onRangeChange: (range: [number, number]) => void;
}

/**
 * Waterfall view showing requests over time with a time range slider
 */
export const WaterfallView: FC<WaterfallViewProps> = ({
  requests,
  onSelectRequest,
  selectedRequest,
  onRangeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waterfallRef = useRef<HTMLDivElement>(null);

  // Fixed waterfall height
  const WATERFALL_HEIGHT = 100;

  // Zoom factor - how much to zoom in/out with each wheel tick
  const WHEEL_ZOOM_FACTOR = 0.1;

  // Drag speed factor - lower value = slower dragging
  const DRAG_SPEED_FACTOR = 0.6;

  // Minimum duration to allow (in ms)
  const MIN_DURATION = 500;

  // Calculate time range for all requests
  const timeRange = useMemo(() => {
    if (requests.length === 0) {
      // Default time range if no requests
      const now = Date.now();
      return { min: now - 60000, max: now };
    }

    const startTimes = requests.map((req) => req.startTime);
    const endTimes = requests.map((req) => req.endTime || req.startTime + (req.duration || 0));

    const min = Math.min(...startTimes);
    const max = Math.max(...endTimes);

    // Add some padding
    return {
      min,
      max: max + (max - min) * 0.05,
    };
  }, [requests]);

  // State for the time range slider
  const [range, setRange] = useState<[number, number]>([timeRange.min, timeRange.max]);
  const [isDragging, setIsDragging] = useState<null | 'left' | 'right' | 'middle' | 'waterfall'>(
    null,
  );
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRange, setDragStartRange] = useState<[number, number]>([0, 0]);
  const [isZooming, setIsZooming] = useState(false);

  // Update range when timeRange changes
  useEffect(() => {
    setRange([timeRange.min, timeRange.max]);
  }, [timeRange]);

  // Notify parent component when range changes
  useEffect(() => {
    onRangeChange(range);
  }, [range, onRangeChange]);

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => {
        if (!containerRef.current || !isDragging) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const deltaX = e.clientX - dragStartX;
        const deltaRatio = (deltaX / containerWidth) * DRAG_SPEED_FACTOR; // Apply drag speed factor
        const deltaTime = (timeRange.max - timeRange.min) * deltaRatio;

        let newRange: [number, number] = [...range];

        if (isDragging === 'left') {
          // Move left handle
          newRange[0] = Math.max(
            timeRange.min,
            Math.min(dragStartRange[0] + deltaTime, dragStartRange[1] - MIN_DURATION), // Ensure minimum duration
          );
        } else if (isDragging === 'right') {
          // Move right handle
          newRange[1] = Math.min(
            timeRange.max,
            Math.max(dragStartRange[1] + deltaTime, dragStartRange[0] + MIN_DURATION), // Ensure minimum duration
          );
        } else if (isDragging === 'middle' || isDragging === 'waterfall') {
          // Move both handles (entire selection)
          const rangeWidth = dragStartRange[1] - dragStartRange[0];

          // For waterfall panning, move in opposite direction of drag
          const direction = isDragging === 'waterfall' ? -1 : 1;

          // Calculate new positions
          let newStart = dragStartRange[0] + deltaTime * direction;
          let newEnd = dragStartRange[1] + deltaTime * direction;

          // Ensure we don't go out of bounds
          if (newStart < timeRange.min) {
            newStart = timeRange.min;
            newEnd = newStart + rangeWidth;
          }

          if (newEnd > timeRange.max) {
            newEnd = timeRange.max;
            newStart = newEnd - rangeWidth;
          }

          newRange = [newStart, newEnd];
        }

        setRange(newRange);
      };

      const handleMouseUp = () => {
        setIsDragging(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, dragStartRange, range, timeRange]);

  // Calculate visible duration
  const visibleDuration = range[1] - range[0];

  // Generic zoom function for wheel zooming
  const zoomByFactor = (factor: number, isZoomIn: boolean, cursorX?: number) => {
    const currentDuration = range[1] - range[0];
    const zoomAmount = currentDuration * factor;

    if (isZoomIn) {
      // Don't zoom in if we're already at minimum duration
      if (currentDuration <= MIN_DURATION) return;

      // Zoom in - calculate new range based on cursor position
      let newStart = range[0];
      let newEnd = range[1];

      if (cursorX !== undefined && waterfallRef.current) {
        // Get cursor position as percentage of container width
        const rect = waterfallRef.current.getBoundingClientRect();
        const cursorRatio = (cursorX - rect.left) / rect.width;

        // Apply zoom centered at cursor
        newStart = range[0] + zoomAmount * cursorRatio;
        newEnd = range[1] - zoomAmount * (1 - cursorRatio);

        // Make sure we don't go below minimum duration
        if (newEnd - newStart < MIN_DURATION) {
          const centerTime = newStart + (newEnd - newStart) / 2;
          newStart = centerTime - MIN_DURATION / 2;
          newEnd = centerTime + MIN_DURATION / 2;
        }
      } else {
        // No cursor position, zoom from center
        newStart = range[0] + zoomAmount / 2;
        newEnd = range[1] - zoomAmount / 2;
      }

      setRange([newStart, newEnd]);
      setIsZooming(true);
    } else {
      // Zoom out
      let newStart = range[0];
      let newEnd = range[1];

      if (cursorX !== undefined && waterfallRef.current) {
        // Get cursor position as percentage of container width
        const rect = waterfallRef.current.getBoundingClientRect();
        const cursorRatio = (cursorX - rect.left) / rect.width;

        // Apply zoom centered at cursor
        newStart = range[0] - zoomAmount * cursorRatio;
        newEnd = range[1] + zoomAmount * (1 - cursorRatio);
      } else {
        // No cursor position, zoom from center
        newStart = range[0] - zoomAmount / 2;
        newEnd = range[1] + zoomAmount / 2;
      }

      // Ensure we don't go outside the full time range
      if (newStart < timeRange.min) {
        newStart = timeRange.min;
      }

      if (newEnd > timeRange.max) {
        newEnd = timeRange.max;
      }

      setRange([newStart, newEnd]);
      setIsZooming(true);
    }

    // Clear zooming state after a brief delay
    setTimeout(() => setIsZooming(false), 300);
  };

  // Handle mouse wheel event for zooming
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Adjust zoom factor based on current zoom level
    const currentZoomPercentage = (timeRange.max - timeRange.min) / (range[1] - range[0]);
    const adjustedFactor = Math.min(
      WHEEL_ZOOM_FACTOR,
      WHEEL_ZOOM_FACTOR / (currentZoomPercentage / 5),
    );

    // Determine direction (negative deltaY means wheel up/zoom in)
    const isZoomIn = e.deltaY < 0;

    // Call the zoom function with the cursor position
    zoomByFactor(adjustedFactor, isZoomIn, e.clientX);
  };

  // Reset zoom to show all data
  const handleResetZoom = () => {
    setRange([timeRange.min, timeRange.max]);
    setIsZooming(true);
    setTimeout(() => setIsZooming(false), 300);
  };

  // Start panning the waterfall view
  const handleWaterfallMouseDown = (e: MouseEvent) => {
    // Only pan if left mouse button is clicked and not on a request bar
    if (e.button !== 0 || (e.target as HTMLElement).closest('.request-bar')) {
      return;
    }

    e.preventDefault();
    setIsDragging('waterfall');
    setDragStartX(e.clientX);
    setDragStartRange([...range]);
  };

  // Function to calculate position and width for a request bar
  const calculateBarStyles = (request: NetworkRequest) => {
    const start = request.startTime;
    const end = request.endTime || start + (request.duration || 100);

    // Skip if outside visible range
    if (end < range[0] || start > range[1]) {
      return { display: 'none' };
    }

    // Calculate position and width relative to visible range
    const left = Math.max(0, ((start - range[0]) / visibleDuration) * 100);
    const right = Math.min(100, ((range[1] - end) / visibleDuration) * 100);
    const width = 100 - left - right;

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  // Format timestamp for display
  const formatTimestamp = (time: number) => {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Generate time markers for the waterfall view
  const timeMarkers = useMemo(() => {
    const markers = [];
    const markerCount = 5; // More markers

    for (let i = 0; i <= markerCount; i++) {
      // Use the visible range for markers instead of full timeRange
      const time = range[0] + ((range[1] - range[0]) * i) / markerCount;
      markers.push({
        time,
        position: `${(i / markerCount) * 100}%`,
        label: formatTimestamp(time),
      });
    }

    return markers;
  }, [range]);

  // Calculate row positions for overlapping requests
  const requestRows = useMemo(() => {
    const rows: { [key: string]: number } = {};
    const rowEndTimes: number[] = [];

    // Sort requests by start time
    const sortedRequests = [...requests].sort((a, b) => a.startTime - b.startTime);

    sortedRequests.forEach((request) => {
      const start = request.startTime;
      const end = request.endTime || start + (request.duration || 100);

      // Skip if outside visible range
      if (end < range[0] || start > range[1]) {
        return;
      }

      // Find the first row where this request can fit
      let rowIndex = 0;
      while (rowEndTimes[rowIndex] && rowEndTimes[rowIndex] > start) {
        rowIndex++;
      }

      // Assign this request to the row
      rows[request.eventId] = rowIndex;
      rowEndTimes[rowIndex] = end;
    });

    return {
      rows,
      rowCount: Math.max(
        1,
        Object.keys(rows).length > 0 ? Math.max(...Object.values(rows)) + 1 : 1,
      ),
    };
  }, [requests, range]);

  // Calculate bar height based on number of rows
  const barHeight = useMemo(() => {
    const maxRows = Math.max(5, requestRows.rowCount); // At least 5 rows for spacing
    return Math.max(3, Math.min(18, Math.floor((WATERFALL_HEIGHT - 10) / maxRows)));
  }, [requestRows.rowCount]);

  // Generate a color based on component name
  const getComponentColor = (componentName: string) => {
    // Simple hash function to generate a number from a string
    let hash = 0;
    for (let i = 0; i < componentName.length; i++) {
      hash = componentName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to a hue value (0-360)
    const hue = Math.abs(hash % 360);

    // Use HSL with fixed saturation and lightness for pastel colors
    return `hsl(${hue}, 70%, 80%)`;
  };

  // Cache component colors
  const componentColors = useMemo(() => {
    const colors: Record<string, string> = {};

    // Get unique component names
    const componentNames = [...new Set(requests.map((req) => req.componentName))];

    // Generate a color for each component
    componentNames.forEach((name) => {
      colors[name] = getComponentColor(name);
    });

    return colors;
  }, [requests]);

  // Calculate zoom percentage
  const zoomPercentage = useMemo(() => {
    const fullRange = timeRange.max - timeRange.min;
    const currentRange = range[1] - range[0];
    return Math.round((fullRange / currentRange) * 100);
  }, [timeRange, range]);

  return (
    <div className="border-b border-solid border-gray-200" ref={containerRef}>
      <div className="text-xs text-gray-500 flex justify-between px-4 pt-1">
        <div>{formatTimestamp(range[0])}</div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <FiZoomIn
              className={`w-3 h-3 mr-1 ${
                zoomPercentage > 100 ? 'text-blue-600' : 'text-gray-500'
              } ${isZooming ? 'text-blue-800' : ''}`}
            />
          </div>

          <button
            className={`px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs ml-2 ${
              zoomPercentage > 100 ? 'visible' : 'invisible'
            }`}
            onClick={handleResetZoom}
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
        <div>{formatTimestamp(range[1])}</div>
      </div>

      <div className="px-4 pb-2 pt-1 relative mt-4">
        {/* Time grid lines and markers */}
        <div className="absolute inset-0 flex">
          {timeMarkers.map((marker, index) => (
            <div
              key={index}
              className="h-full flex flex-col bg-gray-100 w-[0.5px]"
              style={{ left: marker.position }}
            >
              <div className="text-xs text-gray-400 absolute -top-5 transform -translate-x-1/2">
                {index === 0 || index === timeMarkers.length - 1 ? '' : marker.label}
              </div>
            </div>
          ))}
        </div>

        {/* Waterfall container */}
        <div
          className={`relative transition-all duration-150 ${
            isZooming ? 'bg-blue-50 bg-opacity-20' : ''
          }`}
          ref={waterfallRef}
          onMouseDown={handleWaterfallMouseDown}
          onWheel={handleWheel}
          style={{ cursor: isDragging === 'waterfall' ? 'grabbing' : 'grab' }}
        >
          {/* Request bars */}
          <div className="relative" style={{ height: `${WATERFALL_HEIGHT}px` }}>
            {requests.map((request) => {
              const isSelected = selectedRequest === request.eventId;
              const barStyles = calculateBarStyles(request);

              // Skip if outside range
              if (barStyles.display === 'none') return null;

              // Get row position for this request
              const rowIndex = requestRows.rows[request.eventId] || 0;
              const topPosition = 5 + rowIndex * (barHeight + 2); // Add 2px gap between bars

              // Get component color
              const componentColor = componentColors[request.componentName];

              // Add border color based on status
              let borderColor = '';
              if (request.state === 'pending') {
                borderColor = 'border-blue-500';
              } else if (request.status >= 200 && request.status < 300) {
                borderColor = 'border-green-500';
              } else if (request.status >= 300 && request.status < 400) {
                borderColor = 'border-yellow-500';
              } else if (request.status >= 400) {
                borderColor = 'border-red-500';
              }

              // Create tooltip text
              const tooltipText = `${request.componentName} (${request.componentTitle})
Status: ${request.status}
Duration: ${formatDuration(request.duration)}
URL: ${request.url}`;

              return (
                <div
                  key={request.eventId}
                  className={`absolute flex items-center rounded cursor-pointer transition-all request-bar ${
                    isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'
                  } border ${borderColor}`}
                  style={{
                    ...barStyles,
                    height: `${barHeight}px`,
                    top: `${topPosition}px`,
                    zIndex: 2,
                    backgroundColor: componentColor,
                  }}
                  onClick={() => onSelectRequest(request.eventId)}
                  title={tooltipText}
                ></div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
