import SectionHeader from '@react/features/agent-settings/components/ScheduleWidget/meta/SectionTitle';
import { StepChildMethods, StepProps } from '@react/features/agent-settings/components/ScheduleWidget/modes/create/CreateSchedule';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import classNames from 'classnames';
import { forwardRef, useState } from 'react';

const EndpointSelection = forwardRef<StepChildMethods, StepProps>(({ actions, formData }, ref) => {
  const { latestAgentDeploymentQuery } = useAgentSettingsCtx();
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(
    formData.componentId,
  );

  const deployedEndpoints =
    latestAgentDeploymentQuery?.data?.deployment?.aiAgentData?.components.filter(
      (component) => component.name === 'APIEndpoint',
    );

  return (
    <div className="w-full">
      <SectionHeader title="New Routine" subtitle="Choose an endpoint to schedule" />

      <div className="flex flex-col gap-3 w-full mt-5">
        {latestAgentDeploymentQuery.isSuccess &&
          latestAgentDeploymentQuery?.data.deployment &&
          latestAgentDeploymentQuery.data.deployment.aiAgentData?.components
            .filter((component) => component.name === 'APIEndpoint')
            .map((component) => {
              return (
                <div className="flex justify-between group cursor-pointer" key={component.id}>
                  <button
                    onClick={() => {
                      setSelectedComponentId(component.id);
                      actions?.handleFormDataChange({ componentId: component.id });
                      actions.setCanSubmit(true);
                    }}
                  >
                    <p
                      className={classNames(
                        'text-sm text-one-line font-semibold group-hover:text-blue-500',
                        selectedComponentId === component.id ? 'text-blue-500' : '',
                      )}
                      title={component.description}
                    >
                      {component.title}
                      <span className="text-xs inline text-gray-400">
                        {' '}
                        - /{component.data.endpoint}
                      </span>
                    </p>
                  </button>
                </div>
              );
            })}

        {latestAgentDeploymentQuery.isSuccess && deployedEndpoints.length === 0 && (
          <div className="text-gray-500 text-sm text-center">
            No endpoints available. Please create one first.
          </div>
        )}
      </div>
    </div>
  );
});

export default EndpointSelection;
