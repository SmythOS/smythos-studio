import { getAgent } from '@react/features/agent-settings/clients';
import BulkSkillCallForm from '@react/features/agent-settings/components/CapabilitiesWidget/triggers/BulkSkillCallForm';
import { Spinner } from '@react/shared/components/ui/spinner';
import { DeploymentWithAgentSnapshot } from '@react/shared/types/api-results.types';
import FullScreenError from '@src/react/features/error-pages/pages/FullScreenError';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb } from 'flowbite-react';
import { HiHome } from 'react-icons/hi';
import { Link, useParams } from 'react-router-dom';

const AgentSettingsBulkCallPage = () => {
  const { agentId, componentId } = useParams();
 
  const agentQuery = useQuery({
    queryKey: ['agent_data_settings', agentId],
    queryFn: () => getAgent(agentId),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const latestAgentDeploymentQuery = useQuery({
    queryKey: ['latest_deployment', agentId],
    queryFn: () =>
      fetch(`/api/page/agent_settings/ai-agent/${agentId}/deployments/latest`).then(
        (res) => res.json() as Promise<{ deployment: DeploymentWithAgentSnapshot }>,
      ),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  if (agentQuery.isLoading || latestAgentDeploymentQuery.isLoading) {
    return (
      <div className="w-screen h-[calc(100vh-4rem)] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (agentQuery.isError) {
    return <FullScreenError error={{ message: "Agent doesn't exist", code: '404' }} />;
  } else if (latestAgentDeploymentQuery.isError) {
    return <FullScreenError error={{ message: 'Application Error', code: '500' }} />;
  }

  if (latestAgentDeploymentQuery.data.deployment === null) {
    return <FullScreenError error={{ message: 'No deployment found', code: '404' }} />;
  }

  const component = agentQuery.data.data.components.find(
    (component) => component.id === componentId,
  );

  if (!component) {
    return <FullScreenError error={{ message: "Component doesn't exist", code: '404' }} />;
  }
  const breadcrumb = (
    <Breadcrumb aria-label="Breadcrumb" className="mb-2 sm:mb-0">
      <Breadcrumb.Item icon={HiHome}>
        <Link to="/agents">Home</Link>
      </Breadcrumb.Item>

      <Breadcrumb.Item>
        <Link to={`/agent-settings/${agentId}`}>'{agentQuery.data.name}' Settings</Link>
      </Breadcrumb.Item>
      <Breadcrumb.Item>Bulk Call</Breadcrumb.Item>
    </Breadcrumb>
  );
  return (
    <div className="sm-container mt-6 mx-auto pb-16 min-h-[1000px]">
      <div className="mt-6 flex justify-between items-center">{breadcrumb}</div>
      <div className="mt-12">
        <BulkSkillCallForm
          agentId={agentId}
          component={component}
          agent={agentQuery.data}
          latestAgentDeploymentQuery={latestAgentDeploymentQuery}
        />
      </div>
    </div>
  );
};

export default AgentSettingsBulkCallPage;
