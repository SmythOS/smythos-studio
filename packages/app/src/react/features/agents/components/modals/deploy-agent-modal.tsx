import { AgentSettingsProvider } from '@react/features/agent-settings/contexts/agent-settings.context';
import ChatbotCodeSnippetModal from '@react/features/agent-settings/modals/chatbotCode.modal';
import { useGetOnboardingData } from '@react/features/onboarding/hooks/useGetUserOnboardingSettings';
import useMutateOnboardingData from '@react/features/onboarding/hooks/useMutateOnboardingData';
import { Button as ButtonOld } from '@react/shared/components/ui/button';
import { Input } from '@react/shared/components/ui/input';
import { Label } from '@react/shared/components/ui/label';
import { Button } from '@react/shared/components/ui/newDesign/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@react/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@react/shared/components/ui/tabs';
import { Textarea } from '@react/shared/components/ui/textarea';
import { useAppState } from '@react/shared/contexts/AppStateContext';
import { OnboardingTaskType } from '@react/shared/types/onboard.types';
import { UserSettingsKey } from '@src/backend/types/user-data';
import { PostHog } from '@src/frontend/services/posthog';
import { errorToast, successToast } from '@src/shared/components/toast';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { Analytics } from '@src/shared/posthog/services/analytics';
import { builderStore } from '@src/shared/state_stores/builder/store';
import { useQuery } from '@tanstack/react-query';
import { Tooltip } from 'flowbite-react';
import { useFormik } from 'formik';
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MdOutlineInfo } from 'react-icons/md';
import * as Yup from 'yup';
import { CloseIcon } from '../../../../shared/components/svgs';
import Modal from '../../../../shared/components/ui/modals/Modal';
import { EMBODIMENT_TYPE } from '../../../../shared/enums';
import { Embodiment } from '../../../../shared/types/api-results.types';
import AlexaEmbodimentModal from '../../../embodiments/alexa-embodiment-modal';
import ApiEmbodimentModal from '../../../embodiments/api-embodiment-modal';
import ChatbotEmbodimentModal from '../../../embodiments/chatbot-embodiment-modal';
import { globalModalManager } from '../../../embodiments/embodiment-settings';
import GptEmbodimentModal from '../../../embodiments/gpt-embodiment-modal';
import LlmEmbodimentModal from '../../../embodiments/llm-embodiment-modal';
import McpEmbodimentModal from '../../../embodiments/mcp-embodiment-modal';
import PostDeploymentModal from '../../../embodiments/post-deployment-modal';
declare global {
  interface Window {
    Alpine: any;
  }
}

interface AlpineElement extends HTMLElement {
  __x?: {
    id: string;
    $data: any;
  };
}

const toolTipTheme = {
  base: 'absolute z-10 inline-block rounded-lg px-3 py-2 text-sm font-medium shadow-sm left-0',
  arrow: {
    base: 'absolute z-10 h-2 w-2 rotate-45 -ml-4',
  },
};
const toolTipWithDelay = {
  ...toolTipTheme,
  ...{
    target: 'w-full text-center',
    animation: 'transition-opacity delay-3000',
  },
};

