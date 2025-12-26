/* eslint-disable no-unused-vars */
import { IFileUpload, IMessage } from '@react/features/ai-chat/types/chat';
import { ChatInputRef } from '@react/features/ai-chat/types/chat.types';
import { AgentDetails, AgentSettings } from '@react/shared/types/agent-data.types';
import { createContext, Dispatch, MutableRefObject, SetStateAction } from 'react';

export interface IChatContext {
  ref: { input?: MutableRefObject<ChatInputRef>; container?: MutableRefObject<HTMLDivElement> };
  agent: {
    data?: AgentDetails;
    settings?: AgentSettings;
    isLoading: { agent: boolean; settings: boolean };
  };
  /** File upload management using V2 hook */
  files: IFileUpload;
  chat: {
    // State
    isChatCreating: boolean;
    messages: IMessage[];
    isStreaming: boolean;

    // Actions
    createSession: () => Promise<void>;
    sendMessage: (message: string) => Promise<void>;
    retryMessage: () => void;
    stopStreaming: () => void;
    clearMessages: () => void;
    resetSession: () => Promise<void>;
  };
  scroll: {
    showScrollButton: boolean;
    shouldAutoScroll: boolean;
    handleScroll: () => void;
    scrollToBottom: (smooth?: boolean) => void;
    smartScrollToBottom: (smooth?: boolean) => void;
    setShowScrollButton: Dispatch<SetStateAction<boolean>>;
    setShouldAutoScroll: Dispatch<SetStateAction<boolean>>;
  };
  // Model override (temporary, not saved to agent config)
  modelOverride: string | null;
  setModelOverride: (model: string | null) => void;
}

export const ChatContext = createContext<IChatContext>({
  ref: { input: undefined, container: undefined },
  agent: { data: undefined, settings: undefined, isLoading: { agent: false, settings: false } },
  files: {
    attachments: [],
    status: {},
    uploading: false,
    toast: '',
    showToast: false,
    errorMessage: '',
    inputRef: { current: null },
    onSelect: async () => {},
    process: async () => {},
    remove: () => {},
    clear: () => {},
    cleanup: () => {},
    setShowToast: () => {},
    setToast: () => {},
    setErrorMessage: () => {},
  },
  chat: {
    isChatCreating: false,
    messages: [],
    isStreaming: false,
    createSession: async () => {},
    sendMessage: async () => {},
    retryMessage: async () => {},
    stopStreaming: () => {},
    clearMessages: () => {},
    resetSession: async () => {},
  },
  scroll: {
    showScrollButton: false,
    shouldAutoScroll: true,
    handleScroll: () => {},
    scrollToBottom: () => {},
    smartScrollToBottom: () => {},
    setShowScrollButton: () => {},
    setShouldAutoScroll: () => {},
  },
  modelOverride: null,
  setModelOverride: () => {},
});
