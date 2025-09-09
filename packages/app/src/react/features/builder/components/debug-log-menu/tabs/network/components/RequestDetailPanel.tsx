import { CloseIcon } from '@react/shared/components/svgs';
import { DetailTabNav } from '@src/react/features/builder/components/debug-log-menu/tabs/network/components/DetailTabNav';
import { CostTab } from '@src/react/features/builder/components/debug-log-menu/tabs/network/detail-tabs/CostTab';
import { HeadersTab } from '@src/react/features/builder/components/debug-log-menu/tabs/network/detail-tabs/HeadersTab';
import { RequestTab } from '@src/react/features/builder/components/debug-log-menu/tabs/network/detail-tabs/RequestTab';
import { ResponseTab } from '@src/react/features/builder/components/debug-log-menu/tabs/network/detail-tabs/ResponseTab';
import { TimingTab } from '@src/react/features/builder/components/debug-log-menu/tabs/network/detail-tabs/TimingTab';
import { NetworkRequest } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC, useState } from 'react';

interface RequestDetailPanelProps {
  request: NetworkRequest;
  onClose: () => void;
}

/**
 * Panel showing detailed information about a selected request
 */
export const RequestDetailPanel: FC<RequestDetailPanelProps> = ({ request, onClose }) => {
  const [activeTab, setActiveTab] = useState('headers');

  return (
    <div className="flex flex-col border-l border-gray-200" style={{ height: 'calc(100% - 40px)' }}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-[3px] border-b border-solid border-gray-200 bg-gray-50">
        <div className="flex-1 truncate flex items-center gap-2">
          <h2 className="font-medium text-sm truncate">{request.componentTitle}</h2>
          <p className="text-xs text-gray-500 truncate">- {request.componentName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      {/* Tab Navigation */}
      <DetailTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="overflow-auto pb-10" style={{ height: '340px' }}>
        {activeTab === 'headers' && <HeadersTab request={request} />}
        {activeTab === 'request' && <RequestTab request={request} />}
        {activeTab === 'response' && <ResponseTab request={request} />}
        {activeTab === 'timing' && <TimingTab request={request} />}
        {activeTab === 'cost' && <CostTab request={request} />}
      </div>
    </div>
  );
};
