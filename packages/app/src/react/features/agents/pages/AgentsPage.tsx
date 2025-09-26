import { AgentsGrid, AgentsHeader } from '@react/features/agents/components';
import ModelAgentsSection from '@react/features/agents/components/model-agents-section';
import { useAgentsData } from '@react/features/agents/hooks/useAgentsData';
import { useAgentsPageTutorial } from '@react/features/agents/hooks/useAgentsPageTutorial';
import { Learn } from '@react/features/onboarding/components/agent-onboarding-section/Learn';
import { useGetOnboardingData } from '@react/features/onboarding/hooks/useGetUserOnboardingSettings';
import useMutateOnboardingData from '@react/features/onboarding/hooks/useMutateOnboardingData';
import { FeatureFlagged } from '@react/shared/components/featureFlags';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { OnboardingTaskType } from '@react/shared/types/onboard.types';
import { FEATURE_FLAGS } from '@shared/constants/featureflags';
import { V4_ALL_PLANS } from '@shared/constants/general';
import { Analytics } from '@shared/posthog/services/analytics';
import { UserSettingsKey } from '@src/backend/types/user-data';
import { PluginComponents } from '@src/react/shared/plugins/PluginComponents';
import { PluginTarget } from '@src/react/shared/plugins/Plugins';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UpSellModal from '../components/meta/up-sell';

/**
 * Main agents page component with agent generation, listing, and template sections
 */
function AgentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const switchteamid = searchParams.get('switchteamid');
  const endOfPageRef = useRef<HTMLDivElement>(null);
  const saveUserSettingsMutation = useMutateOnboardingData();
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  // Authentication and permissions
  const { userInfo, hasReadOnlyPageAccess } = useAuthCtx();
  const { subs } = userInfo;
  const isReadOnlyAccess = hasReadOnlyPageAccess('/agents');

  // Custom hooks for data management
  const {
    agents,
    isAgentsLoading,
    totalAgents,
    agentsUpdated,
    sortOrder,
    sortField,
    isLoadingMore,
    isInitialLoading,
    isLoadingAfterAction,
    setAgentsUpdated,
    loadAgents,
    updateAgentInPlace,
    handleSearch,
    setSortCriteria,
    toggleSortOrder,
    handleLoadMore,
  } = useAgentsData();

  const { data: userSettings, isFetched: isUserSettingsFetched } = useGetOnboardingData({
    options: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Trigger first-visit tutorial
  useAgentsPageTutorial();

  // Scroll to bottom when agents are updated
  useLayoutEffect(() => {
    if (agentsUpdated && !isAgentsLoading) {
      setTimeout(() => {
        endOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
        setAgentsUpdated(false);
      }, 500);
    }
  }, [agentsUpdated, isAgentsLoading, setAgentsUpdated]);

  // Track first agent creation for onboarding
  useEffect(() => {
    if (agents && agents.length > 0 && !userSettings?.onboardingTasks?.CREATE_FIRST_AGENT) {
      // Sort in ascending order (oldest first)
      const sortedAgents = agents.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });

      saveUserSettingsMutation.mutate({
        key: UserSettingsKey.OnboardingTasks,
        data: {
          [OnboardingTaskType.CREATE_FIRST_AGENT]: true,
          [OnboardingTaskType.COMPLETED_TASK]: OnboardingTaskType.CREATE_FIRST_AGENT,
        },
        operation: 'insertOrUpdate',
      });
      Analytics.track('app_build_first_agent', { createdAt: sortedAgents[0]?.createdAt });
    }
  }, [agents, isUserSettingsFetched]);

  // Handle URL parameter cleanup
  useEffect(() => {
    if (switchteamid) {
      const currentPath = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('switchteamid');
      const newSearch = searchParams.toString();
      const newUrl = `${currentPath}${newSearch ? `?${newSearch}` : ''}`;
      navigate(newUrl, { replace: true });
    }
  }, [switchteamid, navigate]);

  /**
   * Handle create agent button click with quota checking
   */
  const handleCreateAgentClick = () => {
    // const subsLimit = getFeatPlanLimitByKey('devAiAgents', subs);
    const subsLimit = subs?.plan?.properties?.limits?.['devAiAgents'] ?? Infinity;

    if (totalAgents >= subsLimit) {
      setShowUpsellModal(true);
    } else {
      window.open('/builder', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div>
      <main className="pl-12 md:pl-0">
        {/* Generate Agent Form Section */}
        <FeatureFlagged featureFlag={FEATURE_FLAGS.INITIATE_WEAVER_MESSAGE}>
          <PluginComponents targetId={PluginTarget.AgentsPageGenerateAgentForm} />
        </FeatureFlagged>

        {/* Onboarding Tasks Section */}
        <PluginComponents targetId={PluginTarget.AgentsPageOnboardingTasks} />

        {/* Agents Section Header */}
        <AgentsHeader
          sortCriteria={sortField}
          sortOrder={sortOrder}
          onSortCriteriaChange={(newField) => {
            // Always maintain isPinned as primary sort
            setSortCriteria(`isPinned,${newField}`);
          }}
          onSortOrderToggle={toggleSortOrder}
          onSearch={handleSearch}
          onCreateAgentClick={handleCreateAgentClick}
          isReadOnlyAccess={isReadOnlyAccess}
        />

        {/* Agents Grid */}
        <AgentsGrid
          agents={agents}
          totalAgents={totalAgents}
          isInitialLoading={isInitialLoading}
          isLoadingAfterAction={isLoadingAfterAction}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          onRefreshAgents={() => loadAgents(1, true)}
          updateAgentInPlace={updateAgentInPlace}
        />

        <div ref={endOfPageRef} />

        {/* Model Agents Section */}
        {subs?.plan?.name && V4_ALL_PLANS.includes(subs.plan.name.toLowerCase()) && (
          <ModelAgentsSection />
        )}

        <PluginComponents targetId={PluginTarget.AgentsPageSection} />

        {/* Learn Section */}
        <Learn />
      </main>

      {/* Upsell Modal */}
      {showUpsellModal && (
        <UpSellModal
          onClose={() => setShowUpsellModal(false)}
          analytics={{ page_url: '/agents', source: 'quota limit reached for adding more agents' }}
        >
          Upgrade your plan to add more agents.
        </UpSellModal>
      )}
    </div>
  );
}

export default AgentsPage;
