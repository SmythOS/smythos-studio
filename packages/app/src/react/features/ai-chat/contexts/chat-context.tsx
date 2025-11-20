/* eslint-disable no-unused-vars */
import { ChatInputRef } from '@react/features/ai-chat/components/input';
import { IMessageFile } from '@react/features/ai-chat/types/chat.types';
import { AgentDetails, AgentSettings } from '@react/shared/types/agent-data.types';
import { createContext, MutableRefObject } from 'react';

export interface IChatContext {
  ref: { input?: MutableRefObject<ChatInputRef>; container?: MutableRefObject<HTMLDivElement> };
  agent: { data?: AgentDetails; settings?: AgentSettings; loading: boolean };
  files: {
    isLoading: boolean;
    errorMessage: string;
    data: IMessageFile[];
    addFiles: (newFiles: File[]) => Promise<void>;
    removeFile: (index: number) => Promise<void>;
  };
}

export const ChatContext = createContext<IChatContext>({
  ref: { input: undefined, container: undefined },
  agent: { data: undefined, settings: undefined, loading: false },
  files: {
    data: [],
    isLoading: false,
    errorMessage: '',
    addFiles: async () => {},
    removeFile: async () => {},
  },
});
