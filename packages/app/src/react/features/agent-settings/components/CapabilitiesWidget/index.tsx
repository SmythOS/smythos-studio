import SingleAgentSkillCallForm from '@react/features/agent-settings/components/CapabilitiesWidget/triggers/SingleAgentSkillCallForm';
import WidgetSubscribeInfo from '@react/features/agent-settings/components/widget-subscribe-info';
import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { WIDGETS_PRICING_ALERT_TEXT } from '@react/features/agent-settings/constants';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import IconToolTip from '@react/shared/components/_legacy/ui/tooltip/IconToolTip';
import { Component } from '@react/shared/types/agent-data.types';
import { EVENTS } from '@shared/posthog/constants/events';
import { PostHog } from '@src/shared/posthog';

import { Badge } from 'flowbite-react';
import { useState } from 'react';
import { FaPlay } from 'react-icons/fa';

type Props = {
  isSubscribedToPlan?: boolean;
  isWriteAccess: boolean;
};

const CapabilitiesWidget = ({ isSubscribedToPlan, isWriteAccess }: Props) => {
  const { latestAgentDeploymentQuery } = useAgentSettingsCtx();
  return (
    <WidgetCard isWriteAccess={isWriteAccess} showOverflow={true}>
      <div className={`bg-gray-50 p-4`} data-qa="agent-skills-container">
        <div className="flex justify-between items-center flex-col">
          <div className="w-full flex items-center justify-between">
            <div className="w-full">
              <h3 className="font-semibold text-sm mb-1">
                Agent Skills{' '}
                <IconToolTip html="Agent Skills in SmythOS define the capabilities of an agent. Each skill is added through the Agent Skill component" />
              </h3>
            </div>

            {latestAgentDeploymentQuery.isSuccess && latestAgentDeploymentQuery.data.deployment && (
              <Badge color="gray">v{latestAgentDeploymentQuery.data.deployment?.version}</Badge>
            )}
          </div>
          {!isSubscribedToPlan ? (
            <div className="w-full">
              <WidgetSubscribeInfo
                infoText={WIDGETS_PRICING_ALERT_TEXT.CAPABILITIES}
                analytics={{ page_url: '/agent-settings', source: 'agent skills' }}
              />
            </div>
          ) : (
            <>
              {latestAgentDeploymentQuery.isLoading && (
                <div className="flex flex-col gap-3 w-full mt-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <RowSkeleton key={i} />
                  ))}
                </div>
              )}

              <div className="flex flex-col mt-4 max-h-[97px] pr-1  overflow-y-auto w-full gap-3">
                {latestAgentDeploymentQuery.isSuccess &&
                  latestAgentDeploymentQuery.data.deployment &&
                  latestAgentDeploymentQuery.data.deployment?.aiAgentData.components
                    .filter((component) => component.name === 'APIEndpoint')
                    .map((component) => <Endpoint component={component} key={component.id} />)}

                {latestAgentDeploymentQuery.isSuccess &&
                  (!latestAgentDeploymentQuery.data.deployment ? (
                    <div className="flex items-center justify-center h-20">
                      <p className="text-sm text-gray-500">Deploy your agent to use skills</p>
                    </div>
                  ) : latestAgentDeploymentQuery.data.deployment?.aiAgentData?.components.length ===
                    0 ? (
                    <div className="flex items-center justify-center h-20">
                      <p className="text-sm text-gray-500">No skills available</p>
                    </div>
                  ) : null)}
              </div>
            </>
          )}
        </div>
      </div>
    </WidgetCard>
  );
};

function Endpoint({ component }: { component: Component }) {
  const [isTriggeringSkill, setIsTriggeringSkill] = useState(false);
  const { agentId } = useAgentSettingsCtx();

  return (
    <>
      <div className="flex justify-between group cursor-pointer">
        <p className="text-sm text-one-line" title={component.description}>
          {/* {component.data.description ? _.capitalize(component.data.description) : component.data.endpoint} */}
          {component.title}
        </p>
        <div className="flex gap-2 items-center">
          <button
            className=" flex group-hover:flex items-center"
            onClick={() => {
              PostHog.track(EVENTS.AGENT_SETTINGS_EVENTS.app_agent_skills_click, {
                button: 'call',
              });
              setIsTriggeringSkill(true);
            }}
          >
            <FaPlay className="w-3 h-3" color="#1a73e8" />
            <p className=" text-[#1A73E8] text-sm ml-1 font-semibold">Call </p>
          </button>
          <button
            className="  flex group-hover:flex items-center"
            onClick={() => {
              PostHog.track(EVENTS.AGENT_SETTINGS_EVENTS.app_agent_skills_click, {
                button: 'bulk work',
              });
              window.open(`/agent-settings/${agentId}/bulk/${component.id}`, '_blank');
            }}
          >
            <img src="/img/icons/Wrench.svg" alt="configure" className="w-4 h-4" />
            <p className=" text-[#1A73E8] text-sm ml-1 font-semibold">Bulk Work</p>
          </button>
        </div>
      </div>

      {isTriggeringSkill && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setIsTriggeringSkill(false)}
            />

            {/* Modal panel */}
            <div className="relative lg:w-[35vw] md:w-[40vw] bg-white rounded-lg shadow-xl">
              {/* Header */}
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">{component.title}</h3>
                {component.description && (
                  <p className="text-sm text-gray-500 mt-1">{component.description}</p>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <SingleAgentSkillCallForm component={component} />
              </div>

              {/* Close button */}
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                onClick={() => setIsTriggeringSkill(false)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* <BulkSkillCall component={component} agent={agentQuery.data} /> */}
    </>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between animate-pulse">
      <div className="h-3 bg-gray-200 rounded-sm dark:bg-gray-700 w-1/2"></div>
    </div>
  );
}

export default CapabilitiesWidget;
