import { Tooltip } from 'flowbite-react';
import { FC } from 'react';
import { FaRegPenToSquare, FaUser } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { useChatContext } from '@react/features/ai-chat/contexts';
import { cn } from '@src/react/shared/utils/general';
import { CloseIcon } from './icons';

interface ChatHeaderProps {
  agentName?: string;
  avatar?: string;
  isLoading?: boolean;
}

export const ChatHeader: FC<ChatHeaderProps> = ({ agentName, avatar, isLoading }) => {
  const { clearChatSession } = useChatContext();

  return (
    <div className="w-full bg-white border-b border-[#e5e5e5] h-14 flex justify-center absolute top-0 left-0 z-10">
      <div className="w-full max-w-4xl flex justify-between items-center">
        {/* Left side - Avatar and Agent Name */}
        <div className="flex items-center gap-3">
          {avatar && !isLoading ? (
            <img src={avatar} alt="avatar" className="size-8 rounded-full" />
          ) : (
            <div
              className={cn(
                'size-8 flex justify-center items-center rounded-full bg-primary-100',
                isLoading && 'animate-pulse',
              )}
            >
              <FaUser className="size-4" />
            </div>
          )}
          <div className="text-lg font-medium text-[#111827]">{agentName || '...'}</div>
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
