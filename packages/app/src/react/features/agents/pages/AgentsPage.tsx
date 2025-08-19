import {
  AgentsBanner,
  AgentsGrid,
  AgentsHeader,
  GenerateAgentForm,
  TemplatesSection,
} from '@react/features/agents/components';
import ModelAgentsSection from '@react/features/agents/components/model-agents-section';
import { useOnboarding } from '@react/features/agents/contexts/OnboardingContext';
import { useAgentsData } from '@react/features/agents/hooks/useAgentsData';
import { useAgentsPageTutorial } from '@react/features/agents/hooks/useAgentsPageTutorial';
import {
  Learn,
  OnboardingTasks,
} from '@react/features/onboarding/components/agent-onboarding-section';
import { getTemplatesForJobRole } from '@react/features/onboarding/data/onboarding-mappings';
import { useGetOnboardingData } from '@react/features/onboarding/hooks/useGetUserOnboardingSettings';
import useMutateOnboardingData from '@react/features/onboarding/hooks/useMutateOnboardingData';
import { filterTemplates } from '@react/features/templates/utils';
import { FeatureFlagged } from '@react/shared/components/featureFlags';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { OnboardingTaskType } from '@react/shared/types/onboard.types';
import { FEATURE_FLAGS } from '@shared/constants/featureflags';
import { V4_ALL_PLANS } from '@shared/constants/general';
import { Analytics } from '@shared/posthog/services/analytics';
import { UserSettingsKey } from '@src/backend/types/user-data';
import { GenerateAgentFormData, Template } from '@src/react/features/agents/types/agents.types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFetchTemplates } from '../../templates/hooks/useFetchTemplates';
import UpSellModal from '../components/meta/up-sell';

/**
 * Main agents page component with agent generation, listing, and template sections
 */
function AgentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const switchteamid = searchParams.get('switchteamid');
  const [templates, setTemplates] = useState<Template[]>([]);
  const endOfPageRef = useRef<HTMLDivElement>(null);
  const saveUserSettingsMutation = useMutateOnboardingData();
  const { isOnboardingDismissed, setOnboardingDismissed } = useOnboarding();
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  // Authentication and permissions
  const { getPageAccess, userInfo, hasReadOnlyPageAccess } = useAuthCtx();
  const { subs } = userInfo;
  const canEditAgents = getPageAccess('/builder').write;
  const isReadOnlyAccess = hasReadOnlyPageAccess('/agents');

  // Custom hooks for data management
  const {
    agents,
    isAgentsLoading,
    totalAgents,
    agentsUpdated,
    sortCriteria,
    sortOrder,
    isLoadingMore,
    isInitialLoading,
    isLoadingAfterAction,
    setAgentsUpdated,
    loadAgents,
    handleSearch,
    setSortCriteria,
    toggleSortOrder,
    handleLoadMore,
  } = useAgentsData();

  // API hooks
  const { data: templatesData } = useFetchTemplates({
    options: { refetchOnWindowFocus: false },
  });

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

  // Templates processing
  useEffect(() => {
    if (!!templatesData && !!userSettings) {
      const userJobRole = userSettings?.jobRoleLabel;

      // First get all templates
      const allTemplates = JSON.parse(JSON.stringify(templatesData));

      // Then filter for marketing templates if needed
      const marketingTemplates = userJobRole
        ? getTemplatesForJobRole(userJobRole, allTemplates)?.relevantTemplates || templatesData
        : templatesData;

      // Apply the template filtering but don't add missing OUT_OF_BOX_TEMPLATES
      const processedTemplates = filterTemplates(marketingTemplates, 'All', '', 'name', 'asc');

      setTemplates(processedTemplates);
    }
  }, [templatesData, userSettings]);

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

  /**
   * Handle generate agent form submission
   */
  const handleGenerateAgentSubmit = (data: GenerateAgentFormData) => {
    if (data.message.trim() || data.attachmentFile) {
      // Redirect to builder page with chat message
      location.href = `/builder?chat=${data.message}&from=agents-page`;
    }
  };

  /**
   * Handle onboarding dismissal
   */
  const handleOnboardingDismiss = () => {
    saveUserSettingsMutation.mutate({
      key: UserSettingsKey.OnboardingTasks,
      data: {
        [OnboardingTaskType.ONBOARDING_LIST_DISMISSED]: true,
        [OnboardingTaskType.COMPLETED_TASK]: null,
      },
      operation: 'insertOrUpdate',
    });

    setOnboardingDismissed(true);
  };

  return (
    <div>
      <main className="pl-12 md:pl-0">
        {/* Generate Agent Form Section */}
        <FeatureFlagged featureFlag={FEATURE_FLAGS.INITIATE_WEAVER_MESSAGE}>
          <GenerateAgentForm
            onSubmit={handleGenerateAgentSubmit}
            canEditAgents={canEditAgents}
            isBannerVisible={isBannerVisible}
          />
        </FeatureFlagged>

        {/* GPT-5 Promo Banner */}
        {isBannerVisible && <AgentsBanner onClose={() => setIsBannerVisible(false)} />}

        {/* Onboarding Tasks Section */}
        {!isOnboardingDismissed && <OnboardingTasks onDismiss={handleOnboardingDismiss} />}

        {/* Agents Section Header */}
        <AgentsHeader
          sortCriteria={sortCriteria}
          sortOrder={sortOrder}
          onSortCriteriaChange={setSortCriteria}
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
        />

        <div ref={endOfPageRef} />

        {/* Model Agents Section */}
        {subs?.plan?.name && V4_ALL_PLANS.includes(subs.plan.name.toLowerCase()) && (
          <ModelAgentsSection />
        )}

        {/* Templates Section */}
        <TemplatesSection templates={templates} userJobRole={userSettings?.jobRoleLabel} />

        {/* Learn Section */}
        <div className="my-20 pb-3">
          <Learn />
        </div>
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
