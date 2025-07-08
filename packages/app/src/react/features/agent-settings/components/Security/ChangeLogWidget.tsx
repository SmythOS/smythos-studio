import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { Spinner } from '@react/shared/components/ui/spinner';

type Props = {
  isWriteAccess?: boolean;
  allDeployments: any;
};

const ChangeLogWidget = ({ isWriteAccess, allDeployments }: Props) => {
  const { agentId } = useAgentSettingsCtx();

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess} showOverflow={true}>
      <div className="flex flex-col bg-gray-50 p-4" data-qa="changelog-container">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Changelog</h3>
            </div>
            <p className="text-sm text-gray-500">
              These are the workflows you've trained your agent on.
            </p>
          </div>
        </div>

        {allDeployments.isLoading ? (
          <div className="flex justify-center p-4">
            <Spinner />
          </div>
        ) : allDeployments.data?.deployments.length ? (
          <div className="mt-4 space-y-4 px-4 rounded-lg border border-solid border-gray-300 max-h-[360px] overflow-y-auto bg-white">
            {allDeployments.data.deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="bg-white py-4 border-solid border-b border-gray-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Version: {deployment.version}</span>
                      {deployment === allDeployments.data.deployments[0] && (
                        <span className="text-green-800 text-xs px-2 py-1">Live</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Release date: {new Date(deployment.createdAt).toLocaleDateString()}
                    </div>
                    {deployment.releaseNotes.trim() && (
                      <div className="text-sm text-gray-500">
                        Release notes: {deployment.releaseNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 p-4">No deployments found</div>
        )}
      </div>
    </WidgetCard>
  );
};

export default ChangeLogWidget;
