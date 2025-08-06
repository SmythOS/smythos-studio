import { Workspace } from '@src/frontend/workspace/Workspace.class';
import DeploymentErrorBoundary from '@src/react/features/builder/components/agent-deployment-sidebar/DeploymentErrorBoundary';
import AgentDeploymentSidebarContent from '@src/react/features/builder/components/agent-deployment-sidebar/DeploymentSidebarContent';
import { DeploymentSidebarProvider } from '@src/react/features/builder/contexts/deployment-sidebar.context';

type Props = {
  workspace: Workspace;
};

const AgentDeploymentSidebar = ({ workspace }: Props) => {
  return (
      <DeploymentErrorBoundary fallback={<p>Something went wrong</p>}>
        <DeploymentSidebarProvider workspace={workspace}>
          <AgentDeploymentSidebarContent />
        </DeploymentSidebarProvider>
      </DeploymentErrorBoundary>
  );
};

export default AgentDeploymentSidebar;
