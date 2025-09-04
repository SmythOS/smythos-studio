/* eslint-disable no-unused-vars */
import {
  ChatHistory,
  IChatMessage,
  ScrollToBottomButton,
} from '@react/features/ai-chat/components';
import { AgentDetails } from '@src/react/shared/types/agent-data.types';
import { FC, MutableRefObject, RefObject, useEffect } from 'react';
import { useDragAndDrop } from '../hooks';

interface MessagesProps {
  handleScroll: () => void;
  chatContainerRef: RefObject<HTMLElement>;
  currentAgent: AgentDetails;
  chatHistoryMessages: IChatMessage[];
  showScrollButton: boolean;
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

export const Messages: FC<MessagesProps> = (props) => {
  const {
    handleScroll,
    chatContainerRef,
    currentAgent,
    chatHistoryMessages,
    showScrollButton,
    scrollToBottom,
    handleFileDrop,
  } = props;
  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });
  useEffect(() => scrollToBottom(), [chatHistoryMessages, scrollToBottom]);

  return (
    <div
      onScroll={handleScroll}
      ref={combineRefs(chatContainerRef, dropzoneRef)}
      className="w-full h-full overflow-auto relative scroll-smooth mt-16"
    >
      <ChatHistory agent={currentAgent} messages={chatHistoryMessages} />
      {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom(true)} />}
    </div>
  );
};
