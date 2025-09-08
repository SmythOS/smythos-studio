import { Tooltip } from 'flowbite-react';
import { FC } from 'react';
import { FaRegPenToSquare } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { CloseIcon } from '@react/features/ai-chat/components/icons';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { cn } from '@src/react/shared/utils/general';

/**
 * Skeleton component
 */
const Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse',
      className,
    )}
  />
);

interface ChatHeaderProps {
  avatar?: string;
  agentName?: string;
  isAgentLoading?: boolean;
  isAvatarLoading?: boolean;
}

export const ChatHeader: FC<ChatHeaderProps> = (props) => {
  const { avatar, agentName, isAgentLoading, isAvatarLoading } = props;
  const { clearChatSession } = useChatContext();

  return (
    <div className="w-full bg-white border-b border-[#e5e5e5] h-14 flex justify-center absolute top-0 left-0 z-10 px-2.5 lg:px-0">
      <div className="w-full max-w-4xl flex justify-between items-center">
        {/* Left side - Avatar and Agent Name */}
        <div className="flex items-center gap-3">
          {isAvatarLoading ? (
            <Skeleton className="size-8 rounded-full" />
          ) : (
            <img
              src={avatar ?? DEFAULT_AVATAR_URL}
              alt="avatar"
              className="size-8 rounded-full transition-opacity duration-300 ease-in-out"
            />
          )}

          <div className="flex items-center">
            {isAgentLoading ? (
              <Skeleton className="w-24 h-6 rounded-md" />
            ) : (
              <span className="text-lg font-medium text-[#111827] transition-opacity duration-300 ease-in-out">
                {agentName || 'Unknown Agent'}
              </span>
            )}
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center justify-center gap-2">
          <Tooltip content={<>New&nbsp;Chat</>} placement="bottom">
            <button
              className="cursor-pointer w-6 h-6 flex items-center justify-center"
              onClick={clearChatSession}
            >
              <FaRegPenToSquare className="text-gray-500 w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Exit" placement="bottom">
            <Link to="/agents">
              <CloseIcon className="text-gray-500 w-6 h-6" />
            </Link>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
