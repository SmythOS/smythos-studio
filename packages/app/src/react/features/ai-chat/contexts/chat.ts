/* eslint-disable no-unused-vars */
import type { IFileUpload, TChatMessage } from '@react/features/ai-chat/types';
import type { AgentDetails, AgentSettings } from '@react/shared/types/agent-data.types';
import { createContext, RefObject } from 'react';

export interface IChatContext {
  refs: {
    input?: RefObject<HTMLTextAreaElement | null>;
    container?: RefObject<HTMLDivElement | null>;
  };
  agent: {
    data?: AgentDetails;
    settings?: AgentSettings;
    isLoading: { agent: boolean; settings: boolean };
  };
  files: IFileUpload;
  chat: {
    isChatCreating: boolean;
    messages: TChatMessage[];
    isStreaming: boolean;
    sendMessage: (message: string) => Promise<void>;
    retryMessage: () => void;
    stopStreaming: () => void;
    resetSession: () => Promise<void>;
  };
  scroll: {
    showScrollButton: boolean;
    handleScroll: () => void;
    scrollToBottom: (smooth?: boolean) => void;
    smartScrollToBottom: (smooth?: boolean) => void;
    hideScrollButton: () => void;
  };
  modelOverride: string | null;
  setModelOverride: (model: string | null) => void;
}

export const ChatContext = createContext<IChatContext>({
  refs: { input: undefined, container: undefined },
  agent: { data: undefined, settings: undefined, isLoading: { agent: false, settings: false } },
  files: {
    attachments: [],
    status: {},
    uploading: false,
    errorMessage: '',
    addFiles: async () => {},
    remove: () => {},
    clear: () => {},
    clearError: () => {},
  },
  chat: {
    isChatCreating: false,
    messages: [],
    isStreaming: false,
    sendMessage: async () => {},
    retryMessage: async () => {},
    stopStreaming: () => {},
    resetSession: async () => {},
  },
  scroll: {
    showScrollButton: false,
    handleScroll: () => {},
    scrollToBottom: () => {},
    smartScrollToBottom: () => {},
    hideScrollButton: () => {},
  },
  modelOverride: null,
  setModelOverride: () => {},
});
