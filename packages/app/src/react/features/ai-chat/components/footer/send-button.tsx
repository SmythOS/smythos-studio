import { FC } from 'react';
import { FaStop } from 'react-icons/fa6';

import { SendIcon } from '@react/features/ai-chat/components';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { cn } from '@react/shared/utils/general';

interface IProps {
  isStreaming: boolean;
  disabled: boolean;
  onClick: () => void;
}

export const SendButton: FC<IProps> = ({ isStreaming, disabled, onClick }) => (
  <Button
    addIcon
    variant="primary"
    disabled={disabled}
    handleClick={onClick}
    className={cn(
      'h-[40px] w-[40px] rounded-lg px-0 py-0',
      isStreaming ? 'chat-stop' : 'chat-send',
    )}
    Icon={isStreaming ? <FaStop fontSize={14} /> : <SendIcon className="text-white" />}
  />
);
