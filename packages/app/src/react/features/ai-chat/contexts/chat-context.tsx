/* eslint-disable no-unused-vars */
import { ChatInputRef } from '@react/features/ai-chat/components/input';
import { IChatMessage, IMessageFile } from '@react/features/ai-chat/types/chat.types';
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
  chat: {
    // State
    messages: IChatMessage[];
    isStreaming: boolean;
    isProcessing: boolean;

    // Actions
    sendMessage: (message: string, files?: File[] | IMessageFile[]) => Promise<void>;
    retryMessage: () => Promise<void>;
    stopGenerating: () => void;
    clearMessages: () => void;
  };
  // Model override (temporary, not saved to agent config)
  modelOverride: string | null;
  setModelOverride: (model: string | null) => void;
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
  chat: {
    messages: [],
    isStreaming: false,
    isProcessing: false,
    sendMessage: async () => {},
    retryMessage: async () => {},
    stopGenerating: () => {},
    clearMessages: () => {},
  },
  modelOverride: null,
  setModelOverride: () => {},
});