function DeployAgentModal({ userInfo, deploymentSidebarCtx }) {
  const { toggleDeployModal } = useAppState();
  const {
    workspace,
    domains,
    deployMutation,
    lastVersion,
    statusInfoQuery,
    latestDeployment,
    allDeployments,
  } = deploymentSidebarCtx;
  const [isInProgress, setIsInProgress] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [llmModal, setLlmModal] = useState<{ open: boolean; defaultTab: 'code' | 'keys' }>({
    open: false,
    defaultTab: 'code',
  });
  const saveUserSettingsMutation = useMutateOnboardingData();
  const { data: userSettings } = useGetOnboardingData({
    options: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    },
  });
  const featureVariant = PostHog.getFeatureFlag(FEATURE_FLAGS.DEPLOY_MODAL);
  const [showPostDeployment, setShowPostDeployment] = useState(false);
  const [hasDeployment, setHasDeployment] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  type PanelType = 'none' | 'gpt' | 'alexa' | 'chatbot' | 'api' | 'mcp';
  const [openPanel, setOpenPanel] = useState<PanelType>('none');
  const [dialogModal, setDialogModal] = useState<{
    open: boolean;
    title: string;
    component?: React.ComponentType<any>;
    componentProps?: Record<string, unknown>;
  } | null>(null);
  const [activeCodeSnippetKey, setActiveCodeSnippetKey] = useState<string | null>(null);

  // Check modal states directly from global manager when rendering
  const [modalStates, setModalStates] = useState({
    modalOpened: !!globalModalManager.activeModal,
    snippetOpened: globalModalManager.showCodeSnippet,
  });

  // Update modal states when they actually change
  useEffect(() => {
    const checkModalStates = () => {
      const newModalOpened = !!globalModalManager.activeModal;
      const newSnippetOpened = globalModalManager.showCodeSnippet;

      setModalStates((prev) => {
        if (prev.modalOpened !== newModalOpened || prev.snippetOpened !== newSnippetOpened) {
          return { modalOpened: newModalOpened, snippetOpened: newSnippetOpened };
        }
        return prev;
      });
    };

    // Check immediately
    checkModalStates();

    // Set up a listener for modal state changes
    const handleModalStateChange = () => checkModalStates();
    window.addEventListener('embodimentModalStateChange', handleModalStateChange);

    return () => {
      window.removeEventListener('embodimentModalStateChange', handleModalStateChange);
    };
  }, []);

  const { modalOpened, snippetOpened } = modalStates;

  // Fetch embodiment data for chatbot
  const { data: embodimentsData, isLoading: isLoadingEmbodiments } = useQuery({
    queryKey: ['embodiments', workspace.agent.id],
    queryFn: async () => {
      const response = await fetch(`/api/page/agents/embodiments/${workspace.agent.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch embodiments');
      }
      return response.json() as Promise<{ embodiments: Embodiment[] }>;
    },
    enabled: !!workspace?.agent?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Get chatbot embodiment data
  const chatbotEmbodiment = embodimentsData?.embodiments?.find(
    (embodiment) => embodiment.type === EMBODIMENT_TYPE.CHAT_BOT,
  );

  // Transform the embodiment data to match ChatbotEmbodimentModal props
  const chatbotEmbodimentData = chatbotEmbodiment
    ? {
        properties: {
          introMessage: chatbotEmbodiment.properties?.introMessage || '',
          isFullScreen: chatbotEmbodiment.properties?.isFullScreen || false,
          allowFileAttachments: chatbotEmbodiment.properties?.allowFileAttachments || false,
        },
      }
    : undefined;

  // Get domain for chatbot integration
  const chatbotDomain =
    workspace.agent.domain ||
    `${workspace.agent.id}.${statusInfoQuery.data?.status?.prod_agent_domain}`;

  const isAnyOverlayOpen =
    openPanel !== 'none' ||
    (dialogModal && dialogModal.open) ||
    activeCodeSnippetKey !== null ||
    llmModal.open ||
    modalOpened ||
    snippetOpened;

  useEffect(() => {
    if (hasDeployment) {
      setIsCollapsed(true);
      setShowPostDeployment(true);
    }
  }, [hasDeployment]);

  const autoGeneratedProdDomain = `${workspace.agent.id}.${statusInfoQuery.data?.status?.prod_agent_domain}`;

  const handleDeploy = (type: string) => {
    window.open('https://github.com/Smyth-ai/smyth-runtime-local/tree/main', '_blank');
  };

  const handleContactSales = () => {
    window.open('https://smythos.com/enterprise-enquiry/', '_blank');
  };

  const validationSchema = Yup.object({
    major: Yup.number()
      .required('Major version is required')
      .min(lastVersion.major ?? 1, 'Major version cannot be less than the current major version'),

    domain: Yup.string().required('Domain is required'),
    releaseNotes: Yup.string()
      .optional()
      .max(500, 'Release notes cannot be more than 500 characters'),
  });

  async function updateDomain(domain: string) {
    const selectedDomain = domain;

    if (domain == 'default' && workspace?.agent?.domain && workspace?.agent?.domain !== 'default') {
      const domResponse = await fetch('/api/page/builder/removeDomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: workspace.agent.id,
          curDomain: workspace.agent.domain,
        }),
      });
      if (domResponse.ok) {
        workspace.agent.domain = null;
        window.dispatchEvent(
          new CustomEvent('queryClientInvalidate', { detail: { queryKey: ['domains'] } }),
        );
      } else {
        errorToast('Domain Update failed');
      }
      return;
    } else if (domain == 'default') {
      builderStore.setState((prev) => ({
        ...prev,
        agentDomains: {
          ...prev.agentDomains,
          prod: autoGeneratedProdDomain,
        },
      }));
      return;
    }

    const oldDomain = workspace.agent.domain;
    if (selectedDomain == oldDomain) return;

    try {
      const domResponse = await fetch('/api/page/builder/updateDomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: workspace.agent.id,
          curDomain: oldDomain,
          domain: selectedDomain,
        }),
      });
      if (domResponse.ok) {
        workspace.agent.domain = selectedDomain;
        workspace.saveAgent(null, selectedDomain, null, null, true);
        window.dispatchEvent(
          new CustomEvent('queryClientInvalidate', { detail: { queryKey: ['domains'] } }),
        );

        builderStore.setState((prev) => ({
          agentDomains: {
            ...prev.agentDomains,
            prod: selectedDomain,
          },
        }));
      } else {
        errorToast('Domain Update failed');
      }
    } catch (error) {
      errorToast('Domain Update failed');
      throw error;
    }
  }

  const availableDomains = [
    { name: autoGeneratedProdDomain, value: 'default' },
    ...(domains.data
      ?.filter((d) => d.aiAgent == null || d.aiAgent.id == workspace.agent.id)
      .map((item) => {
        return { name: item.name, value: item.name };
      }) || []),
  ];
  const uniqueDomains = availableDomains.filter(
    (item, index, self) => index === self.findIndex((t) => t.value === item.value),
  );
  const initialFormValues = {
    major: lastVersion.major !== null && lastVersion.major !== undefined ? lastVersion.major : 1,
    minor:
      lastVersion.minor !== null && lastVersion.minor !== undefined ? lastVersion.minor + 1 : 0,
    domain: workspace.agent.domain || 'default',
    releaseNotes: '',
  };
  const formik = useFormik({
    initialValues: initialFormValues,
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setIsInProgress(true);
      await updateDomain(values.domain);
      const deployResponse = await deployMutation.mutateAsync(values);
      const valueJson = await deployResponse?.json();
      workspace.emit('AgentDeployed', valueJson);
      window.dispatchEvent(
        new CustomEvent('queryClientInvalidate', {
          detail: { queryKey: ['latest_deployment', workspace.agent.id] },
        }),
      );
      window.dispatchEvent(
        new CustomEvent('agentProdDomainUpdate', { detail: { agentId: workspace.agent.id } }),
      );
      if (!userSettings?.onboardingTasks?.DEPLOY_FIRST_AGENT) {
        saveUserSettingsMutation.mutate({
          key: UserSettingsKey.OnboardingTasks,
          data: {
            [OnboardingTaskType.DEPLOY_FIRST_AGENT]: true,
            [OnboardingTaskType.COMPLETED_TASK]: OnboardingTaskType.DEPLOY_FIRST_AGENT,
          },
          operation: 'insertOrUpdate',
        });
        Analytics.track('app_deploy_first_agent', {
          createdAt: new Date().toISOString().split('T')[0],
        });
        Analytics.track('app_deploy_agent', {
          createdAt: new Date().toISOString().split('T')[0],
        });
      } else {
        Analytics.track('app_deploy_agent', {
          createdAt: new Date().toISOString().split('T')[0],
        });
      }
      setSubmitting(false);
      setIsInProgress(false);
      setHasDeployment(true);
      successToast('Agent Deployed Successfully.');
      setShowPostDeployment(true);
    },
    enableReinitialize: true,
  });

  const handleOpenLlmModal = (defaultTab: 'code' | 'keys') => {
    setLlmModal({ open: true, defaultTab });
    setIsVisible(false);
  };

  const handleCloseLlmModal = () => {
    setLlmModal({ open: false, defaultTab: 'code' });
    setIsVisible(true);
    setTimeout(() => {
      if (hasDeployment) {
        window.dispatchEvent(
          new CustomEvent('queryClientInvalidate', {
            detail: { queryKey: ['latest_deployment', workspace.agent.id] },
          }),
        );
      }
    }, 100);
  };

  const handleOpenDialogModal = (
    title: string,
    component?: React.ComponentType<any>,
    componentProps?: Record<string, unknown>,
  ) => {
    setDialogModal({ open: true, title, component: component, componentProps });
    setIsVisible(false);
  };

  const handleOpenCodeSnippetModal = (key: string) => {
    setActiveCodeSnippetKey(key);
    setIsVisible(false);
  };

  const handleCloseDialogModal = () => {
    setDialogModal(null);
    setIsVisible(true);
  };

  const handleCloseCodeSnippetModal = () => {
    setActiveCodeSnippetKey(null);
    setIsVisible(true);
  };

  const handleOpenPanel = (panel: PanelType) => {
    setOpenPanel(panel);
    setIsVisible(false);
  };

  const handleClosePanel = () => {
    setOpenPanel('none');
    setIsVisible(true);
  };

  let codeSnippetModal: React.ReactNode = null;
  if (activeCodeSnippetKey) {
    codeSnippetModal = (
      <Modal
        isOpen={true}
        onClose={handleCloseCodeSnippetModal}
        hideCloseIcon={true}
        panelWidthClasses="w-[100vw] max-w-[480px]"
      >
        <ChatbotCodeSnippetModal
          onClose={handleCloseCodeSnippetModal}
          domain={typeof workspace.agent.domain === 'string' ? workspace.agent.domain : ''}
          embodimentData={{ properties: { introMessage: '' } }}
        />
      </Modal>
    );
  }

  const handleExpandModal = () => {
    setIsCollapsed(false);
  };

  const handleCollapseModal = () => {
    setIsCollapsed(true);
  };

  return (
    <>
      {openPanel === 'alexa' && <AlexaEmbodimentModal onClose={handleClosePanel} />}
      {openPanel === 'gpt' && <GptEmbodimentModal onClose={handleClosePanel} />}
      {openPanel === 'chatbot' && (
        <ChatbotEmbodimentModal
          onClose={handleClosePanel}
          domain={chatbotDomain}
          embodimentData={chatbotEmbodimentData}
          isLoading={isLoadingEmbodiments}
        />
      )}
      {openPanel === 'api' && <ApiEmbodimentModal onClose={handleClosePanel} />}
      {openPanel === 'mcp' && <McpEmbodimentModal onClose={handleClosePanel} />}
      {dialogModal && dialogModal.open && (
        <Modal
          isOpen={dialogModal.open}
          onClose={handleCloseDialogModal}
          hideCloseIcon={true}
          panelWidthClasses="w-[100vw] max-w-[480px]"
        >
          <div className="flex items-center mb-4">
            <button
              className="mr-2 -ml-2 p-2 rounded hover:bg-gray-100"
              onClick={handleCloseDialogModal}
              aria-label="Back"
            >
              <CloseIcon />
            </button>
            <span className="flex-1 text-lg font-semibold">{dialogModal.title}</span>
            <button
              className="ml-auto -mr-2 p-2 rounded hover:bg-gray-100"
              onClick={handleCloseDialogModal}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
          {dialogModal.component ? (
            React.createElement(dialogModal.component, dialogModal.componentProps || {})
          ) : (
            <div className="text-center text-gray-500 py-8">Coming soon: {dialogModal.title}</div>
          )}
        </Modal>
      )}
      {codeSnippetModal}
      {llmModal.open && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
          <LlmEmbodimentModal
            agent={{
              id: workspace.agent.id,
              name: workspace.agent.name,
              description: workspace.agent.data?.description ?? '',
              shortDescription: workspace.agent.data?.shortDescription ?? '',
              createdAt: workspace.agent.data?.createdAt ?? '',
              updatedAt: workspace.agent.data?.updatedAt ?? '',
              __disabled: workspace.agent.data?.__disabled ?? false,
              _count: workspace.agent.data?._count ?? { AiAgentDeployment: 0 },
              contributors: workspace.agent.data?.contributors ?? [],
              isLocked: workspace.agent.data?.isLocked ?? false,
              aiAgentSettings: workspace.agent.data?.aiAgentSettings ?? [],
              avatar: workspace.agent.data?.avatar ?? '',
              status: workspace.agent.data?.status ?? '',
              isPublic: workspace.agent.data?.isPublic ?? false,
              userId: workspace.agent.data?.userId ?? '',
              teamId: workspace.agent.data?.teamId ?? '',
            }}
            defaultTab={llmModal.defaultTab}
            onClose={handleCloseLlmModal}
          />
        </div>
      )}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 p-4 flex items-center justify-center ${
          isAnyOverlayOpen ? 'hidden' : ''
        }`}
      >
        <div
          className={`w-full h-full flex flex-col items-center justify-center overflow-y-auto`}
          style={{ maxHeight: '100vh' }}
        >
          {/* Collapsed Modal */}
          {isCollapsed && hasDeployment ? (
            <div
              className="relative bg-white rounded-2xl shadow-lg w-full max-w-[480px] p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={handleExpandModal}
            >
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm font-medium text-[#111827]">Deploy Agent</h3>
                  <p className="text-xs text-gray-500">Click to deploy a new version</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ButtonOld
                  variant="ghost"
                  size="icon"
                  className="h-[22px] w-[22px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDeployModal();
                  }}
                >
                  <X className="text-[#111827]" />
                  <span className="sr-only">Close</span>
                </ButtonOld>
              </div>
            </div>
          ) : (
            /* Expanded Modal */
            <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-[480px] p-6 flex flex-col flex-none gap-2 overflow-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  {hasDeployment && (
                    <ButtonOld
                      variant="ghost"
                      size="icon"
                      className="h-[22px] w-[22px] -ml-2"
                      onClick={handleCollapseModal}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15 18L9 12L15 6"
                          stroke="#111827"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="sr-only">Back</span>
                    </ButtonOld>
                  )}
                  <h2 className="text-lg font-medium text-[#111827] flex items-center gap-1">
                    Deploy Agent
                    <Tooltip
                      theme={toolTipTheme}
                      content={
                        <div style={{ whiteSpace: 'normal' }}>
                          Deploy your agent to make it live and ready to integrate into your
                          workflow. Use SmythOS's default subdomain or configure a custom one.{' '}
                          <a
                            href={`${SMYTHOS_DOCS_URL}/agent-deployments/overview/`}
                            target="_blank"
                            className="text-v2-blue hover:underline"
                          >
                            Learn more
                          </a>
                        </div>
                      }
                    >
                      <span className="">
                        <MdOutlineInfo className="text-gray-500 text-lg" />
                      </span>
                    </Tooltip>
                  </h2>
                </div>
                <ButtonOld
                  variant="ghost"
                  size="icon"
                  className="h-[22px] w-[22px]"
                  onClick={toggleDeployModal}
                >
                  <X className="text-[#111827]" />
                  <span className="sr-only">Close</span>
                </ButtonOld>
              </div>
              <Tabs defaultValue="agent-cloud" className="w-full relative">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <Tooltip
                    content={
                      <div style={{ whiteSpace: 'normal' }}>
                        Convenient, easy, and instant. We handle all the hosting of your agent for
                        you at $2 per 1,000 tasks, only pay for what you use. Unlock chat, bulk
                        work, schedules, analytics, logs, APIs and more.
                      </div>
                    }
                    placement="top"
                    theme={toolTipWithDelay}
                    trigger="hover"
                  >
                    <TabsTrigger value="agent-cloud" className="text-sm rounded-sm w-full">
                      Agent Cloud
                    </TabsTrigger>
                  </Tooltip>
                  <TabsTrigger value="enterprise" className="text-sm rounded-sm">
                    Enterprise
                  </TabsTrigger>
                  <TabsTrigger value="deploy-locally" className="text-sm rounded-sm">
                    Deploy Locally
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="agent-cloud">
                  <form onSubmit={formik.handleSubmit}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#111827]">Version</Label>
                        <div className="flex space-x-[18px]">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="major" className="text-sm font-normal text-black">
                              Major <span className="text-red-500 text-sm">*</span>
                            </Label>
                            <Input
                              type="number"
                              name="major"
                              id="deploy-version-major-number"
                              placeholder="1"
                              min={lastVersion.major ?? 1}
                              value={formik.values.major}
                              onChange={(e) => {
                                formik.handleChange(e);

                                const newMajorVersion = parseInt(e.target.value);
                                if (
                                  newMajorVersion === lastVersion.major &&
                                  lastVersion.major !== 0 &&
                                  formik.values.minor < lastVersion.major + 1
                                ) {
                                  formik.setFieldValue('minor', lastVersion.major + 1);
                                }
                              }}
                              className="h-[42px] bg-[#F9FAFB] border-[#D1D5DB] text-sm text-[#111827]"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="minor" className="text-sm font-normal text-black">
                              Minor <span className="text-red-500 text-sm">*</span>
                            </Label>
                            <Input
                              type="number"
                              name="minor"
                              id="deploy-version-minor-number"
                              placeholder="0"
                              min={
                                formik.values.major === lastVersion.major
                                  ? lastVersion.minor !== null && lastVersion.minor !== undefined
                                    ? lastVersion.minor + 1
                                    : 0
                                  : 0
                              }
                              value={formik.values.minor}
                              onChange={formik.handleChange}
                              className="h-[42px] bg-[#F9FAFB] border-[#D1D5DB] text-sm text-[#111827]"
                            />
                          </div>

                          {formik.touched.major && formik.errors.major ? (
                            <div className="text-red-500 text-sm mt-2">
                              {typeof formik.errors.major === 'string' ? formik.errors.major : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subdomain" className="text-sm font-medium text-[#111827]">
                          Subdomain{' '}
                          <span className="text-sm font-medium text-gray-500">
                            (if you want to register a subdomain, click{' '}
                            <a
                              href="/domains"
                              target="_blank"
                              className="text-smyth-blue hover:underline"
                            >
                              here
                            </a>
                            )
                          </span>
                        </Label>
                        <Select
                          name="deploy-domain-select"
                          value={formik.values.domain}
                          onValueChange={(value: string) => {
                            formik.setFieldValue('domain', value);
                          }}
                        >
                          <SelectTrigger
                            id="subdomain"
                            className="h-[42px] bg-[#F9FAFB] border-[#D1D5DB] text-sm text-[#111827]"
                          >
                            <SelectValue>
                              {formik.values.domain === 'default'
                                ? autoGeneratedProdDomain
                                : formik.values.domain}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{autoGeneratedProdDomain}</SelectItem>
                            {uniqueDomains
                              .filter((domain) => domain.value !== 'default')
                              .map((domain) => (
                                <SelectItem key={domain.value} value={domain.value}>
                                  {domain.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {formik.touched.domain && formik.errors.domain ? (
                          <div className="text-red-500 text-sm mt-2">
                            {typeof formik.errors.domain === 'string' ? formik.errors.domain : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="deploy-modal-release-notes"
                          className="text-sm font-medium text-[#111827]"
                        >
                          Release Notes
                        </Label>
                        <Textarea
                          name="releaseNotes"
                          className="min-h-[100px] bg-[#F9FAFB] border-[#D1D5DB] text-sm text-[#6B7280] resize-vertical"
                          placeholder="Enter the list of new features, bug fixes, and other changes here."
                          value={formik.values.releaseNotes}
                          onChange={formik.handleChange}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        type="submit"
                        loading={isInProgress}
                        fullWidth
                        className="h-[40px] bg-[#45C9A9] hover:bg-[#3BB89A] text-white text-sm font-medium rounded-lg"
                      >
                        Deploy
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="enterprise">
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600">
                      Deploy on-prem or to enterprise cloud with enterprise security and unlimited
                      task options available. Great for enterprise.
                    </p>
                    <Button
                      className="w-full h-[40px] bg-[#45C9A9] hover:bg-[#3BB89A] text-white text-sm font-medium rounded-lg"
                      handleClick={handleContactSales}
                    >
                      Contact sales
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="deploy-locally">
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600">
                      Export your AI agent with Control+ Shift+E, then run it locally with our local
                      runtime for Mac, Windows, Linux.
                    </p>
                    <Button
                      className="w-full h-[40px] bg-[#45C9A9] hover:bg-[#3BB89A] text-white text-sm font-medium rounded-lg"
                      handleClick={() => handleDeploy('locally')}
                    >
                      Download SRE
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          {hasDeployment &&
            (isCollapsed ? (
              <AgentSettingsProvider workspace={workspace} workspaceAgentId={workspace.agent.id}>
                <div className="w-full max-w-[480px] mt-5">
                  <PostDeploymentModal
                    userInfo={userInfo}
                    onClose={toggleDeployModal}
                    onReopenDeployModal={() => setIsVisible(true)}
                    onOpenLlmModal={handleOpenLlmModal}
                    onOpenCustomGptModal={() => handleOpenPanel('gpt')}
                    onOpenDialogModal={handleOpenDialogModal}
                    onOpenCodeSnippetModal={handleOpenCodeSnippetModal}
                    onOpenAlexaPanel={() => handleOpenPanel('alexa')}
                    onOpenChatbotPanel={() => handleOpenPanel('chatbot')}
                    onOpenApiPanel={() => handleOpenPanel('api')}
                    onOpenMcpPanel={() => handleOpenPanel('mcp')}
                    isVisible={hasDeployment && isCollapsed && !isAnyOverlayOpen}
                  />
                </div>
              </AgentSettingsProvider>
            ) : (
              <div
                className="relative bg-white rounded-2xl shadow-lg w-full max-w-[480px] mt-5 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={handleCollapseModal}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-[#111827]">Embed Options</h3>
                    <p className="text-xs text-gray-500">
                      Click to see options for embedding agent across different channels
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ButtonOld
                    variant="ghost"
                    size="icon"
                    className="h-[22px] w-[22px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDeployModal();
                    }}
                  >
                    <X className="text-[#111827]" />
                    <span className="sr-only">Close</span>
                  </ButtonOld>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

export default DeployAgentModal;
