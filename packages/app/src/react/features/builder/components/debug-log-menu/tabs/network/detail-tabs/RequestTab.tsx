import { JSON_TREE_THEME } from '@src/react/features/builder/constants/debug-log';
import { DetailTabProps } from '@src/react/features/builder/types/debug-log-menu.type';
import { FC } from 'react';
import { JSONTree } from 'react-json-tree';

/**
 * Request tab in the request detail panel
 */
export const RequestTab: FC<DetailTabProps> = ({ request }) => {
  return (
    <div className="p-3 text-xs">
      <h3 className="font-medium text-gray-700 mb-2">Request Body</h3>

      <div className="bg-white p-3 rounded border border-gray-200">
        {request.requestBody ? (
          <JSONTree
            data={request.requestBody}
            theme={JSON_TREE_THEME}
            hideRoot={true}
            shouldExpandNodeInitially={() => true}
          />
        ) : (
          <div className="text-gray-500">No request body</div>
        )}
      </div>

      <h3 className="font-medium text-gray-700 mt-4 mb-2">Request Headers</h3>
      <div className="bg-white p-3 rounded border border-solid border-gray-200">
        {Object.keys(request.requestHeaders || {}).length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-solid border-gray-200">
                <th className="text-left py-1 font-medium text-gray-600">Name</th>
                <th className="text-left py-1 font-medium text-gray-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(request.requestHeaders || {}).map(([key, value]) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="py-1 pr-4 font-medium">{key}</td>
                  <td className="py-1 text-gray-600">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500">No request headers</div>
        )}
      </div>
    </div>
  );
};
