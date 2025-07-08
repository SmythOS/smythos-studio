import { FC } from 'react';

/**
 * Visual indicator for request status
 */
export const StatusIndicator: FC<{ status: number }> = ({ status }) => {
  let bgColor = 'bg-gray-200';

  if (status === 0) {
    bgColor = 'bg-blue-200';
  } else if (status >= 200 && status < 300) {
    bgColor = 'bg-green-200';
  } else if (status >= 300 && status < 400) {
    bgColor = 'bg-yellow-200';
  } else if (status >= 400) {
    bgColor = 'bg-red-200';
  }

  return <div className={`w-2 h-2 rounded-full ${bgColor}`} />;
};
