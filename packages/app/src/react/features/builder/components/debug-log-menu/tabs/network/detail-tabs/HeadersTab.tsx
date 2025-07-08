import { DetailTabProps } from '@src/react/features/builder/types/debug-log-menu.type';
import { FC } from 'react';

/**
 * Headers tab in the request detail panel
 */
export const HeadersTab: FC<DetailTabProps> = ({ request }) => {
  const generalHeaders = [
    { name: 'Request Method', value: request.method },
    { name: 'Status Code', value: request.status.toString() },
    { name: 'Component', value: request.componentName },
    { name: 'Component Title', value: request.componentTitle },
  ];

  return (
    <div className="p-3 text-xs">
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 mb-2">General</h3>
        <div className="bg-white rounded border border-gray-200">
          {generalHeaders.map((header, i) => (
            <div
              key={header.name}
              className={`grid grid-cols-3 px-3 py-1.5 ${
                i !== generalHeaders.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="font-medium text-gray-600">{header.name}:</div>
              <div className="col-span-2 text-gray-800">{header.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* <div className="mb-4">
        <h3 className="font-medium text-gray-700 mb-2">Response Headers</h3>
        <div className="bg-white rounded border border-gray-200">
          {request.responseHeaders ? (
            Object.entries(request.responseHeaders).map(([key, value], i, arr) => (
              <div 
                key={key} 
                className={`grid grid-cols-3 px-3 py-1.5 ${i !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="font-medium text-gray-600">{key}:</div>
                <div className="col-span-2 text-gray-800 break-words">{value}</div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500">No response headers</div>
          )}
        </div>
      </div> */}
    </div>
  );
};
