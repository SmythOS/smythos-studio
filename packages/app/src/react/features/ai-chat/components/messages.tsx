/* eslint-disable no-unused-vars */
import {
  ChatHistory,
  IChatMessage,
  ScrollToBottomButton,
} from '@react/features/ai-chat/components';
import { AgentDetails } from '@src/react/shared/types/agent-data.types';
import { FC, MutableRefObject, RefObject } from 'react';

interface MessagesProps {
  handleScroll: () => void;
  combineRefs: <T extends HTMLElement>(
    ...refs: Array<RefObject<T> | MutableRefObject<T | null>>
  ) => (element: T | null) => void;
  chatContainerRef: RefObject<HTMLElement>;
  dropzoneRef: RefObject<HTMLElement>;
  currentAgent: AgentDetails;
  chatHistoryMessages: IChatMessage[];
  showScrollButton: boolean;
  scrollToBottom: (smooth?: boolean) => void;
}

export const Messages: FC<MessagesProps> = (props) => {
  const {
    handleScroll,
    combineRefs,
    chatContainerRef,
    dropzoneRef,
    currentAgent,
    chatHistoryMessages,
    showScrollButton,
    scrollToBottom,
  } = props;

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
