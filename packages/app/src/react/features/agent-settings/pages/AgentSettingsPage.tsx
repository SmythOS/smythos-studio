import ChatWithAgentWidget from '@react/features/agent-settings/components/Assignments/ChatWithAgentWidget';
import CapabilitiesWidget from '@react/features/agent-settings/components/CapabilitiesWidget';
import EnvironmentWidget from '@react/features/agent-settings/components/Deployments/EnvironmentWidget';
import EmbodimentsWidget from '@react/features/agent-settings/components/EmbodimentsWidget';
import MyToolsWidget from '@react/features/agent-settings/components/MyToolsWidget';
import OverviewWidgetsContainer from '@react/features/agent-settings/components/OverviewWidgetsContainer';
import AuthWidget from '@react/features/agent-settings/components/Security/AuthWidget';
import ChangeLogWidget from '@react/features/agent-settings/components/Security/ChangeLogWidget';
import {
  AgentSettingsProvider,
  useAgentSettingsCtx,
} from '@react/features/agent-settings/contexts/agent-settings.context';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { PRICING_PLAN_REDIRECT } from '@react/shared/constants/navigation';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import config from '@src/builder-ui/config';
import FullScreenError from '@src/react/features/error-pages/pages/FullScreenError';
import { plugins, PluginTarget, PluginType } from '@src/react/shared/plugins/Plugins';
import { Analytics } from '@src/shared/posthog/services/analytics';
import { Breadcrumb } from 'flowbite-react';
import { useEffect, useRef, useState } from 'react';
import { FaHome } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { BaseAgentSettingsTabs } from '../constants';

const OPEN_TAB = 'Overview';

type Props = {};

export const AgentSettingsPage = (props: Props) => {
  return (
    <AgentSettingsProvider>
      <AgentSettingsPageBody />
    </AgentSettingsProvider>
  );
};

