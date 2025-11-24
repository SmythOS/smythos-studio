import { Chat, ChatsTurnGroup } from '@react/features/ai-chat/components';
import { useChatStores, useDragAndDrop } from '@react/features/ai-chat/hooks';
import { IChatMessage } from '@react/features/ai-chat/types/chat.types';
import { FC, MutableRefObject, RefObject, useEffect, useMemo, useRef } from 'react';

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

  const agent = agentData?.data;
  const containerRef = allRefs?.container;
  const handleFileDrop = files.addFiles;
  const { messages, isStreaming, retryMessage } = chat || {};

  // ============================================================================
  // SCROLL BEHAVIOR
  // ============================================================================
  const { handleScroll, smartScrollToBottom, shouldAutoScroll } = scroll || {};

  const ref = useRef<HTMLDivElement>(null);
  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });

  const lastScrolledIdRef = useRef<string | number | undefined>();
  const lastMessageLengthRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const isSystemMessage = lastMessage.type === 'system';

    if (isSystemMessage) {
      const messageLength = lastMessage.message?.length || 0;
      const isNewMessage = lastMessage.id !== lastScrolledIdRef.current;
      const contentGrew = messageLength > lastMessageLengthRef.current;

      if (isNewMessage || contentGrew) {
        lastScrolledIdRef.current = lastMessage.id;
        lastMessageLengthRef.current = messageLength;

        if (!shouldAutoScroll) return;

        const now = performance.now();
        const timeSinceLastScroll = now - lastScrollTimeRef.current;
        const shouldThrottle = !isNewMessage && timeSinceLastScroll < 16; // 60fps throttle

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        const performScroll = () => {
          lastScrollTimeRef.current = performance.now();

          if (containerRef?.current) {
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: isStreaming ? 'auto' : 'smooth',
            });
          }
        };

        if (shouldThrottle) {
          rafRef.current = requestAnimationFrame(() => {
            performScroll();
            rafRef.current = null;
          });
        } else {
          performScroll();
        }
      }
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [messages, isStreaming, containerRef, shouldAutoScroll]);

  const avatar = agent?.aiAgentSettings?.avatar;

  /**
   * Group messages by turnId. Messages with same turnId are grouped together.
   * User messages are always individual, AI messages with same turnId are grouped.
   */
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      turnId: string | null;
      messages: IChatMessage[];
      isUserMessage: boolean;
    }> = [];

    if (messages.length === 0) return groups;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const turnId = message.turnId || null;
      const isUser = message.type === 'user';

      if (isUser) {
        groups.push({ turnId, messages: [message], isUserMessage: true });
        continue;
      }

      const lastGroup = groups[groups.length - 1];

      if (lastGroup && !lastGroup.isUserMessage && lastGroup.turnId === turnId && turnId !== null) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ turnId, messages: [message], isUserMessage: false });
      }
    }

    return groups;
  }, [messages]);

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
        {groupedMessages.map((group, groupIndex) => {
          const isLastGroup = groupIndex === groupedMessages.length - 1;
          const lastMessageInGroup = group.messages[group.messages.length - 1];
          const canRetry = lastMessageInGroup.type === 'error' && isLastGroup;
          const onRetryClick = canRetry ? retryMessage : undefined;

          if (group.isUserMessage) {
            const message = group.messages[0];

            return (
              <Chat
                key={message.id || groupIndex}
                {...message}
                avatar={avatar}
                onRetryClick={onRetryClick}
                scrollToBottom={smartScrollToBottom}
              />
            );
          }

          if (group.turnId && group.messages.length > 0) {
            return (
              <ChatsTurnGroup
                avatar={avatar}
                key={group.turnId}
                messages={group.messages}
                onRetryClick={onRetryClick}
                scrollToBottom={smartScrollToBottom}
              />
            );
          }

          return group.messages.map((message, messageIndex) => (
            <Chat
              key={message.id || `${groupIndex}-${messageIndex}`}
              {...message}
              avatar={avatar}
              scrollToBottom={smartScrollToBottom}
              onRetryClick={messageIndex === group.messages.length - 1 ? onRetryClick : undefined}
            />
          ));
        })}
      </div>
    </div>
  );
};
