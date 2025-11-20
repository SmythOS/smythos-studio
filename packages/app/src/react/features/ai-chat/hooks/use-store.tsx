import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat-context';
import { useContext } from 'react';

export const useChatContext = () => useContext(ChatContext);

export const useChatContextValue = <T extends keyof IChatContext>(state: T): IChatContext[T] => {
  const store = useContext(ChatContext);
  if (!store) throw new Error('ChatContext not found');
  return store[state];
};
