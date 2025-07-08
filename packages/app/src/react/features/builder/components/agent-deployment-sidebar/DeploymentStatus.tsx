import { useDeploymentSidebarCtx } from '@src/react/features/builder/contexts/deployment-sidebar.context';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { FaCheckCircle } from 'react-icons/fa';
import { RiErrorWarningFill } from 'react-icons/ri';

const DEPLOYMENT_LIMIT_REACHED_MESSAGE =
  'You have reached your quota for production agent deployments';

const DeploymentStatus = ({ onNavigate }) => {
  const { deployMutation } = useDeploymentSidebarCtx();

  return (
    <div>
      {deployMutation.isLoading ? (
        <div className="flex items-center gap-3 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="1em"
            viewBox="0 0 384 512"
            className="animate-spin"
          >
            <path
              fill="currentColor"
              d="M0 32C0 14.3 14.3 0 32 0H64 320h32c17.7 0 32 14.3 32 32s-14.3 32-32 32V75c0 42.4-16.9 83.1-46.9 113.1L237.3 256l67.9 67.9c30 30 46.9 70.7 46.9 113.1v11c17.7 0 32 14.3 32 32s-14.3 32-32 32H320 64 32c-17.7 0-32-14.3-32-32s14.3-32 32-32V437c0-42.4 16.9-83.1 46.9-113.1L146.7 256 78.9 188.1C48.9 158.1 32 117.4 32 75V64C14.3 64 0 49.7 0 32zM96 64V75c0 25.5 10.1 49.9 28.1 67.9L192 210.7l67.9-67.9c18-18 28.1-42.4 28.1-67.9V64H96zm0 384H288V437c0-25.5-10.1-49.9-28.1-67.9L192 301.3l-67.9 67.9c-18 18-28.1 42.4-28.1 67.9v11z"
            />
          </svg>
          <p className="font-semibold text-gray-500">Pushing Updates</p>
        </div>
      ) : deployMutation.isSuccess ? (
        <div className="flex items-center gap-3 mb-4">
          <FaCheckCircle className="text-emerald-500" />
          <p className="text-emerald-500 font-semibold">Deployment Successful</p>
        </div>
      ) : deployMutation.isError ? (
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-3">
            <RiErrorWarningFill className="text-red-500" />
            <p className="text-red-500 font-semibold">
              {(deployMutation.error as { error?: { message?: string } })?.error?.message ===
              DEPLOYMENT_LIMIT_REACHED_MESSAGE
                ? 'Agent Deployment Limit Reached'
                : 'Deployment Failed'}
            </p>
          </div>
          {/* @ts-ignore */}
          {deployMutation.error?.error?.message ? (
            <>
              <p className="text-red-500">
                {(deployMutation.error as { error?: { message: string } })?.error?.message ===
                DEPLOYMENT_LIMIT_REACHED_MESSAGE
                  ? 'Unlock unlimited deployments and elevate your possibilities with the Starter Plan.'
                  : (deployMutation.error as { error?: { message: string } })?.error?.message}
              </p>
              {(deployMutation.error as { error?: { message: string } })?.error?.message ===
                DEPLOYMENT_LIMIT_REACHED_MESSAGE && (
                <Button className="mt-3" variant="primary" handleClick={() => onNavigate('/plans')}>
                  Upgrade for Unlimited Deployments
                </Button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default DeploymentStatus;
