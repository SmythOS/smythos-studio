import { LogsContent } from '@src/react/features/builder/components/debug-log-menu/tabs/LogsContent';
import { NetworkContent } from '@src/react/features/builder/components/debug-log-menu/tabs/NetworkContent';
import { SourceContent } from '@src/react/features/builder/components/debug-log-menu/tabs/SourceContent';
import { DebugMenuTab, useDebugLogMenuCtx } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC } from 'react';

export const TabContent: FC = () => {
  const { activeTab } = useDebugLogMenuCtx();

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden bg-white h-full`}
    >
      {activeTab === DebugMenuTab.LOGS && <LogsContent />}
      {activeTab === DebugMenuTab.SOURCE && <SourceContent />}
      {activeTab === DebugMenuTab.NETWORK && <NetworkContent />}
    </div>
  );
};