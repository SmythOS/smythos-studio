import { DetailTabProps } from '@src/react/features/builder/types/debug-log-menu.type';
import { formatDuration } from '@src/react/features/builder/utils/formatters';
import { FC } from 'react';
import { IoWarningOutline } from 'react-icons/io5';
/**
 * Timing tab in the request detail panel
 */
export const TimingTab: FC<DetailTabProps> = ({ request }) => {
  // Calculate percentages for visualization
  const duration = request.duration || 0;
  const maxDuration = Math.max(duration, 100); // Ensure we have a minimum for visualization
  
  // For a real implementation, we would have more detailed timing info
  // Here we're simulating some reasonable values
  const timingBreakdown = {
    // stalled: Math.min(15, duration * 0.07),
    queueing:  duration * 0.05,
    processing:  duration * 0.95,
    // waiting: duration * 0.7,
    // receiving: duration * 0.08,
    // waiting:(window as any).debugCurrentRunningAgentTimestamp ? (Date.now() - (window as any).debugCurrentRunningAgentTimestamp) / 1000 : 0 // in seconds
  };
  
  const getWidth = (time: number) => `${(time / maxDuration) * 100}%`;
  const getLeft = (index: number) => {
    let left = 0;
    Object.values(timingBreakdown).slice(0, index).forEach(t => {
      left += t;
    });
    return getWidth(left);
  };
  
  const timingColors = {
    queueing: 'bg-gray-300',
    stalled: 'bg-yellow-300',
    processing: 'bg-blue-300',
    waiting: 'bg-green-300',
    receiving: 'bg-purple-300'
  };
  
  return (
    <div className="p-3 text-xs">
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 mb-2">Timing</h3>
        
        <div className="bg-white rounded border border-gray-200 p-3">
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="font-medium">Total Duration</span>
              <span>{formatDuration(duration)}</span>
            </div>
            
            <div className="h-6 relative bg-gray-100 rounded overflow-hidden">
              {Object.entries(timingBreakdown).map(([key, time], index) => (
                <div
                  key={key}
                  className={`absolute h-full ${timingColors[key as keyof typeof timingColors]}`}
                  style={{
                    width: getWidth(time),
                    left: getLeft(index)
                  }}
                />
              ))}
            </div>
            
            <div className="flex mt-2 text-xs gap-3">
              {Object.entries(timingBreakdown).map(([key, time]) => (
                <div key={key} className="flex items-center">
                  <div 
                    className={`w-3 h-3 mr-1 rounded-sm ${timingColors[key as keyof typeof timingColors]}`} 
                  />
                  <span className="mr-1">{key}:</span>
                  <span className="font-medium">{formatDuration(time)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-medium mb-1">Started</div>
              <div>{new Date(request.startTime).toLocaleTimeString()}</div>
            </div>
            {request.endTime && (
              <div>
                <div className="font-medium mb-1">Ended</div>
                <div>{new Date(request.endTime).toLocaleTimeString()}</div>
              </div>
            )}
          </div>


          {/* if Request did not yet end (no endTime) warn the user like in devtools chrome */}
          {!request.endTime && (
            <div className="text-yellow-500 text-xs">
              <IoWarningOutline className="inline-block mr-1" />
              This request did not yet end. It may still be ongoing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 