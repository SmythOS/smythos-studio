import { FC } from 'react';
import { FaRegPenToSquare, FaXmark } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { useChatContext } from '@react/features/ai-chat/contexts';

interface ChatHeaderProps {
  agentName: string;
  avatar?: string;
}

export const ChatHeader: FC<ChatHeaderProps> = ({ agentName, avatar }) => {
  const { clearChatSession } = useChatContext();

  return (
    <div className="w-full bg-white h-12 flex justify-center absolute top-0 left-0 z-10">
      <div className="w-full max-w-3xl flex justify-between items-center">
        {/* Left side - Avatar and Agent Name */}
        <div className="flex items-center gap-2">
          <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" />
          <div className="text-[20px] font-semibold text-[#111827]">{agentName}</div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          <div className="cursor-pointer" onClick={clearChatSession}>
            <FaRegPenToSquare className="text-gray-500 w-4 h-4" />
          </div>
          <div>
            <Link to="/agents">
              <FaXmark className="text-gray-500 w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
