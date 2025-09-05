/* eslint-disable no-unused-vars */
import { Chat, ScrollToBottomButton } from '@react/features/ai-chat/components';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { useDragAndDrop } from '@react/features/ai-chat/hooks';
import { AgentDetails } from '@src/react/shared/types/agent-data.types';
import { IChatMessage } from '@src/react/shared/types/chat.types';
import { FC, MutableRefObject, RefObject, useEffect, useRef } from 'react';

interface MessagesProps {
  agent: AgentDetails;
  messages: IChatMessage[];
  handleScroll: () => void;
  showScrollButton: boolean;
  containerRef: RefObject<HTMLElement>;
  scrollToBottom: (smooth?: boolean) => void;
  smartScrollToBottom: (smooth?: boolean) => void;
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
  const { agent, messages, containerRef, handleFileDrop, ...scroll } = props;
  const { handleScroll, scrollToBottom, smartScrollToBottom, showScrollButton } = scroll;

  const ref = useRef<HTMLDivElement>(null);
  const { isRetrying, retryLastMessage } = useChatContext();
  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });

  // Smart auto-scroll when new messages arrive (respects user scroll position)
  // But only for system messages, not user messages (user messages handle their own scroll)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    // Only auto-scroll for system messages, not user messages
    // lastMessage.me === false means it's a system message
    if (lastMessage && !lastMessage.me) {
      smartScrollToBottom();
    }
  }, [messages, smartScrollToBottom]);

  const avatar = agent?.aiAgentSettings?.avatar;

  return (
    <div
      data-chat-container
      onScroll={handleScroll}
      ref={combineRefs(containerRef, dropzoneRef)}
      className="w-full h-full overflow-auto relative scroll-smooth mt-16 flex justify-center items-center"
    >
      <div
        className="w-full h-full max-w-4xl"
        onScroll={handleScroll}
        ref={combineRefs(containerRef, dropzoneRef)}
      >
        <div className="w-full flex-1 pb-4 space-y-6 px-2.5" ref={ref}>
          {messages.map((message, i) => {
            const isLast = i === messages.length - 1;
            const onRetryClick = message.isError && isLast ? retryLastMessage : undefined;
            const retry = isRetrying && isLast;

            return (
              <div key={i}>
                <Chat
                  {...message}
                  avatar={avatar}
                  isRetrying={retry}
                  isError={message.isError}
                  onRetryClick={onRetryClick}
                  scrollToBottom={smartScrollToBottom}
                />

                {retry && (
                  <button onClick={retryLastMessage} className="pt-1.5">
                    Retry
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom(true)} />}
      </div>
    </div>
  );
};
