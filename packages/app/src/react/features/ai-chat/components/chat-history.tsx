import { debounce } from 'lodash-es';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { ChatBubble, IChatMessage } from '@react/features/ai-chat/components';
import { CHAT_ERROR_MESSAGE } from '@react/features/ai-chat/constants';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { useChatMessagesSuspendedQuery } from '@react/features/ai-chat/hooks';
import { AgentDetails } from '@react/shared/types/agent-data.types';

interface ChatHistoryProps {
  chatId: string;
  agent: AgentDetails;
  messages: IChatMessage[];
}

export const ChatHistory: FC<ChatHistoryProps> = ({ agent, chatId, messages }) => {
  const { chatHistoryMessages, isRetrying: contextIsRetrying, retryLastMessage } = useChatContext();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasError, setHasError] = useState(false);
  const messagesContainer = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const avatar = agent?.aiAgentSettings?.avatar;
  const LIMIT = 25;

  const { inView: topInView } = useInView({ threshold: 0 });

  const { isFetching } = useChatMessagesSuspendedQuery(
    { agentId: agent?.id, chatId: chatId, page: page, limit: LIMIT },
    { enabled: false, retry: false },
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setHasError(false);
  }, [chatId]);

  const loadMoreMessages = useCallback(() => {
    if (!isFetching && hasMore && !isLoadingMore && !hasError) {
      // TEMPORARY FIX TO AVOID PAGE
      if (messages.length > 0) {
        setIsLoadingMore(true);
        setPage((prevPage) => prevPage + 1);
      }
    }
  }, [isFetching, hasMore, isLoadingMore, hasError]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedLoadMoreMessages = useCallback(debounce(loadMoreMessages, 300), [
    loadMoreMessages,
  ]);

  useEffect(() => {
    if (topInView && hasMore && !isLoadingMore) {
      debouncedLoadMoreMessages();
    }
  }, [topInView, debouncedLoadMoreMessages, hasMore, isLoadingMore]);

  useEffect(() => {
    if (!messagesContainer.current) return;
    messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
  }, [messages]);

  return (
    <div className="w-full flex flex-col items-center">
      <div
        className="flex-1 h-screen overflow-y-auto scrollbar-hide pb-4 flex flex-col items-center w-full"
        ref={messagesContainer}
      >
        <div className="flex flex-col gap-6 max-w-4xl w-full">
          {hasError && <ErrorMessage avatar={avatar} />}
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
                errorType={message.errorType}
              />
              {index === chatHistoryMessages.length - 1 && contextIsRetrying && (
                <button onClick={retryLastMessage}>Retry</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ErrorMessage: FC<{ avatar?: string }> = ({ avatar }) => (
  <ChatBubble isError message={CHAT_ERROR_MESSAGE} avatar={avatar} me={false} />
);
