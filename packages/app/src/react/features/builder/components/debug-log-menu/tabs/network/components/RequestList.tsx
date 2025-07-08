import { StatusIndicator } from '@src/react/features/builder/components/debug-log-menu/tabs/network/components/StatusIndicator';
import { NetworkRequest } from '@src/react/features/builder/contexts/debug-log-menu.context';
import {
  calculateSize,
  formatDuration,
  formatSize,
} from '@src/react/features/builder/utils/formatters';
import { FC } from 'react';
import { FaMoneyBillWave } from 'react-icons/fa';
import { IoMdTime } from 'react-icons/io';

interface RequestListProps {
  requests: NetworkRequest[];
  selectedRequest: string | null;
  onSelectRequest: (requestId: string) => void;
  isDetailOpen: boolean;
}

/**
 * List of network requests
 */
export const RequestList: FC<RequestListProps> = ({
  requests,
  selectedRequest,
  onSelectRequest,
  isDetailOpen,
}) => {
  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No network requests recorded
      </div>
    );
  }

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-12 text-xs font-medium text-gray-500 bg-gray-50 border-b border-solid border-gray-200 px-4 py-2 z-10">
        <div className={isDetailOpen ? 'col-span-12' : 'col-span-4'}>Component</div>
        {!isDetailOpen && (
          <>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Time</div>
          </>
        )}
      </div>

      <div className="overflow-auto" style={{ height: 'calc(100% - 100px)' }}>
        {/* Request Rows */}
        {requests.map((request) => {
          const isSelected = selectedRequest === request.eventId;
          const requestSize = calculateSize(request.requestBody);
          const responseSize = calculateSize(request.responseBody);
          const totalSize = requestSize + responseSize;
          const hasCostData = request.cost && request.cost.length > 0;

          return (
            <div
              key={request.eventId}
              className={`grid grid-cols-12 text-xs border-b border-gray-100 px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-blue-50' : ''
              }`}
              onClick={() => onSelectRequest(request.eventId)}
              data-request-id={request.eventId}
            >
              <div
                className={
                  isDetailOpen
                    ? 'col-span-12 flex items-center'
                    : 'col-span-4 flex items-center gap-2'
                }
              >
                <StatusIndicator status={request.status} />
                <div className="truncate ml-2 flex-1">
                  <div className="font-medium flex items-center gap-1">
                    {request.componentTitle}
                    {hasCostData && (
                      <span title="Has cost information" className="inline-flex text-yellow-500">
                        <FaMoneyBillWave size={10} />
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs truncate">{request.componentName}</div>
                </div>
              </div>

              {!isDetailOpen && (
                <>
                  <div className="col-span-2 flex items-center">
                    {request.state === 'pending' ? (
                      <span className="text-blue-500">Pending</span>
                    ) : request.status >= 200 && request.status < 300 ? (
                      <span className="text-green-600">{request.status}</span>
                    ) : (
                      <span className="text-red-500">{request.status || 'Error'}</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center text-gray-600">Component</div>
                  <div className="col-span-2 flex items-center text-gray-600">
                    {formatSize(totalSize)}
                  </div>
                  <div className="col-span-2 flex items-center gap-1 text-gray-600">
                    <IoMdTime size={14} className="text-gray-400" />
                    {formatDuration(request.duration)}
                    {hasCostData && (
                      <span title="Has cost information" className="ml-1 text-yellow-500">
                        <FaMoneyBillWave size={12} />
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
