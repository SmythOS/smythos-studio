import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat';
import { useContext } from 'react';

export const useChatStores = () => useContext(ChatContext);

export const useChatStore = <T extends keyof IChatContext>(state: T): IChatContext[T] => {
  const store = useContext(ChatContext);
  if (!store) throw new Error('ChatContext not found');
  return store[state];
};

