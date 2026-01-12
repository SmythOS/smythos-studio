import { FC } from 'react';
import { FaRegPenToSquare } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { CloseIcon } from '@react/features/ai-chat/components';
import { Tooltip, TooltipContent, TooltipTrigger } from '@react/shared/components/ui/tooltip';

type IProps = { onNewChat: () => void };

export const HeaderActions: FC<IProps> = ({ onNewChat }) => (
  <div className="flex items-center justify-center gap-2">
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="cursor-pointer w-6 h-6 flex items-center justify-center"
          onClick={onNewChat}
        >
          <FaRegPenToSquare className="text-slate-500 w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>New Chat</p>
      </TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/agents">
          <CloseIcon className="text-slate-500 w-6 h-6" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Exit</p>
      </TooltipContent>
    </Tooltip>
  </div>
);
