/* eslint-disable no-unused-vars */
import { Chat, MessageTurnGroup } from '@react/features/ai-chat/components';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { useDragAndDrop } from '@react/features/ai-chat/hooks';
import { IChatMessage } from '@react/features/ai-chat/types/chat.types';
import { AgentDetails } from '@src/react/shared/types/agent-data.types';
import { FC, MutableRefObject, RefObject, useEffect, useMemo, useRef } from 'react';

/**
 * Chats component properties
 */
interface IChatsProps {
  agent: AgentDetails; // Agent details for avatar display
  messages: IChatMessage[]; // Array of chat messages to display
  handleScroll: () => void; // Scroll event handler
  containerRef: RefObject<HTMLElement>; // Container ref for scroll control
  smartScrollToBottom: (smooth?: boolean) => void; // Smart scroll to bottom function
  handleFileDrop: (droppedFiles: File[]) => Promise<void>; // File drop handler for drag-and-drop uploads
}

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
export const Chats: FC<IChatsProps> = (props) => {
  const { agent, messages, containerRef, handleFileDrop, ...scroll } = props;
  const { handleScroll, smartScrollToBottom } = scroll;

  const ref = useRef<HTMLDivElement>(null);
  const { retryLastMessage } = useChatContext();
  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // ✅ Use type-based discrimination instead of 'me' boolean
    const isSystemMessage = lastMessage.type === 'system';

    if (isSystemMessage) {
      smartScrollToBottom();
    }
  }, [messages, smartScrollToBottom]);

  const avatar = agent?.aiAgentSettings?.avatar;

  /**
   * Group messages by conversationTurnId
   * Messages with same turnId are grouped together
   * Messages without turnId are treated as individual groups
   */
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      turnId: string | null;
      messages: IChatMessage[];
      isUserMessage: boolean;
    }> = [];

    messages.forEach((message) => {
      const turnId = message.conversationTurnId || null;
      const isUser = message.type === 'user';

      // User messages are always individual (not grouped)
      if (isUser) {
        groups.push({
          turnId,
          messages: [message],
          isUserMessage: true,
        });
        return;
      }

      // For AI messages, check if we can add to existing group
      const lastGroup = groups[groups.length - 1];

      // If last group has same turnId and is not a user message, add to it
      if (lastGroup && !lastGroup.isUserMessage && lastGroup.turnId === turnId && turnId !== null) {
        lastGroup.messages.push(message);
      } else {
        // Otherwise create new group
        groups.push({
          turnId,
          messages: [message],
          isUserMessage: false,
        });
      }
    });

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
          const onRetryClick = canRetry ? retryLastMessage : undefined;

          // User messages render individually (no grouping)
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

          // AI messages with turnId render as a group
          if (group.turnId && group.messages.length > 0) {
            return (
              <MessageTurnGroup
                key={group.turnId}
                messages={group.messages}
                avatar={avatar}
                onRetryClick={onRetryClick}
                scrollToBottom={smartScrollToBottom}
              />
            );
          }

          // Fallback: Messages without turnId render individually
          return group.messages.map((message, messageIndex) => (
            <Chat
              key={message.id || `${groupIndex}-${messageIndex}`}
              {...message}
              avatar={avatar}
              onRetryClick={messageIndex === group.messages.length - 1 ? onRetryClick : undefined}
              scrollToBottom={smartScrollToBottom}
            />
          ));
        })}
      </div>
    </div>
  );
};
