import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat-context';
import { FC, ReactNode, useMemo, useState } from 'react';

interface IProps {
  children: ReactNode;
}

export const ChatContextProvider: FC<IProps> = ({ children }) => {
  const [agentId] = useState('');

  // Memoize the store to avoid unnecessary re-renders
  const values: IChatContext = useMemo(() => ({ agentId }), [agentId]);

  return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};
