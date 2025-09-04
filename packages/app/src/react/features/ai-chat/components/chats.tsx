/* eslint-disable no-unused-vars */
import { Chat, ScrollToBottomButton } from '@react/features/ai-chat/components';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { useDragAndDrop } from '@react/features/ai-chat/hooks';
import { AgentDetails } from '@src/react/shared/types/agent-data.types';
import { IChatMessage } from '@src/react/shared/types/chat.types';
import { FC, MutableRefObject, RefObject, useEffect, useRef } from 'react';

interface MessagesProps {
  handleScroll: () => void;
  agent: AgentDetails;
  messages: IChatMessage[];
  showScrollButton: boolean;
  containerRef: RefObject<HTMLElement>;
  scrollToBottom: (smooth?: boolean) => void;
  handleFileDrop: (droppedFiles: File[]) => Promise<void>;
}

/**
 * Combines multiple refs into a single ref callback
 */
const combineRefs =
  <T extends HTMLElement>(...refs: Array<RefObject<T> | MutableRefObject<T | null>>) =>
  (element: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      (ref as MutableRefObject<T | null>).current = element;
    });
  };

export const Chats: FC<MessagesProps> = (props) => {
  const {
    agent,
    messages,
    containerRef,
    handleScroll,
    showScrollButton,
    scrollToBottom,
    handleFileDrop,
  } = props;
  const { isRetrying, retryLastMessage } = useChatContext();
  const messagesContainer = useRef<HTMLDivElement>(null);
  const avatar = agent?.aiAgentSettings?.avatar;

  useEffect(() => {
    if (!messagesContainer.current) return;
    messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
  }, [messages]);

  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });
  useEffect(() => scrollToBottom(), [messages, scrollToBottom]);

  return (
    <div
      onScroll={handleScroll}
      ref={combineRefs(containerRef, dropzoneRef)}
      className="w-full h-full overflow-auto relative scroll-smooth mt-16"
    >
      <div className="w-full flex-1 pb-4 space-y-6 px-2.5" ref={messagesContainer}>
        {messages.map((message, index) => (
          <div key={index}>
            <Chat
              {...message}
              avatar={avatar}
              onRetryClick={
                message.isError && index === messages.length - 1 ? retryLastMessage : undefined
              }
              isRetrying={isRetrying && index === messages.length - 1}
              isError={message.isError}
            />
            {index === messages.length - 1 && isRetrying && (
              <button onClick={retryLastMessage} className="pt-1.5">
                Retry
              </button>
            )}
          </div>
        ))}
      </div>
      {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom(true)} />}
    </div>
  );
};
