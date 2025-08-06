//* File Description:
// the intention of this file react-injects.tsx is to only contain initialization functions of
// react components for the builder so it just acts as a bridge between vanilla and React
// so ideally it should not contain a React component. instead u need to create ur react component file in src\webapp\components\builder
// and just use it here

import { DebugLogMenu } from '@src/react/features/builder/components/debug-log-menu';
import { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';

import { Workspace } from '@src/frontend/workspace/Workspace.class';
import { AgentSettingsProvider } from '@src/react/features/agent-settings/contexts/agent-settings.context';
import { AgentSettingTabs } from '@src/react/features/agent-settings/pages/AgentSettingsPage';
import DeployAgentModal from '@src/react/features/agents/components/modals/deploy-agent-modal';
import AgentDeploymentSidebar from '@src/react/features/builder/components/agent-deployment-sidebar';
import EndpointFormPreviewSidebar from '@src/react/features/builder/components/endpoint-form-preview-sidebar';
import { DeploymentSidebarProvider, useDeploymentSidebarCtx } from '@src/react/features/builder/contexts/deployment-sidebar.context';
import ComponentInputEditor from '@src/react/features/builder/modals/ComponentInputEditor';
import { MobileHandler } from '@src/react/features/builder/modals/mobile-warning-modal';
import { WelcomeInvitePage } from '@src/react/features/onboarding/pages/WelcomeInvitePage';
import { ArcadeTutorial } from '@src/react/features/tutorials/components/ArcadeTutorialModal';
import ConfirmModal from '@src/react/shared/components/ui/modals/ConfirmModal';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { AppStateProvider, useAppState } from '@src/react/shared/contexts/AppStateContext';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { queryClient } from '@src/react/shared/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';

const GLOBAL_MODAL_ROOT_ID = 'modal-root';
let root: Root;

const ensureGlobalModalRoot = () => {
  if (!root) {
    root = createRoot(document.getElementById(GLOBAL_MODAL_ROOT_ID));
  }
};
const createOneTimeRoot = (id?: string) => {
  const generateId = (prefix: string = 'modal'): string => {
    return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
  };
  // create a standalone root for a modal
  const div = document.createElement('div');
  div.id = id || generateId();
  document.body.appendChild(div);
  const root = createRoot(div);
  return { root, id: div.id };
};

export function renderDebugLogContainer({ rootID }: { rootID: string }) {
  const root = createRoot(document.getElementById(rootID));
  const workspace: Workspace = window['workspace'];
  root.render(<DebugLogMenu workspace={workspace} />);
}

export function renderAgentDeploymentSidebar({ rootID }: { rootID: string }) {
  const workspace: Workspace = window['workspace'];
  const sidebarRoot = createRoot(document.getElementById(rootID));
  sidebarRoot.render(
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <Router>
          <AgentDeploymentSidebar workspace={workspace} />
        </Router>
      </AppStateProvider>
    </QueryClientProvider>,
  );
}

/**
 * Renders the ComponentInputEditor modal and handles cleanup on close
 * @param config Configuration object for the component editor
 */
export async function renderComponentInputEditor({ config }: { config: any }) {
  const { root, id } = createOneTimeRoot();

  // Create a function to handle unmounting
  const cleanup = () => {
    // Unmount the component from root
    root.unmount();
    // Optionally remove the root element if needed
    const modalRoot = document.getElementById(id);
    if (modalRoot) {
      modalRoot.remove();
    }
  };

  // Render the component with the cleanup function passed as onClose
  return new Promise((resolve) => {
    root.render(
      <ComponentInputEditor
        config={config}
        onSubmit={(values: any) => {
          cleanup();
          console.log(values);
          resolve(values);
        }}
      />,
    );
  });
}

export function renderEndpointFormPreviewSidebar({
  rootID,
  skill,
}: {
  rootID: string;
  skill?: {
    inputsTypes: any[];
    autoFillDataJson: Record<string, unknown>;
    skillId: string;
    details: {
      name: string;
      description: string;
      endpoint: string;
      method: string;
      skillErrors?: any;
    };
  };
}) {
  const root = createRoot(document.getElementById(rootID));
  const workspace: Workspace = window['workspace'];

  root.render(
    <QueryClientProvider client={queryClient}>
      <EndpointFormPreviewSidebar
        mode={{
          name: 'in-builder',
          props: {
            defaultSkill: skill,
            workspace: workspace,
            agentId: workspace.agent.id,
            dbg_url: workspace.serverData.dbgUrl,
            getAvailableSkills: () =>
              workspace.agent?.data?.components
                ?.filter((c) => c.name === 'APIEndpoint' && c.inputs?.length > 0)
                ?.map((skill) => ({
                  skillId: skill.id,
                  details: {
                    name: skill.title || '',
                  },
                })) || [],
          },
        }}
      />
    </QueryClientProvider>,
  );
}

export function renderAgentSettingsSidebar({ rootID }: { rootID: string }) {
  const workspace: Workspace = window['workspace'];
  const sidebarRoot = createRoot(document.getElementById(rootID));
  sidebarRoot.render(
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <Router>
          <AgentSettingsProvider workspace={workspace} workspaceAgentId={workspace.agent.id}>
            <AgentSettingTabs />
          </AgentSettingsProvider>
        </Router>
      </AppStateProvider>
    </QueryClientProvider>,
  );
}
/*
These modals are self contained and do not need to be inside providers
There purpose is to get simple binary confirmation from the user (Yes/No)
Caller will listen to result using a mutation observer
example of this can be found in DeploymentsHistory.tsx
The caller will trigger click event for the hidden button associated with the modal
The modal will then show and the user will click one of the two buttons
The caller will then observe the button for the result attribute which will be set to either 'confirmed' or 'cancelled'
*/

export function renderConfirmDialogModals({ rootID }: { rootID: string }) {
  const root = createRoot(document.getElementById(rootID));

  function RestoreModal() {
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const cancelRestore = (): void => {
      setShowRestoreModal(false);
      buttonRef.current?.setAttribute('result', 'cancelled');
    };

    const confirmRestore = (): void => {
      setShowRestoreModal(false);
      buttonRef.current?.setAttribute('result', 'confirmed');
    };

    return (
      <>
        <button
          id="self-contained-restore-modal-btn"
          className="hidden"
          onClick={() => setShowRestoreModal(true)}
          ref={buttonRef}
        >
          Restore
        </button>
        {showRestoreModal && (
          <ConfirmModal
            label="Restore Version"
            message="Restore this version?"
            onClose={cancelRestore}
            handleConfirm={confirmRestore}
            handleCancel={cancelRestore}
            lowMsg="Are you sure you want to restore this to a previous version? Any unsaved changes will be lost."
          />
        )}
      </>
    );
  }

  root.render(<RestoreModal />);
}

/**
 * Renders agent modals into specified root element
 * @param {Object} params - Parameters for rendering modals
 * @param {string} params.rootID - ID of the root DOM element
 */
export function renderAgentModals({ rootID }: { rootID: string }): void {
  const workspace: Workspace = window['workspace'];
  const rootElement = document.getElementById(rootID);
  if (!rootElement) {
    console.error(`Root element with ID "${rootID}" not found`);
    return;
  }

  // Inner component that uses hooks - must be inside providers
  function ShareButtonContent() {
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const authContext = useAuthCtx();
    const appState = useAppState();

    const shareButton = document.getElementById('share-agent-button-topbar') as HTMLButtonElement;
    if (shareButton) {
      shareButton.disabled = !authContext?.userInfo;
    }

    useEffect(() => {
      const shareButton = document.getElementById('share-agent-button-topbar') as HTMLButtonElement;
      if (shareButton) {
        if (!authContext?.userInfo) {
          shareButton.setAttribute('disabled', 'true');
        } else {
          shareButton.removeAttribute('disabled');
        }
      }
    }, [authContext?.userInfo]);
    return (
      <>
        {appState.isShareAgentModalOpen && !authContext?.userInfo && (
          <div className="fixed flex inset-0 bg-black bg-opacity-50 justify-center items-center w-full h-full">
            <Spinner />
          </div>
        )}
        {appState?.isShareAgentModalOpen && (
          <div className="fixed inset-0">
            <WelcomeInvitePage
              isShareAgent={true}
              onClose={() => appState.toggleShareAgentModal()}
              agentId={workspace.agent.id}
              agentName={workspace.agent.name}
            />
          </div>
        )}
        {showConfirmationModal && (
          <div className="fixed inset-0">
            <ConfirmModal
              onClose={() => setShowConfirmationModal(false)}
              label="Confirm"
              message={'Unauthorized'}
              lowMsg={`You do not have permission to share this agent. Contact ${
                (authContext?.userInfo as any)?.teamMembers?.filter(
                  (m) => m.userTeamRole?.isTeamInitiator,
                )[0]?.email || 'your team admin'
              } to request access.`}
              handleConfirm={() => setShowConfirmationModal(false)}
              handleCancel={() => setShowConfirmationModal(false)}
              hideCancel={true}
            />
          </div>
        )}
      </>
    );
  }
  // Inner component that uses hooks - must be inside providers
  function ModalsContent() {
    const appState = useAppState();
    const authContext = useAuthCtx();
    const deploymentSidebarCtx = useDeploymentSidebarCtx();

    const [modalState, setModalState] = useState(0);

    useEffect(() => {
      if (!appState.isDeployModalOpen) {
        setModalState(0);
      } else if (!authContext?.userInfo || !deploymentSidebarCtx?.allDeployments?.data) {
        setModalState(1);
      } else if (appState.isDeployModalOpen && authContext?.userInfo && deploymentSidebarCtx?.allDeployments?.data) {
        setModalState(2);
      }
    }, [
      appState.isDeployModalOpen,
      authContext?.userInfo, 
      deploymentSidebarCtx?.allDeployments?.data,
    ]);


    

    return (
      <>
        {modalState === 1 && (
          <div className="fixed flex inset-0 bg-black bg-opacity-50 justify-center items-center w-full h-full">
            <Spinner />
          </div>
        )}
        {modalState === 2 && (
          <DeployAgentModal
            userInfo={authContext.userInfo}
            deploymentSidebarCtx={deploymentSidebarCtx}
          />
        )}
      </>
    );
  }

  // Wrapper component that provides context
  function ModalsContainer() {
    return (
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <DeploymentSidebarProvider workspace={workspace}>
            <ModalsContent />
            <ShareButtonContent />
          </DeploymentSidebarProvider>
        </AppStateProvider>
      </QueryClientProvider>
    );
  }

  // Create root and render
  const root = createRoot(rootElement);
  root.render(<ModalsContainer />);
}

let tutorialRoot: Root | null = null;

export function renderArcadeTutorial(iframeUrl: string, iframeTitle: string) {
  // If modal-root doesn't exist, add it to body
  if (!document.getElementById('modal-root')) {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  }

  // Use existing root or create new one
  if (!tutorialRoot) {
    tutorialRoot = createRoot(
      document.getElementById('modal-root') || document.createElement('div'),
    );
  }

  tutorialRoot.render(
    <ArcadeTutorial
      iframeUrl={iframeUrl}
      iframeTitle={iframeTitle}
      renderTrigger={(onClick) => <div style={{ display: 'none' }} onClick={onClick} />}
    />,
  );

  // Trigger the click event after a short delay to ensure the component is mounted
  setTimeout(() => {
    const trigger = document.querySelector('#modal-root div[style*="display: none"]');
    if (trigger) {
      (trigger as HTMLElement).click();
    }
  }, 100);

  return tutorialRoot;
}

export function renderMobileHandler({ rootID }: { rootID: string }) {
  const container = document.getElementById(rootID);
  if (!container) {
    console.error('Mobile handler container not found');
    return;
  }

  const root = createRoot(container);
  root.render(<MobileHandler platformName="AI Agent Builder" showDismissOption={true} />);
}
