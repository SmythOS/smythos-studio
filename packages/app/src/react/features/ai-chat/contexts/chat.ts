/* eslint-disable no-unused-vars */
import type { IFileUpload, TChatMessage } from '@react/features/ai-chat/types';
import type { Agent, AgentSettings } from '@react/shared/types/agent-data.types';
import { createContext, RefObject } from 'react';

export type TPageState = 'loading' | 'error' | 'auth-required' | 'disabled' | 'ready';

export interface IChatContext {
  refs: {
    input?: RefObject<HTMLTextAreaElement | null>;
    container?: RefObject<HTMLDivElement | null>;
  };
  agent: {
    data?: Agent;
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
  auth: {
    isRequired: boolean;
    method?: string;
    authorizationUrl?: string;
    onAuthSuccess: () => Promise<void>;
    redirectInternalEndpoint?: string;
    domain?: string;
  };
  pageState: TPageState;
}

export const ChatContext = createContext<IChatContext>({
  refs: { input: undefined, container: undefined },
  agent: { data: undefined, settings: undefined, isLoading: { agent: false, settings: false } },
  files: {
    attachments: [],
    status: {},
    uploading: false,
    errorMessage: '',
    addFiles: async () => { },
    remove: () => { },
    clear: () => { },
    clearError: () => { },
    removeByIds: () => { },
  },
  chat: {
    isChatCreating: false,
    messages: [],
    isStreaming: false,
    sendMessage: async () => { },
    retryMessage: async () => { },
    stopStreaming: () => { },
    resetSession: async () => { },
  },
  scroll: {
    showScrollButton: false,
    handleScroll: () => { },
    scrollToBottom: () => { },
    smartScrollToBottom: () => { },
    hideScrollButton: () => { },
  },
  modelOverride: null,
  setModelOverride: () => { },
  auth: {
    isRequired: false,
    onAuthSuccess: async () => { },
    redirectInternalEndpoint: '',
    domain: '',
  },
  pageState: 'loading',
});
