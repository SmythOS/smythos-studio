import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { useMemo } from 'react';

type Props = {
  isWriteAccess: boolean;
};

const MyToolsWidget = (props: Props) => {
  const { agentQuery } = useAgentSettingsCtx();

  const distinctComponents = useMemo(() => {
    if (!agentQuery.data?.data.components) return [];
    const data = [];
    agentQuery.data?.data.components.forEach((component) => {
      if (
        !data.find((c) => c.name === component.name) &&
        component.name?.toLowerCase() !== 'note'
      ) {
        data.push(component);
      }
    });

    return data;
  }, [agentQuery.data?.data.components]);

  return (
    <WidgetCard isWriteAccess={props.isWriteAccess}>
      <div className="bg-gray-50 p-4 " data-qa="my-tools-container">
        <div className="flex justify-between items-center flex-col ">
          <div className="w-full">
            <h3 className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
              My Tools
            </h3>
            <p className="text-sm text-gray-500">
              These are the tools your agent uses to complete their workflow.
            </p>
          </div>

          {agentQuery.isLoading && <ToolsSkeletion />}

          <div className="flex flex-col mt-4 gap-y-3 gap-x-14 w-full flex-wrap overflow-x-scroll max-h-[65px]">
            {distinctComponents.slice(0, 4).map((component) => (
              <div key={component.id} className="flex items-center">
                <span className={`icon svg-icon ${component.name} w-6 min-h-[21px] mr-3`}>
                  {component.data?.logoUrl && (
                    <img src={component.data.logoUrl} alt={component.displayName} />
                  )}
                </span>
                <p className="text-sm">{component.displayName}</p>
              </div>
            ))}

            {/* Empty */}
            {distinctComponents.length === 0 && agentQuery.isSuccess && (
              <div className="flex items-center justify-center h-20">
                <p className="text-sm text-gray-500">No tools available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
};

function ToolsSkeletion() {
  return (
    <div className="flex flex-col mt-4 gap-y-3 gap-x-14 w-full flex-wrap overflow-x-scroll max-h-[65] animate-pulse">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center w-[116px]">
          <div className="h-6 w-6 bg-gray-200 rounded-full dark:bg-gray-700 mr-2"></div>
          <div className="h-5 bg-gray-200 rounded-sm dark:bg-gray-700 flex-1"></div>
        </div>
      ))}
    </div>
  );
}

export default MyToolsWidget;
