import { ChatInputRef } from '@react/features/ai-chat/components/input';
import { AgentDetails, AgentSettings } from '@react/shared/types/agent-data.types';
import { createContext, MutableRefObject } from 'react';

export interface IChatContext {
  ref: { input?: MutableRefObject<ChatInputRef>; container?: MutableRefObject<HTMLDivElement> };
  agent: { data?: AgentDetails; settings?: AgentSettings; loading: boolean };
}

export const ChatContext = createContext<IChatContext>({
  ref: { input: undefined, container: undefined },
  agent: { data: undefined, settings: undefined, loading: false },
});
