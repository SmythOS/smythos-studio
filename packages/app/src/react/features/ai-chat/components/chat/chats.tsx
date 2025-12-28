import { Chat } from '@react/features/ai-chat/components';
import { useChatStores, useDragAndDrop } from '@react/features/ai-chat/hooks';
import { FC, MutableRefObject, RefObject, useRef } from 'react';

/**
 * Combines multiple refs into a single ref callback
 * Useful for managing multiple refs on the same element
 *
 * @param refs - Array of refs to combine
 * @returns Combined ref callback
 */
const combineRefs =
  <T extends HTMLElement>(...refs: Array<RefObject<T> | MutableRefObject<T | null>>) =>
  (element: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      (ref as MutableRefObject<T | null>).current = element;
    });
  };

/**
 * Chats Component
 * Renders chat messages with smart auto-scroll and drag-and-drop support
 */
export const Chats: FC = () => {
  const { ref: allRefs, agent: agentData, chat, files, scroll } = useChatStores() || {};

  const { messages, retryMessage } = chat || {};
  const { handleScroll, smartScrollToBottom } = scroll || {};

  const agent = agentData?.data;
  const containerRef = allRefs?.container;
  const handleFileDrop = files.addFiles;

  const ref = useRef<HTMLDivElement>(null);
  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });

  return (
    <div
      data-chat-container
      onScroll={handleScroll}
      ref={combineRefs(containerRef, dropzoneRef)}
      className="w-full h-full overflow-auto relative scroll-smooth mt-16 flex justify-center items-center"
    >
      <div
        ref={ref}
        onScroll={handleScroll}
        className="w-full h-full max-w-4xl flex-1 pb-10 space-y-3.5"
      >
        {messages.map((message, index) => (
          <Chat
            {...message}
            key={message.id}
            avatar={agent?.aiAgentSettings?.avatar}
            scrollToBottom={smartScrollToBottom}
            onRetryClick={index === messages.length - 1 ? retryMessage : undefined}
          />
        ))}
      </div>
    </div>
  );
};
