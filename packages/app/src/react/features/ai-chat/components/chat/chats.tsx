import { Chat } from '@react/features/ai-chat/components';
import { useChatStores, useDragAndDrop } from '@react/features/ai-chat/hooks';
import { FC } from 'react';

export const Chats: FC = () => {
  const { refs, agent, chat, files, scroll } = useChatStores() || {};

  const { container: containerRef } = refs || {};
  const { messages, retryMessage } = chat || {};
  const { handleScroll, smartScrollToBottom } = scroll || {};

  const avatar = agent.settings?.avatar;

  useDragAndDrop({ ref: containerRef, onDrop: files.addFiles });

  return (
    <div
      data-chat-container
      onScroll={handleScroll}
      ref={containerRef}
      className="w-full h-full overflow-auto relative scroll-smooth mt-16 flex justify-center items-center"
    >
      <div className="w-full h-full max-w-4xl flex-1 pb-10 space-y-3.5">
        {messages.map((msg, i) => (
          <Chat
            {...msg}
            key={msg.id}
            avatar={avatar}
            scrollToBottom={smartScrollToBottom}
            retry={i === messages.length - 1 ? retryMessage : undefined}
          />
        ))}
      </div>
    </div>
  );
};