export const AgentSettingTabs = () => {
  const { userInfo } = useAuthCtx();
  const { agentId, agentQuery, allDeploymentsQuery, latestAgentDeploymentQuery, pageAccess } =
    useAgentSettingsCtx();

  // Define type for session storage data
  type AgentTabStorage = {
    agentId: string;
    currentTab: string;
  };

  // Initialize currentTab from session storage or default to 'Agent'
  const [currentTab, setCurrentTab] = useState(() => {
    const storedData = sessionStorage.getItem('agentSettings');
    if (storedData) {
      const parsed = JSON.parse(storedData) as AgentTabStorage;
      return parsed.agentId === agentId ? parsed.currentTab : OPEN_TAB;
    }
    return OPEN_TAB;
  });
  useEffect(() => {
    sessionStorage.removeItem('agentSettings');
  });

  const isWriteAccess = pageAccess.write;
  const isOnPaidPlan = userInfo?.subs?.plan?.paid ?? false;

  const pluginWidgets = plugins.getPluginsByTarget(PluginTarget.AgentSettingsWidgets, PluginType.Config).flatMap((plugin) => (plugin as any).config).reduce((acc, plugin) => {
    Object.keys(plugin).forEach((key) => {
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(...plugin[key]);
    });
    return acc;
  }, {});


  const baseWidgets: Record<keyof typeof BaseAgentSettingsTabs, React.ReactNode[]> = {
    Overview: [<OverviewWidgetsContainer isWriteAccess={isWriteAccess} />],
    Security: [<AuthWidget isWriteAccess={isWriteAccess} />],
    Tasks: [
      <ChatWithAgentWidget
        isWriteAccess={isWriteAccess}
        isAgentDeployed={!!latestAgentDeploymentQuery?.data?.deployment}
      />,
      <CapabilitiesWidget isOnPaidPlan={isOnPaidPlan} isWriteAccess={isWriteAccess} />,
      <MyToolsWidget isWriteAccess={isWriteAccess} />,
    ],
    Deployments: [
      <EmbodimentsWidget
        agent={agentQuery?.data}
        agentId={agentId}
        isWriteAccess={isWriteAccess}
      />,
      <EnvironmentWidget
        isWriteAccess={isWriteAccess}
        isDeployed={allDeploymentsQuery?.data?.deployments?.length > 0}
      />,
      <ChangeLogWidget isWriteAccess={isWriteAccess} allDeployments={allDeploymentsQuery} />,
    ],
  };

  let mergedWidgets = {...baseWidgets, ...pluginWidgets};


  // we need to make sure that the original widgets objects are not overridden by the plugin widgets if the same key exists
  Object.keys(baseWidgets).forEach((key) => {
    if (pluginWidgets[key]) {
      mergedWidgets[key] = [...(baseWidgets[key] || []), ...(pluginWidgets[key] || [])];
    }
  });



  return (
    <>
      <div className="flex justify-around mb-6 border-solid border-b-2 border-gray-200">
        {Object.keys(mergedWidgets).map((name, index) => {
          return (
            <button
              key={index}
              id={`agent-settings-${name}`}
              className={`text-sm font-medium -mb-[2px] after:content-["_"] mt-2 after:w-0 after:border-b-2 after:border-v2-blue after:block after:transition-all after:duration-700 ${
                currentTab === name
                  ? 'text-gray-900 after:w-full'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setCurrentTab(name)}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-6">
        {Object.entries(mergedWidgets).map(([key, widgetlist]: [string, any[]], index) =>
          widgetlist.map((widget, index) => (
            <div key={index} hidden={currentTab !== key}>
              {widget}
            </div>
          )),
        )}
      </div>
    </>
  );
};

export const AgentSettingsPageBody = (props: Props) => {
  const { agentId, agentQuery, agentTestDomainQuery, settingsQuery } = useAgentSettingsCtx();
  const { userInfo } = useAuthCtx();
  const isOnPaidPlan = userInfo?.subs?.plan?.paid ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  if (!agentQuery.isLoading && !agentTestDomainQuery.isLoading) {
    if (agentQuery?.error?.['status'] == 403 || agentTestDomainQuery?.error?.['status'] == 403) {
      window.location.href = '/error/403';
    } else if (agentQuery.isError) {
      return <FullScreenError error={{ message: "Agent doesn't exist", code: '404' }} />;
    } else if (agentTestDomainQuery.isError) {
      return <FullScreenError error={{ message: 'Application Error', code: '500' }} />;
    }
  }

  const breadcrumb = (
    <Breadcrumb aria-label="Breadcrumb" className="mb-2 sm:mb-0">
      <Breadcrumb.Item icon={FaHome}>
        <Link to="/agents">Home</Link>
      </Breadcrumb.Item>

      {agentQuery.data?.name && (
        <Breadcrumb.Item>
          <Link to={`/agent-settings/${agentId}`}>'{agentQuery.data?.name}' Settings</Link>
        </Breadcrumb.Item>
      )}
    </Breadcrumb>
  );

  const handleUpgrade = () => {
    Analytics.track('upgrade_click', {
      page_url: '/agent_settings',
      source: 'upgrade button displayed alongside My Workflow',
    });
    window.location.href = config.env.IS_DEV ? '/plans' : PRICING_PLAN_REDIRECT;
  };

  useEffect(() => {
    Analytics.track('upgrade_impression', {
      page_url: '/agent_settings',
      source: 'upgrade button displayed alongside My Workflow',
    });
  }, []);

  useEffect(() => {
    if (agentQuery.isFetched && settingsQuery.isFetched) {
      containerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [agentQuery.isFetched, settingsQuery.isFetched]);

  return (
    <div ref={containerRef} className="w-full max-w-[822px] m-auto pb-10 pl-[58px] md:pl-0">
      <div className="flex justify-between items-center">{breadcrumb}</div>
      <div className="mt-3 flex justify-between items-center">
        <h2 className="text-3xl font-semibold">
          Agent Settings{' '}
          <p className=" text-base inline text-gray-500 hidden">
            - Alpha Prerelease -{' '}
            <a href="https://discord.gg/smythos" target="_blank" className="text-blue-500">
              Feedback
            </a>
          </p>
        </h2>

        <div className="flex gap-4">
          {!isOnPaidPlan && (
            <CustomButton
              handleClick={handleUpgrade}
              variant="tertiary"
              label="Upgrade"
              className="px-6"
              type="button"
            />
          )}
          <CustomButton
            className="px-6"
            handleClick={() => window.location.replace(`/builder/${agentId}`)}
          >
            My Workflow
          </CustomButton>
        </div>
      </div>

      <div className="mt-8">
        <AgentSettingTabs />
      </div>
    </div>
  );
};

export default AgentSettingsPage;
