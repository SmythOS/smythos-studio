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
  shouldAutoScroll: boolean; // Whether auto-scroll is enabled (user is near bottom)
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
  const { handleScroll, smartScrollToBottom, shouldAutoScroll } = scroll;

  const ref = useRef<HTMLDivElement>(null);
  const { retryLastMessage } = useChatContext();
  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });

  /**
   * ULTRA-SMOOTH SCROLL OPTIMIZATION WITH USER CONTROL
   *
   * KEY IMPROVEMENTS:
   * - Instant scroll during streaming (no smooth animation lag)
   * - Aggressive 16ms throttle (60fps) for buttery smoothness
   * - Respects user scroll position (shouldAutoScroll check)
   * - User scrolls up >200px = auto-scroll disabled
   * - User scrolls back to bottom = auto-scroll re-enabled
   * - Uses requestAnimationFrame for perfect frame sync
   */
  const lastScrolledIdRef = useRef<string | number | undefined>();
  const lastMessageLengthRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const { isGenerating } = useChatContext();

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

        /**
         * ULTRA-SMOOTH SCROLL STRATEGY WITH USER CONTROL:
         *
         * 1. Check shouldAutoScroll FIRST
         *    - If user scrolled up >200px, shouldAutoScroll = false
         *    - Don't scroll if user is reading history
         *    - Result: User stays in control
         *
         * 2. During streaming: Use instant scrolling (no smooth animation)
         *    - Reason: Smooth animation causes lag with rapid updates
         *    - Result: Instant, responsive, no lag
         *
         * 3. Throttle at 16ms (60fps): Perfect for human perception
         *    - Reason: 60fps is maximum visible smoothness
         *    - Result: Buttery smooth, no excessive calls
         *
         * 4. Use RAF for frame-perfect timing
         *    - Reason: Syncs with browser paint cycle
         *    - Result: Smooth, no jank
         */

        // CRITICAL: Check if user wants auto-scroll
        // If user scrolled up >200px, shouldAutoScroll = false
        // This respects user's intent to read history
        if (!shouldAutoScroll) {
          return; // Don't scroll if user is reading above
        }

        const now = performance.now();
        const timeSinceLastScroll = now - lastScrollTimeRef.current;
        const shouldThrottle = !isNewMessage && timeSinceLastScroll < 16; // 60fps

        // Cancel pending RAF
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        const performScroll = () => {
          lastScrollTimeRef.current = performance.now();

          // CRITICAL: Use instant scroll during streaming for smoothness
          // Smooth animation causes lag when content updates rapidly
          if (containerRef?.current) {
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: isGenerating ? 'auto' : 'smooth', // instant during streaming!
            });
          }
        };

        if (shouldThrottle) {
          // Throttle: Use RAF for next frame
          rafRef.current = requestAnimationFrame(() => {
            performScroll();
            rafRef.current = null;
          });
        } else {
          // Immediate: New message or throttle passed
          performScroll();
        }
      }
    }

    // Cleanup
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [messages, isGenerating, containerRef, shouldAutoScroll]);

  const avatar = agent?.aiAgentSettings?.avatar;

  /**
   * Group messages by conversationTurnId (Optimized)
   * Uses incremental grouping for better performance with long conversations
   * Messages with same turnId are grouped together
   * Messages without turnId are treated as individual groups
   */
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      turnId: string | null;
      messages: IChatMessage[];
      isUserMessage: boolean;
    }> = [];

    // Optimized: Early return for empty messages
    if (messages.length === 0) {
      return groups;
    }

    // Optimized: Process messages in a single pass
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const turnId = message.conversationTurnId || null;
      const isUser = message.type === 'user';

      // User messages are always individual (not grouped)
      if (isUser) {
        groups.push({
          turnId,
          messages: [message],
          isUserMessage: true,
        });
        continue;
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
