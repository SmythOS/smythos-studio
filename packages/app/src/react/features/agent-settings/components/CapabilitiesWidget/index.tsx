import SingleAgentSkillCallForm from '@react/features/agent-settings/components/CapabilitiesWidget/triggers/SingleAgentSkillCallForm';
import WidgetSubscribeInfo from '@react/features/agent-settings/components/widget-subscribe-info';
import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { WIDGETS_PRICING_ALERT_TEXT } from '@react/features/agent-settings/constants';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { Component } from '@react/shared/types/agent-data.types';
import { EVENTS } from '@shared/posthog/constants/events';
import { CloseIcon } from '@src/react/shared/components/svgs';
import { plugins, PluginTarget, PluginType } from '@src/react/shared/plugins/Plugins';
import { PostHog } from '@src/shared/posthog';

import { Badge, Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FaPlay } from 'react-icons/fa';

type Props = {
  isOnPaidPlan?: boolean;
  isWriteAccess: boolean;
};

interface SkillBtnConfig {
  renderBtn: (componentId: string) => React.ReactNode;
}

const CapabilitiesWidget = ({ isOnPaidPlan: isSubscribedToPlan, isWriteAccess }: Props) => {
  const { latestAgentDeploymentQuery } = useAgentSettingsCtx();

  return (
    <WidgetCard isWriteAccess={isWriteAccess} showOverflow={true}>
      <div className={'bg-gray-50 p-4'} data-qa="agent-skills-container">
        <div className="flex justify-between items-center flex-col">
          <div className="w-full flex items-center justify-between">
            <div className="w-full">
              <h3 className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-1">
                Agent Skills
                <Tooltip
                  className="w-52 text-center"
                  content="Agent Skills in SmythOS define the capabilities of an agent. Each skill is added through the Agent Skill component"
                >
                  <Info className="w-4 h-4" />
                </Tooltip>
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

  let pluginItems = (
    plugins.getPluginsByTarget(
      PluginTarget.AgentSettingsSkillsWidgetSkillButton,
      PluginType.Config,
    ) as {
      config: SkillBtnConfig;
    }[]
  ).flatMap((item) => item.config);

  // const skillWidgetBtns = pluginItems.map((item) => item.renderBtn(component.id));
  const skillWidgetBtns = useMemo(
    () => pluginItems.map((item) => item.renderBtn(component.id)),
    [component.id],
  );

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
          {skillWidgetBtns}
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
                <h3 className="text-xl text-[#1E1E1E] font-semibold">{component.title}</h3>
                {component.description && (
                  <p className="text-sm text-gray-500 mt-1">{component.description}</p>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <SingleAgentSkillCallForm component={component} />
              </div>

              {/* Close button */}
              <div
                className="absolute top-4 right-4 text-[#1E1E1E] hover:text-gray-500 cursor-pointer hover:bg-gray-100 rounded-lg p-2 -mr-2 -mt-2"
                onClick={() => setIsTriggeringSkill(false)}
              >
                <CloseIcon width={16} height={16} />
              </div>
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
