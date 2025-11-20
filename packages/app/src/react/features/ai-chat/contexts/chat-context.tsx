import { createContext } from 'react';

export interface IChatContext {
  agentId: string;
}

export const ChatContext = createContext<IChatContext>({
  agentId: '',
});
