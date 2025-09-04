import { FC, useEffect, useRef } from 'react';

import { ChatBubble, IChatMessage } from '@react/features/ai-chat/components';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { AgentDetails } from '@react/shared/types/agent-data.types';

interface ChatHistoryProps {
  agent: AgentDetails;
  messages: IChatMessage[];
}

export const ChatHistory: FC<ChatHistoryProps> = ({ agent, messages }) => {
  const { chatHistoryMessages, isRetrying: contextIsRetrying, retryLastMessage } = useChatContext();
  const messagesContainer = useRef<HTMLDivElement>(null);
  const avatar = agent?.aiAgentSettings?.avatar;

  useEffect(() => {
    if (!messagesContainer.current) return;
    messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
  }, [messages]);

  return (
    <div className="w-full flex-1 pb-4 space-y-6 px-2.5" ref={messagesContainer}>
      {chatHistoryMessages.map((message, index) => (
        <div key={index}>
          <ChatBubble
            {...message}
            avatar={avatar}
            onRetryClick={
              index === chatHistoryMessages.length - 1 && message.isError
                ? retryLastMessage
                : undefined
            }
            isRetrying={contextIsRetrying && index === chatHistoryMessages.length - 1}
            // Handle error messages as normal responses with error styling
            isError={message.isError}
          />
          {index === chatHistoryMessages.length - 1 && contextIsRetrying && (
            <button onClick={retryLastMessage}>Retry</button>
          )}
        </div>
      ))}
    </div>
  );
};
