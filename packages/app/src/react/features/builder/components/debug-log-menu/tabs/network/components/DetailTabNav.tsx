import { FC } from 'react';

interface DetailTabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/**
 * Navigation tabs for the request detail panel
 */
export const DetailTabNav: FC<DetailTabNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'headers', label: 'Headers' },
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
    { id: 'timing', label: 'Timing' },
    { id: 'cost', label: 'Cost' },
  ];

  return (
    <div className="flex border-b border-solid border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
