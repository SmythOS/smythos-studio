import { Workspace } from '@src/builder-ui/workspace/Workspace.class';
import { TabContent } from '@src/react/features/builder/components/debug-log-menu/TabContent';
import { TabNavigation } from '@src/react/features/builder/components/debug-log-menu/TabNavigation';
import { DebugLogMenuProvider } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC } from 'react';

interface DebugLogMenuProps {
  workspace: Workspace;
}

export const DebugLogMenu: FC<DebugLogMenuProps> = ({ workspace }) => {
  return (
    <DebugLogMenuProvider workspace={workspace}>
      <div className="relative h-full">
        <TabNavigation />
        <TabContent />
      </div>
    </DebugLogMenuProvider>
  );
};
