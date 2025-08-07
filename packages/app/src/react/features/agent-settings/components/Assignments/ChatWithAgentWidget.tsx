import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { PRIMARY_BUTTON_STYLE, SECONDARY_BUTTON_STYLE } from '@react/shared/constants/style';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { EVENTS } from '@src/shared/posthog/constants/events';
import { PostHog } from '@src/shared/posthog/index';
import classNames from 'classnames';
import { Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';
import { FC } from 'react';
import { FaArrowRight } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

type Props = {
  isWriteAccess?: boolean;
  isAgentDeployed?: boolean;
};

type ChatIconProps = {
  className?: string;
};

export const ChatIcon: FC<ChatIconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      fill="none"
      viewBox="0 0 32 32"
      className={className}
    >
      <path
        d="M16 28C22.6275 28 28 22.6275 28 16C28 9.37259 22.6275 4 16 4C9.37259 4 4 9.37259 4 16C4 18.8653 5.00423 21.496 6.67991 23.5595C6.88023 23.8061 6.89623 24.1584 6.70493 24.4121L5.28836 26.2912C4.75851 26.9941 5.25992 28 6.14011 28H16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13.4062 18.638L13.2715 18.2735C12.7637 16.8991 11.6817 15.8155 10.3092 15.307L9.94531 15.172L10.3092 15.0372C11.6817 14.5286 12.7637 13.445 13.2715 12.0706L13.4062 11.7061L13.5408 12.0706C14.0487 13.445 15.1307 14.5286 16.5031 15.0372L16.8672 15.172L16.5031 15.307C15.1307 15.8155 14.0487 16.8991 13.5408 18.2735L13.4062 18.638Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.4869 20.2939C20.2581 19.5411 19.6697 18.9519 18.918 18.7227C19.6697 18.4935 20.2581 17.9043 20.4869 17.1514C20.7157 17.9043 21.304 18.4935 22.0557 18.7227C21.304 18.9519 20.7157 19.5411 20.4869 20.2939Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ChatWithAgentWidget = ({ isWriteAccess, isAgentDeployed }: Props) => {
  const { agentId } = useAgentSettingsCtx();
  const { isEnterpriseUser, isPremiumUser, isStarterUser, isProUser, isCustomUser } = useAuthCtx();
  const isPrivilegedUser =
    isEnterpriseUser || isPremiumUser || isStarterUser || isProUser || isCustomUser;

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess} showOverflow={true} hasBorder={false}>
      <div
        className="flex flex-col bg-gray-50 p-4 border border-solid border-gray-200 rounded-lg"
        data-qa="chat-with-agent-container"
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                Chat with Agent
                <Tooltip
                  className="w-52 text-center"
                  content="Interact directly with your agent through a conversational interface."
                >
                  <Info className="w-4 h-4" />
                </Tooltip>
              </label>
            </div>
            <p className="text-sm text-gray-500">Message your agent, assign a task via chat.</p>
          </div>

          <Tooltip
            content={
              <>
                To chat with your agent, please deploy to production.{' '}
                <>
                  <Link
                    to={`/builder/${agentId}`}
                    target="_blank"
                    className="underline"
                    reloadDocument
                  >
                    Deploy
                  </Link>{' '}
                  your agent now.
                </>
              </>
            }
            trigger="hover"
            placement="top"
            className={classNames(
              isAgentDeployed ? 'opacity-0 pointer-events-none' : 'opacity-100',
              'min-w-[280px] text-center',
            )}
            hidden={isAgentDeployed}
            style="dark"
          >
            <Link
              to={isAgentDeployed ? `/chat/${agentId}` : ''}
              className={classNames(
                'flex items-center justify-center font-normal border border-solid text-base px-4 py-2 text-center rounded transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none',
                `${isAgentDeployed ? PRIMARY_BUTTON_STYLE : SECONDARY_BUTTON_STYLE}`,
              )}
              onClick={(e) => {
                PostHog.track(EVENTS.AGENT_SETTINGS_EVENTS.app_chat_with_agent, {
                  source: 'agent settings',
                });
                !isAgentDeployed && e.preventDefault();
              }}
              target="_blank"
            >
              <ChatIcon className="w-6 h-6 mr-1" />
              Chat <FaArrowRight className="ml-1" />
            </Link>
          </Tooltip>
        </div>
      </div>
    </WidgetCard>
  );
};

export default ChatWithAgentWidget;
