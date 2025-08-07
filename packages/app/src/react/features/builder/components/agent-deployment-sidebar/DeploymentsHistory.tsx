import { closeTwDialog, twEditValuesWithCallback } from '@src/builder-ui/ui/tw-dialogs';
import { importSmythFile } from '@src/builder-ui/workspace/FileDrag';
import { useDeploymentSidebarCtx } from '@src/react/features/builder/contexts/deployment-sidebar.context';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { Deployment } from '@src/react/shared/types/api-results.types';
import { Analytics } from '@src/shared/posthog/services/analytics';
import classNames from 'classnames';
import { useState } from 'react';

const DeploymentsHistory = () => {
  const { allDeployments, workspace } = useDeploymentSidebarCtx();
  const [isRestoring, setIsRestoring] = useState('');
  const { userInfo } = useAuthCtx();

  const restoreVersion = async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/page/builder/ai-agent/deployments/${deploymentId}`);
      const result = await response.json();
      const restoreData = result.deployment.aiAgentData;
      await importSmythFile(workspace, restoreData, true);
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setIsRestoring('');
    }
  };

  const restoreVersionConfirmation = async (deploymentId: string) => {
    if (!userInfo?.subs?.plan?.paid) {
      Analytics.track('upgrade_impression', {
        page_url: '/builder',
        source: 'restoring previous version',
      });

      twEditValuesWithCallback(
        {
          title: '',
          fields: {},
          content: `
            <div class="text-center px-4 py-6">
              <h2 class="text-2xl font-bold text-gray-800 mb-2">
                Unlock Version Control
              </h2>

              <div class="mb-6">
                <p class="text-base text-gray-600 leading-relaxed mx-auto max-w-md">
                  Version history and restore features are not available on Free plans.
                    <a href="/plans"
                     target="_blank"
                     class="text-blue-600 underline hover:opacity-75"
                     onclick="window.analytics?.track('upgrade_click', {
                       page_url: '/builder',
                       source: 'restoring previous version'
                     })">
                    Upgrade
                  </a> to unlock access to version control and much more.
                </p>
              </div>
            </div>
          `,
          actions: [],
          onCloseClick: (_, dialog) => {
            closeTwDialog(dialog);
          },
        },
        'auto',
        'auto',
        'none',
        'auto',
        '600px', // Slightly wider for better text layout
      );
      return;
    }

    setIsRestoring(deploymentId);
    const restoreModalButton = document.getElementById('self-contained-restore-modal-btn');

    if (!restoreModalButton) {
      console.error('Restore modal button not found');
      setIsRestoring('');
      return;
    }

    try {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(async (mutation) => {
          if (mutation.type === 'attributes') {
            const result = restoreModalButton.getAttribute('result');
            if (result === 'cancelled') {
              setIsRestoring('');
              observer.disconnect();
            } else if (result === 'confirmed') {
              await restoreVersion(deploymentId);
              observer.disconnect();
              setIsRestoring('');
            }
          }
        });
      });

      observer.observe(restoreModalButton, {
        attributes: true,
      });
      restoreModalButton.click();
    } catch (error) {
      console.error('Failed to restore version:', error);
      setIsRestoring('');
    }
  };

  return (
    <>
      {allDeployments.data && allDeployments.data.deployments.length > 0 && (
        <div className="flex flex-col">
          <h4 className="text-sm font-semibold mb-2">Changelog</h4>
          <ul className="flex flex-col gap-6">
            {allDeployments?.data?.deployments?.map((deployment, ind) => (
              <li key={deployment.id}>
                <DeploymentItem
                  deployment={deployment}
                  restoreVersion={restoreVersionConfirmation}
                  isRestoring={isRestoring}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {allDeployments.isSuccess && allDeployments.data?.deployments.length === 0 && (
        <p className="text-sm text-gray-500">No deployments found</p>
      )}

      {allDeployments.isError && (
        <p className="text-sm text-gray-500">Failed to load deployments</p>
      )}

      {allDeployments.isLoading && <p className="text-sm text-gray-500">Loading...</p>}
    </>
  );
};

function DeploymentItem({
  deployment,
  isActive = false,
  restoreVersion,
  isRestoring,
}: {
  deployment: Deployment;
  isActive?: boolean;
  restoreVersion: (deploymentId: string) => void;
  isRestoring: string;
}) {
  return (
    <div className="flex flex-col relative [&:hover_span]:opacity-100">
      <p className="text-sm text-gray-500 leading-[38px]">
        <span className="font-semibold text-gray-900">Version: {deployment.version} </span>
        {isActive && <span className="text-smyth-emerald-400 pl-4">Active</span>}
        {!isActive && (!isRestoring || isRestoring == deployment.id) && (
          <span
            onClick={() => restoreVersion(deployment.id)}
            className={classNames(
              'restore-button text-gray-500 cursor-pointer absolute right-0 top-1 w-20 rounded text-center border border-solid leading-[28px] opacity-0 transition-opacity duration-200 hover:bg-smyth-blue hover:text-white hover:border-smyth-blue',
              { 'opacity-100': isRestoring },
            )}
          >
            {!isRestoring && 'Restore'}
            {isRestoring && deployment.id === isRestoring && <Spinner classes="w-4 h-4" />}
          </span>
        )}
      </p>
      <p className="text-sm text-gray-500">
        Release date: {Intl.DateTimeFormat('en-US').format(new Date(deployment.createdAt))}
      </p>
      {deployment.releaseNotes.trim() && (
        <p className="text-sm text-gray-500">Release notes: {deployment.releaseNotes}</p>
      )}
    </div>
  );
}

export default DeploymentsHistory;
